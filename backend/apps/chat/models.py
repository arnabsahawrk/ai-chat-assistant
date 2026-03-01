from django.db import models
from django.contrib.auth import get_user_model
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.db.models.manager import RelatedManager

User = get_user_model()


class ChatSession(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="chat_sessions"
    )
    title = models.CharField(max_length=255, default="New Chat")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    if TYPE_CHECKING:
        messages: "RelatedManager[Message]"

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user.username} — {self.title}"


class Message(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    session = models.ForeignKey(
        ChatSession, on_delete=models.CASCADE, related_name="messages"
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    provider = models.CharField(max_length=50, blank=True)  # groq, gemini, mistral
    model_used = models.CharField(max_length=100, blank=True)  # llama-3.3-70b, etc.
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.role}] {self.content[:60]}"


class AIProviderUsage(models.Model):
    provider = models.CharField(max_length=50)  # groq, gemini, mistral
    date = models.DateField(auto_now_add=True)
    request_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("provider", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.provider} — {self.date} — {self.request_count} requests"
