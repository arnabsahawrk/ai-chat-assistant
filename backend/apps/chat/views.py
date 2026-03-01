from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import ChatSession, Message
from .serializers import (
    ChatSessionSerializer,
    ChatSessionDetailSerializer,
    MessageSerializer,
)


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

        # Touch session updated_at
        session.save()

        # AI response will be wired in Phase 2
        # For now return the saved user message + placeholder
        return Response(
            {
                "user_message": MessageSerializer(user_message).data,
                "assistant_message": None,  # Phase 2
            },
            status=status.HTTP_201_CREATED,
        )
