# AI Chat Assistant

AI Chat Assistant is a production-deployed chat application that routes requests across multiple AI providers (Groq, Google Gemini, Mistral) with automatic failover when a provider's quota is exhausted. Responses are streamed in real time via Server-Sent Events. The application supports persistent chat history, per-session context windows, and auto-generated session titles.

**Live**: [arnabsahawrk-ai-chat-assistant.vercel.app](https://arnabsahawrk-ai-chat-assistant.vercel.app)  
**API**: [ai-chat-assistant-4agm.onrender.com](https://ai-chat-assistant-4agm.onrender.com)

---

## Tech Stack

**Backend**  
Django 6, Django REST Framework, dj-rest-auth, django-allauth, SimpleJWT, PostgreSQL, SQLite (local)

**Frontend**  
React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, React Router v7

**AI Providers**  
Groq (Llama 3.3 70B) as primary, Google Gemini 2.0 Flash as fallback, Mistral Small as last resort

**Auth**  
Google OAuth 2.0 implicit flow — frontend obtains the Google token, Django validates and returns a JWT (access + refresh)

**Deployment**  
Backend on Render (free tier), Frontend on Vercel (free tier), Database on Neon (free tier)

---

## Features

- **Multi-provider AI routing** — Groq, Gemini, and Mistral with zero-user-awareness automatic failover; provider usage tracked daily in the database
- **Real-time streaming** — responses streamed via SSE with stop/abort support
- **Context window** — last N messages sent as conversation history on every request
- **Persistent chat history** — sessions and messages stored in PostgreSQL; model and provider recorded per message
- **Auto-generated session titles** — AI generates a title after the first message in a session
- **Markdown and code rendering** — syntax-highlighted code blocks with a copy button
- **Regenerate response** — re-run the last prompt with full context
- **Google OAuth** — profile picture and full name from Google, JWT issued by Django
- **Responsive UI** — mobile-first design with a dark theme and design token system

---

## Project Structure

```
ai-chat-assistant/
├── backend/
│   ├── apps/
│   │   ├── accounts/   # Google OAuth, JWT, custom user serializer
│   │   ├── chat/       # ChatSession, Message models, AI routing, SSE
│   │   └── core/       # Shared utilities
│   └── config/         # Settings, URLs, WSGI
└── frontend/
    └── src/
        ├── api/         # Axios client, auth and chat API calls
        ├── components/
        ├── context/     # AuthContext
        ├── hooks/
        ├── pages/
        │   ├── auth/    # LoginPage
        │   └── chat/    # ChatPage, Sidebar, ChatWindow
        ├── providers/   # AuthProvider, GoogleOAuthProvider
        ├── styles/      # theme.ts (design token reference)
        └── types/       # TypeScript interfaces
```

---

## Key Implementation Notes

- SQLite locally, PostgreSQL on Render via `DATABASE_URL` — zero config change needed
- CORS, `ALLOWED_HOSTS`, and `CORS_ALLOWED_ORIGINS` driven by environment variables
- All API base URLs centralized in `src/config/index.ts`; no hardcoded URLs in components
- Provider quota state persisted in DB — failover survives server restarts
- JWT refresh handled transparently by the Axios client

---

## Local Development

**Backend**

```bash
cd backend
python -m venv .venv && (source .venv/bin/activate || .venv\Scripts\Activate.ps1)
pip install -r requirements.txt
cp .env.example .env   # fill in GOOGLE_CLIENT_ID, GROQ_API_KEY, etc.
python manage.py migrate
python manage.py runserver
```

**Frontend**

```bash
cd frontend
yarn install
cp .env.example .env   # set VITE_API_BASE_URL and VITE_GOOGLE_CLIENT_ID
yarn dev
```