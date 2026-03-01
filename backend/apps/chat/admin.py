from django.contrib import admin
from .models import ChatSession, Message, AIProviderUsage


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "title", "message_count", "updated_at"]
    list_filter = ["user"]
    search_fields = ["title", "user__username"]

    def message_count(self, obj):
        return obj.messages.count()


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["id", "session", "role", "provider", "model_used", "created_at"]
    list_filter = ["role", "provider"]
    search_fields = ["content"]


@admin.register(AIProviderUsage)
class AIProviderUsageAdmin(admin.ModelAdmin):
    list_display = ["provider", "date", "request_count"]
    list_filter = ["provider"]
