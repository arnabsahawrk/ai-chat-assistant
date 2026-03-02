# Database Design

## Overview

The database has three application tables. User accounts are managed by Django's built-in `auth_user` table, extended via `django-allauth` for Google OAuth support.

Local development uses SQLite. Production uses PostgreSQL on Neon (free tier), connected via the `DATABASE_URL` environment variable.

---

## Tables

### auth_user (Django built-in)

Managed by Django and `django-allauth`. No custom fields are added to this table directly — the Google profile picture and full name are read from the `socialaccount_socialaccount` table at login time and returned in the JWT response.

Relevant fields used by the application:

| Column | Type | Notes |
|--------|------|-------|
| id | integer | Primary key |
| username | varchar | Auto-generated from email |
| email | varchar | Unique, from Google |
| first_name | varchar | From Google profile |
| last_name | varchar | From Google profile |
| is_staff | boolean | Used for Django admin access |

---

### chat_chatsession

One session per conversation. Belongs to one user.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint | Primary key |
| user_id | integer | FK to auth_user, CASCADE delete |
| title | varchar(255) | Default "New Chat", updated after first message |
| created_at | datetime | Auto-set on creation |
| updated_at | datetime | Auto-updated on save |

**Indexes:** `user_id`, `updated_at` (ordering)

---

### chat_message

One row per message in a session. Stores both user and assistant messages.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint | Primary key |
| session_id | bigint | FK to chat_chatsession, CASCADE delete |
| role | varchar(10) | `user` or `assistant` |
| content | text | Full message content |
| provider | varchar(50) | `groq`, `gemini`, or `mistral`. Empty for user messages |
| model_used | varchar(100) | e.g. `llama-3.3-70b-versatile`. Empty for user messages |
| created_at | datetime | Auto-set on creation |

**Indexes:** `session_id`, `created_at` (ordering)

---

### chat_aiproviderusage

Tracks daily request counts per AI provider. Used by the routing logic to enforce daily limits and fall back to the next provider when one is exhausted.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint | Primary key |
| provider | varchar(50) | `groq`, `gemini`, or `mistral` |
| date | date | Auto-set on creation |
| request_count | integer | Incremented before each AI call |

**Unique constraint:** `(provider, date)` — one row per provider per day

---

## Relationships

```
auth_user
    └── chat_chatsession (one-to-many, user_id)
            └── chat_message (one-to-many, session_id)

chat_aiproviderusage (standalone — no FK relationships)
```

---

## Cascade Behaviour

- Deleting a user deletes all their sessions and messages.
- Deleting a session deletes all its messages.
- `AIProviderUsage` rows are never deleted — they serve as a permanent usage log.

---

## Notes

- `provider` and `model_used` on `Message` are blank for user messages. They are only populated on assistant messages by the AI router at response time.
- `updated_at` on `ChatSession` is touched on every message send to keep sessions ordered by activity in the sidebar.
- The `date` field on `AIProviderUsage` uses `auto_now_add`, so each row always represents exactly one calendar day. Counts reset automatically at midnight UTC because a new row is created for the new date.
