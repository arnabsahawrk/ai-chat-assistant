import json
from collections.abc import Generator
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.http import StreamingHttpResponse

from .models import ChatSession, Message
from .serializers import (
    ChatSessionSerializer,
    ChatSessionDetailSerializer,
    MessageSerializer,
)
from .ai.router import stream_ai_response, build_messages, generate_title


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

        # Save user message
        user_message = Message.objects.create(
            session=session,
            role=Message.Role.USER,
            content=content,
        )
        session.save()  # touch updated_at

        # Build context window
        messages = build_messages(session, content)

        # SSE streaming response
        def event_stream() -> Generator[bytes, None, None]:
            full_response = []

            # Send user message metadata first
            yield (
                f"data: {json.dumps({'type': 'user_message', 'data': MessageSerializer(user_message).data})}\n\n".encode(
                    "utf-8"
                )
            )

            # Auto-title on first user message
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

            try:
                stream, provider_name, model_name = stream_ai_response(messages)

                for chunk in stream:
                    full_response.append(chunk)
                    yield (
                        f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n".encode(
                            "utf-8"
                        )
                    )

                # Save complete assistant message to DB
                assistant_content = "".join(full_response)
                assistant_message = Message.objects.create(
                    session=session,
                    role=Message.Role.ASSISTANT,
                    content=assistant_content,
                    provider=provider_name,
                    model_used=model_name,
                )
                session.save()

                # Send done event with full assistant message
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
            event_stream(),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"  # important for Nginx/Render
        return response
