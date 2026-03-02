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
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiResponse,
    OpenApiExample,
)
from apps.core.swagger import (
    RESPONSE_401,
    RESPONSE_404,
    RESPONSE_429,
    RESPONSE_400,
    SESSION_ID_PATH,
    PK_PATH,
    EXAMPLE_USER_MESSAGE,
    EXAMPLE_SESSION,
    EXAMPLE_MESSAGE,
    EXAMPLE_SSE_STREAM,
)


@extend_schema_view(
    get=extend_schema(
        tags=["sessions"],
        summary="List chat sessions",
        description="Returns all chat sessions for the authenticated user, ordered by most recently updated.",
        responses={
            200: OpenApiResponse(
                description="List of sessions.",
                examples=[EXAMPLE_SESSION],
            ),
            401: RESPONSE_401,
        },
    ),
    post=extend_schema(
        tags=["sessions"],
        summary="Create chat session",
        description="Create a new chat session. The title defaults to 'New Chat' and is updated automatically after the first message.",
        request={"application/json": {"type": "object"}},
        responses={
            201: OpenApiResponse(
                description="Session created.",
                examples=[EXAMPLE_SESSION],
            ),
            401: RESPONSE_401,
        },
    ),
)
class ChatSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@extend_schema_view(
    get=extend_schema(
        tags=["sessions"],
        summary="Get chat session",
        description="Retrieve a session along with its full message history.",
        parameters=[PK_PATH],
        responses={
            200: OpenApiResponse(description="Session with messages."),
            401: RESPONSE_401,
            404: RESPONSE_404,
        },
    ),
    delete=extend_schema(
        tags=["sessions"],
        summary="Delete chat session",
        description="Permanently delete a session and all its messages.",
        parameters=[PK_PATH],
        responses={
            204: OpenApiResponse(description="Session deleted."),
            401: RESPONSE_401,
            404: RESPONSE_404,
        },
    ),
)
class ChatSessionDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = ChatSessionDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user)


@extend_schema_view(
    get=extend_schema(
        tags=["messages"],
        summary="List messages",
        description="Returns all messages in a session in chronological order.",
        parameters=[SESSION_ID_PATH],
        responses={
            200: OpenApiResponse(
                description="List of messages.",
                examples=[EXAMPLE_MESSAGE],
            ),
            401: RESPONSE_401,
            404: RESPONSE_404,
        },
    ),
)
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

    @extend_schema(
        tags=["messages"],
        summary="Send message (SSE stream)",
        description=(
            "Send a user message and receive the AI response as a Server-Sent Events stream. "
            "The response Content-Type is `text/event-stream`. Each event is a JSON object on a `data:` line.\n\n"
            "**Event types:**\n"
            "- `user_message` — fired immediately with the saved user message object\n"
            "- `title` — fired after the first message only, contains the AI-generated session title\n"
            "- `chunk` — one token of the AI response\n"
            "- `done` — fired when streaming completes, contains the full saved assistant message object\n"
            "- `error` — fired on failure, contains a `message` string\n\n"
            "Abort the request at any time to stop generation."
        ),
        parameters=[SESSION_ID_PATH],
        request={
            "application/json": {
                "type": "object",
                "properties": {"content": {"type": "string"}},
                "required": ["content"],
            }
        },
        responses={
            200: OpenApiResponse(
                description="SSE stream. Content-Type: text/event-stream.",
                examples=[EXAMPLE_SSE_STREAM],
            ),
            400: RESPONSE_400,
            401: RESPONSE_401,
            404: RESPONSE_404,
            429: RESPONSE_429,
        },
        examples=[EXAMPLE_USER_MESSAGE],
    )
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

    @extend_schema(
        tags=["messages"],
        summary="Regenerate last response (SSE stream)",
        description=(
            "Delete the last assistant message and regenerate a new response from the last user message. "
            "Returns the same SSE stream format as `/send/` but only emits `chunk`, `done`, and `error` events. "
            "Subject to the same rate limit as `/send/`."
        ),
        parameters=[SESSION_ID_PATH],
        request={"application/json": {"type": "object"}},
        responses={
            200: OpenApiResponse(
                description="SSE stream. Content-Type: text/event-stream.",
                examples=[EXAMPLE_SSE_STREAM],
            ),
            400: RESPONSE_400,
            401: RESPONSE_401,
            404: RESPONSE_404,
            429: RESPONSE_429,
        },
    )
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

    @extend_schema(
        tags=["dashboard"],
        summary="Usage dashboard",
        description=(
            "Returns platform-wide usage statistics including total messages, sessions, users, "
            "provider breakdown percentages, daily message counts for the last 7 days, "
            "and today's quota usage per AI provider."
        ),
        responses={
            200: OpenApiResponse(
                description="Dashboard statistics.",
                examples=[
                    OpenApiExample(
                        name="Dashboard stats",
                        value={
                            "total_messages": 1420,
                            "total_sessions": 310,
                            "total_users": 42,
                            "provider_breakdown": [
                                {"provider": "groq", "count": 1100, "percentage": 77.5},
                                {
                                    "provider": "gemini",
                                    "count": 250,
                                    "percentage": 17.6,
                                },
                                {"provider": "mistral", "count": 70, "percentage": 4.9},
                            ],
                            "messages_per_day": [
                                {"date": "2026-02-24", "count": 180},
                                {"date": "2026-02-25", "count": 210},
                            ],
                            "today_usage": [
                                {"provider": "groq", "used": 340, "limit": 14000},
                                {"provider": "gemini", "used": 12, "limit": 1400},
                                {"provider": "mistral", "used": 0, "limit": 500},
                            ],
                        },
                        response_only=True,
                    )
                ],
            ),
            401: RESPONSE_401,
        },
    )
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
