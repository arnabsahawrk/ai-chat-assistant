from drf_spectacular.utils import OpenApiExample, OpenApiParameter, OpenApiResponse
from drf_spectacular.types import OpenApiTypes

# ---------------------------------------------------------------------------
# Reusable response definitions
# ---------------------------------------------------------------------------

RESPONSE_401 = OpenApiResponse(
    description="Authentication credentials were not provided or are invalid.",
)

RESPONSE_403 = OpenApiResponse(
    description="You do not have permission to perform this action.",
)

RESPONSE_404 = OpenApiResponse(
    description="The requested resource was not found.",
)

RESPONSE_429 = OpenApiResponse(
    description="Rate limit exceeded. You can send 30 messages per hour.",
)

RESPONSE_400 = OpenApiResponse(
    description="Bad request. The submitted data was invalid.",
)

# ---------------------------------------------------------------------------
# Reusable parameter definitions
# ---------------------------------------------------------------------------

SESSION_ID_PATH = OpenApiParameter(
    name="session_id",
    type=OpenApiTypes.INT,
    location=OpenApiParameter.PATH,
    description="The ID of the chat session.",
)

PK_PATH = OpenApiParameter(
    name="pk",
    type=OpenApiTypes.INT,
    location=OpenApiParameter.PATH,
    description="The ID of the chat session.",
)

# ---------------------------------------------------------------------------
# Reusable examples
# ---------------------------------------------------------------------------

EXAMPLE_USER_MESSAGE = OpenApiExample(
    name="User message",
    value={"content": "What are React hooks?"},
    request_only=True,
)

EXAMPLE_JWT_RESPONSE = OpenApiExample(
    name="Successful login",
    value={
        "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "user": {
            "pk": 1,
            "username": "john",
            "email": "john@gmail.com",
            "first_name": "John",
            "last_name": "Doe",
            "full_name": "John Doe",
            "profile_picture": "https://lh3.googleusercontent.com/...",
        },
    },
    response_only=True,
)

EXAMPLE_SESSION = OpenApiExample(
    name="Chat session",
    value={
        "id": 1,
        "title": "React hooks explained",
        "last_message": "A hook is a function that lets you use state...",
        "message_count": 6,
        "created_at": "2026-03-01T10:00:00Z",
        "updated_at": "2026-03-01T10:05:00Z",
    },
    response_only=True,
)

EXAMPLE_MESSAGE = OpenApiExample(
    name="Assistant message",
    value={
        "id": 2,
        "role": "assistant",
        "content": "Hooks are functions that let you use state and other React features...",
        "provider": "groq",
        "model_used": "llama-3.3-70b-versatile",
        "created_at": "2026-03-01T10:00:05Z",
    },
    response_only=True,
)

EXAMPLE_SSE_STREAM = OpenApiExample(
    name="SSE stream events",
    value=(
        'data: {"type": "user_message", "data": {"id": 1, "role": "user", "content": "What are React hooks?", "provider": "", "model_used": "", "created_at": "2026-03-01T10:00:00Z"}}\n\n'
        'data: {"type": "title", "title": "React Hooks Explained", "session_id": "1"}\n\n'
        'data: {"type": "chunk", "content": "Hooks are"}\n\n'
        'data: {"type": "chunk", "content": " functions"}\n\n'
        'data: {"type": "done", "data": {"id": 2, "role": "assistant", '
        '"content": "Hooks are functions...", "provider": "groq", '
        '"model_used": "llama-3.3-70b-versatile", "created_at": "2026-03-01T10:00:05Z"}}\n\n'
    ),
    response_only=True,
    media_type="text/event-stream",
)
