from rest_framework import serializers
from .models import ChatSession, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "role", "content", "provider", "model_used", "created_at"]
        read_only_fields = ["id", "role", "provider", "model_used", "created_at"]


class ChatSessionSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = [
            "id",
            "title",
            "last_message",
            "message_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "title", "created_at", "updated_at"]

    def get_last_message(self, obj):
        last = obj.messages.last()
        return last.content[:80] if last else None

    def get_message_count(self, obj):
        return obj.messages.count()


class ChatSessionDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatSession
        fields = ["id", "title", "messages", "created_at", "updated_at"]
        read_only_fields = ["id", "title", "created_at", "updated_at"]
