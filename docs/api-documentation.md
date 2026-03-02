# API Documentation

## Base URL

| Environment | URL |
|-------------|-----|
| Local | `http://127.0.0.1:8000/api` |
| Production | `https://ai-chat-assistant-4agm.onrender.com/api` |

## Authentication

All endpoints except `/auth/google/` and `/auth/token/refresh/` require a JWT access token.

Pass the token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Access tokens expire after 60 minutes. Refresh tokens expire after 7 days.

---

## Auth Endpoints

### POST /auth/google/

Exchange a Google OAuth access token for a JWT pair.

**Request**
```json
{
  "access_token": "google_oauth_access_token"
}
```

**Response `200`**
```json
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": {
    "pk": 1,
    "username": "john",
    "email": "john@gmail.com",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "profile_picture": "https://lh3.googleusercontent.com/..."
  }
}
```

---

### POST /auth/token/refresh/

Refresh an expired access token.

**Request**
```json
{
  "refresh": "jwt_refresh_token"
}
```

**Response `200`**
```json
{
  "access": "new_jwt_access_token"
}
```

---

## Chat Endpoints

### GET /chat/sessions/

List all chat sessions for the authenticated user, ordered by most recently updated.

**Response `200`**
```json
[
  {
    "id": 1,
    "title": "React hooks explained",
    "last_message": "A hook is a function that lets you use state and...",
    "message_count": 6,
    "created_at": "2026-03-01T10:00:00Z",
    "updated_at": "2026-03-01T10:05:00Z"
  }
]
```

---

### POST /chat/sessions/

Create a new chat session. The title defaults to "New Chat" and is updated automatically after the first message.

**Request** — empty body `{}`

**Response `201`**
```json
{
  "id": 2,
  "title": "New Chat",
  "last_message": null,
  "message_count": 0,
  "created_at": "2026-03-01T11:00:00Z",
  "updated_at": "2026-03-01T11:00:00Z"
}
```

---

### GET /chat/sessions/:id/

Retrieve a session with its full message history.

**Response `200`**
```json
{
  "id": 1,
  "title": "React hooks explained",
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "What are React hooks?",
      "provider": "",
      "model_used": "",
      "created_at": "2026-03-01T10:00:00Z"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "Hooks are functions that let you use state...",
      "provider": "groq",
      "model_used": "llama-3.3-70b-versatile",
      "created_at": "2026-03-01T10:00:05Z"
    }
  ],
  "created_at": "2026-03-01T10:00:00Z",
  "updated_at": "2026-03-01T10:00:05Z"
}
```

---

### DELETE /chat/sessions/:id/

Delete a session and all its messages.

**Response `204`** — no content

---

### GET /chat/sessions/:id/messages/

List all messages in a session.

**Response `200`**
```json
[
  {
    "id": 1,
    "role": "user",
    "content": "What are React hooks?",
    "provider": "",
    "model_used": "",
    "created_at": "2026-03-01T10:00:00Z"
  }
]
```

---

### POST /chat/sessions/:id/messages/send/

Send a message and stream the AI response via Server-Sent Events.

**Request**
```json
{
  "content": "What are React hooks?"
}
```

**Response** — `text/event-stream`

The response is a stream of SSE events. Each event is a JSON object on a `data:` line.

```
data: {"type": "user_message", "data": { ...message object }}

data: {"type": "title", "title": "React hooks explained", "session_id": "1"}

data: {"type": "chunk", "content": "Hooks are"}

data: {"type": "chunk", "content": " functions"}

data: {"type": "done", "data": { ...assistant message object }}
```

**Event types**

| Type | When | Payload |
|------|------|---------|
| `user_message` | Immediately on receipt | Full saved user `Message` object |
| `title` | After first message only | `title` string, `session_id` string |
| `chunk` | Per token streamed | `content` string |
| `done` | Stream complete | Full saved assistant `Message` object |
| `error` | On failure | `message` string |

**Error responses**
- `400` — content is empty
- `429` — rate limit exceeded (30 requests/hour per user by default)

---

### POST /chat/sessions/:id/messages/regenerate/

Delete the last assistant message and regenerate a new response from the last user message. Returns the same SSE stream format as `/send/`, without the `user_message` or `title` events.

**Request** — empty body

**Response** — `text/event-stream` with `chunk` and `done` events only

**Error responses**
- `400` — no user message found in session
- `429` — rate limit exceeded

---

## Dashboard Endpoint

### GET /chat/dashboard/

Returns platform-wide usage statistics. Accessible to all authenticated users.

**Response `200`**
```json
{
  "total_messages": 1420,
  "total_sessions": 310,
  "total_users": 42,
  "provider_breakdown": [
    { "provider": "groq", "count": 1100, "percentage": 77.5 },
    { "provider": "gemini", "count": 250, "percentage": 17.6 },
    { "provider": "mistral", "count": 70, "percentage": 4.9 }
  ],
  "messages_per_day": [
    { "date": "2026-02-24", "count": 180 },
    { "date": "2026-02-25", "count": 210 }
  ],
  "today_usage": [
    { "provider": "groq", "used": 340, "limit": 14000 },
    { "provider": "gemini", "used": 12, "limit": 1400 },
    { "provider": "mistral", "used": 0, "limit": 500 }
  ]
}
```

---

## Error Format

All non-SSE error responses follow this format:

```json
{
  "error": "Human-readable error message"
}
```

Standard HTTP status codes are used throughout: `400` for bad input, `401` for missing or invalid token, `403` for forbidden, `404` for not found, `429` for rate limited, `500` for server errors.
