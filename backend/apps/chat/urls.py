from django.urls import path
from .views import (
    ChatSessionListCreateView,
    ChatSessionDetailView,
    DashboardView,
    MessageListView,
    SendMessageView,
    RegenerateMessageView,
)

urlpatterns = [
    path("sessions/", ChatSessionListCreateView.as_view(), name="chat_sessions"),
    path(
        "sessions/<int:pk>/",
        ChatSessionDetailView.as_view(),
        name="chat_session_detail",
    ),
    path(
        "sessions/<int:session_id>/messages/",
        MessageListView.as_view(),
        name="chat_messages",
    ),
    path(
        "sessions/<int:session_id>/messages/send/",
        SendMessageView.as_view(),
        name="send_message",
    ),
    path(
        "sessions/<int:session_id>/messages/regenerate/",
        RegenerateMessageView.as_view(),
        name="regenerate_message",
    ),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
]
