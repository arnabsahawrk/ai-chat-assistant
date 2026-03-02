# Architecture

## Overview

The application is split into a Django REST API backend and a React frontend, deployed independently. They communicate over HTTP — REST for standard CRUD operations and Server-Sent Events for streaming AI responses.

---

## System Diagram

```
Browser
  │
  ├── REST (Axios + JWT)  ──────────────────────► Django API (Render)
  │                                                    │
  └── SSE (fetch + ReadableStream) ──────────────────► │
                                                        ├── PostgreSQL (Neon)
                                                        │
                                                        ├── Groq API
                                                        ├── Google Gemini API
                                                        └── Mistral API
```

---

## Backend

**Framework:** Django 6, Django REST Framework

**Structure:**

```
backend/
├── apps/
│   ├── accounts/     — Google OAuth, JWT, user serializer
│   ├── chat/         — Sessions, messages, AI routing, SSE views
│   │   └── ai/
│   │       ├── providers.py   — stream_groq, stream_gemini, stream_mistral
│   │       └── router.py      — pick_provider, build_messages, generate_title
│   └── core/         — Health check endpoint
└── config/           — settings.py, urls.py, wsgi.py
```

**Key decisions:**

- `dj-rest-auth` + `django-allauth` handle the Google OAuth implicit flow. The frontend obtains the Google access token directly and sends it to the backend for validation — there is no redirect-based OAuth callback.
- JWTs are stored in `localStorage` on the frontend. The Axios client attaches them automatically and refreshes them on 401.
- Streaming uses `StreamingHttpResponse` with a generator function. Django is synchronous — the generator blocks while iterating provider chunks, which is acceptable for a single-dyno free-tier deployment.
- Rate limiting uses `django-ratelimit` with `LocMemCache`. Limits apply per authenticated user (not per IP), at 30 requests per hour by default.
- `dj_database_url` reads `DATABASE_URL` from the environment automatically. No additional configuration is needed to switch between SQLite (local) and PostgreSQL (production).

---

## Frontend

**Framework:** React 19, TypeScript, Vite

**Structure:**

```
frontend/src/
├── api/          — Axios client, auth.ts, chat.ts, dashboard.ts
├── components/   — MarkdownRenderer, ErrorBoundary, Skeleton
├── context/      — AuthContext
├── hooks/        — useChat (all chat state and SSE logic)
├── pages/
│   ├── auth/     — LoginPage
│   ├── chat/     — ChatPage, Sidebar, ChatWindow, MessageBubble
│   └── dashboard/— DashboardPage
├── providers/    — AuthProvider
├── styles/       — theme.ts (JS mirror of CSS tokens)
└── types/        — index.ts (all TypeScript interfaces)
```

**Key decisions:**

- All design tokens are defined in `src/index.css` via Tailwind v4's `@theme` directive. No `tailwind.config.js` is used. Token classes like `bg-surface-base` and `text-ink-primary` are used throughout — no hardcoded hex values in components.
- SSE streaming uses the native `fetch` API with `ReadableStream`, not `EventSource`. This is necessary because `EventSource` does not support `POST` requests or `Authorization` headers.
- Optimistic UI: the user's message is added to the UI immediately before the server confirms it. The optimistic message is replaced by the real server message when the `user_message` SSE event arrives.
- `useChat` is a single hook that owns all chat state — sessions, messages, streaming content, errors, and both `sendMessage` and `regenerateMessage` logic.
- `AbortController` is used to stop generation mid-stream. When stopped, the partial response is saved as an assistant message in local state (but not persisted to the database).

---

## Authentication Flow

```
1. User clicks "Continue with Google"
2. Google OAuth popup returns an access_token to the frontend
3. Frontend POST /api/auth/google/ with the access_token
4. Backend validates token with Google, creates or finds the User + SocialAccount
5. Backend returns JWT access + refresh tokens and the user object
6. Frontend stores tokens in localStorage
7. Axios interceptor attaches Bearer token to every subsequent request
8. On 401, Axios automatically calls /api/auth/token/refresh/ and retries
9. On refresh failure, user is redirected to /login
```

---

## Deployment

| | Backend | Frontend |
|-|---------|----------|
| Platform | Render (free tier) | Vercel (free tier) |
| Runtime | Python / gunicorn | Static (Vite build) |
| Database | PostgreSQL via Neon | — |
| Static files | WhiteNoise | Vercel CDN |
| Build command | `build.sh` | `vite build` |

**Render `build.sh`:**
```bash
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
```

The backend is a single Render web service. There are no workers, queues, or background tasks. All AI calls are made synchronously within the request/response cycle inside the SSE generator.

---

## Environment Variables

**Backend**

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` locally, `False` in production |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `DATABASE_URL` | PostgreSQL connection string (auto-injected by Render) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins |
| `FRONTEND_URL` | Used as OAuth callback base URL |
| `GROQ_API_KEY` | Groq API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `MISTRAL_API_KEY` | Mistral API key |
| `RATE_LIMIT_PER_HOUR` | Max messages per user per hour (default 30) |

**Frontend**

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
