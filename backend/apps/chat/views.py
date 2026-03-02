import json
from collections.abc import Generator
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from django_ratelimit.decorators import ratelimit
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatSession, Message, AIProviderUsage
from .serializers import (
    ChatSessionSerializer,
    ChatSessionDetailSerializer,
    MessageSerializer,
)
from .ai.router import stream_ai_response, build_messages, generate_title
from django.conf import settings


class ChatSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ChatSessionDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = ChatSessionDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user)


class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        session = get_object_or_404(
            ChatSession,
            id=self.kwargs["session_id"],
            user=self.request.user,
        )
        return session.messages.all()


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        # Rate limit — per authenticated user
        limit = f"{getattr(settings, 'RATE_LIMIT_PER_HOUR', 30)}/h"
        decorator = ratelimit(key="user", rate=limit, method="POST", block=False)
        decorator(lambda r: getattr(r, "limited", False))(request)
        if getattr(request, "limited", False):
            return Response(
                {
                    "error": f"Rate limit exceeded. You can send {getattr(settings, 'RATE_LIMIT_PER_HOUR', 30)} messages per hour."
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        session = get_object_or_404(
            ChatSession,
            id=session_id,
            user=request.user,
        )

        content = request.data.get("content", "").strip()
        if not content:
            return Response(
                {"error": "Message content is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_message = Message.objects.create(
            session=session,
            role=Message.Role.USER,
            content=content,
        )
        session.save()

        messages = build_messages(session, content)

        def event_stream() -> Generator[bytes, None, None]:
            full_response = []

            yield (
                f"data: {json.dumps({'type': 'user_message', 'data': MessageSerializer(user_message).data})}\n\n".encode(
                    "utf-8"
                )
            )

            try:
                user_message_count = Message.objects.filter(
                    session=session, role=Message.Role.USER
                ).count()
                if user_message_count == 1 and session.title == "New Chat":
                    title = generate_title(content)
                    session.title = title
                    session.save(update_fields=["title"])
                    yield (
                        f"data: {json.dumps({'type': 'title', 'title': title, 'session_id': str(session.pk)})}\n\n".encode(
                            "utf-8"
                        )
                    )
            except Exception:
                pass

            try:
                stream, provider_name, model_name = stream_ai_response(messages)

                for chunk in stream:
                    full_response.append(chunk)
                    yield (
                        f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n".encode(
                            "utf-8"
                        )
                    )

                assistant_content = "".join(full_response)
                assistant_message = Message.objects.create(
                    session=session,
                    role=Message.Role.ASSISTANT,
                    content=assistant_content,
                    provider=provider_name,
                    model_used=model_name,
                )
                session.save()

                yield (
                    f"data: {json.dumps({'type': 'done', 'data': MessageSerializer(assistant_message).data})}\n\n".encode(
                        "utf-8"
                    )
                )

            except RuntimeError as e:
                yield (
                    f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n".encode(
                        "utf-8"
                    )
                )
            except Exception:
                yield (
                    f"data: {json.dumps({'type': 'error', 'message': 'An unexpected error occurred.'})}\n\n".encode(
                        "utf-8"
                    )
                )

        response = StreamingHttpResponse(
            event_stream(), content_type="text/event-stream"
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


class RegenerateMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        # Rate limit — same pool as SendMessageView
        limit = f"{getattr(settings, 'RATE_LIMIT_PER_HOUR', 30)}/h"
        decorator = ratelimit(key="user", rate=limit, method="POST", block=False)
        decorator(lambda r: None)(request)
        if getattr(request, "limited", False):
            return Response(
                {
                    "error": f"Rate limit exceeded. You can send {getattr(settings, 'RATE_LIMIT_PER_HOUR', 30)} messages per hour."
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        session = get_object_or_404(ChatSession, id=session_id, user=request.user)

        last_assistant = session.messages.filter(role=Message.Role.ASSISTANT).last()
        if last_assistant:
            last_assistant.delete()

        last_user = session.messages.filter(role=Message.Role.USER).last()
        if not last_user:
            return Response(
                {"error": "No user message to regenerate from."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content = last_user.content
        messages = build_messages(session, content)

        def event_stream() -> Generator[bytes, None, None]:
            full_response = []

            try:
                stream, provider_name, model_name = stream_ai_response(messages)

                for chunk in stream:
                    full_response.append(chunk)
                    yield (
                        f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n".encode(
                            "utf-8"
                        )
                    )

                assistant_content = "".join(full_response)
                assistant_message = Message.objects.create(
                    session=session,
                    role=Message.Role.ASSISTANT,
                    content=assistant_content,
                    provider=provider_name,
                    model_used=model_name,
                )
                session.save()

                yield (
                    f"data: {json.dumps({'type': 'done', 'data': MessageSerializer(assistant_message).data})}\n\n".encode(
                        "utf-8"
                    )
                )

            except RuntimeError as e:
                yield (
                    f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n".encode(
                        "utf-8"
                    )
                )
            except Exception:
                yield (
                    f"data: {json.dumps({'type': 'error', 'message': 'An unexpected error occurred.'})}\n\n".encode(
                        "utf-8"
                    )
                )

        response = StreamingHttpResponse(
            event_stream(), content_type="text/event-stream"
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        User = get_user_model()
        today = timezone.now().date()
        last_7_days = [today - timedelta(days=i) for i in range(6, -1, -1)]

        total_messages = Message.objects.count()
        total_sessions = ChatSession.objects.count()
        total_users = User.objects.count()

        provider_counts = (
            Message.objects.filter(role=Message.Role.ASSISTANT)
            .exclude(provider="")
            .values("provider")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        total_ai_messages = sum(p["count"] for p in provider_counts)
        provider_breakdown = [
            {
                "provider": p["provider"],
                "count": p["count"],
                "percentage": (
                    round(p["count"] / total_ai_messages * 100, 1)
                    if total_ai_messages > 0
                    else 0
                ),
            }
            for p in provider_counts
        ]

        daily_counts = {
            entry["day"].strftime("%Y-%m-%d"): entry["count"]
            for entry in Message.objects.annotate(day=TruncDate("created_at"))
            .filter(day__in=last_7_days)
            .values("day")
            .annotate(count=Count("id"))
        }
        messages_per_day = [
            {
                "date": d.strftime("%Y-%m-%d"),
                "count": daily_counts.get(d.strftime("%Y-%m-%d"), 0),
            }
            for d in last_7_days
        ]

        limits = {
            "groq": settings.AI_DAILY_LIMIT_GROQ,
            "gemini": settings.AI_DAILY_LIMIT_GEMINI,
            "mistral": settings.AI_DAILY_LIMIT_MISTRAL,
        }
        today_usage = []
        for provider_name, limit in limits.items():
            usage = AIProviderUsage.objects.filter(
                provider=provider_name, date=today
            ).first()
            today_usage.append(
                {
                    "provider": provider_name,
                    "used": usage.request_count if usage else 0,
                    "limit": limit,
                }
            )

        return Response(
            {
                "total_messages": total_messages,
                "total_sessions": total_sessions,
                "total_users": total_users,
                "provider_breakdown": provider_breakdown,
                "messages_per_day": messages_per_day,
                "today_usage": today_usage,
            }
        )
