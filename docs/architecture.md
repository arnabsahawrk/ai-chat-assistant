# Architecture

## Overview

The application is split into a Django REST API backend and a React frontend, deployed independently. They communicate over HTTP — REST for standard CRUD operations and Server-Sent Events for streaming AI responses. The frontend is also a Progressive Web App (PWA), meaning it can be installed on any device and continues to serve cached content when offline.

---

## System Diagram

```
Browser / Installed PWA
  │
  ├── REST (Axios + JWT)  ──────────────────────► Django API (Render)
  │                                                    │
  └── SSE (fetch + ReadableStream) ──────────────────► │
                                                        ├── PostgreSQL (Neon)
                                                        │
                                                        ├── Groq API
                                                        ├── Google Gemini API
                                                        └── Mistral API

Service Worker (Workbox)
  ├── Pre-cache: JS / CSS / HTML (app shell)
  ├── Cache-first: images, fonts (30 days)
  ├── Network-first: /api/* (10 s timeout, 5 min stale)
  └── Network-only: accounts.google.com
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
├── api/              — Axios client, auth.ts, chat.ts, dashboard.ts
├── components/
│   ├── pwa/          — PWAInstallBanner, PWAUpdatePrompt, OfflineBanner
│   └── ...           — MarkdownRenderer, ErrorBoundary, Skeleton
├── context/          — AuthContext
├── hooks/            — useChat, usePWAInstall, usePWAUpdate, useNetworkStatus
├── pages/
│   ├── auth/         — LoginPage
│   ├── chat/         — ChatPage, Sidebar, ChatWindow, MessageBubble
│   └── dashboard/    — DashboardPage
├── providers/        — AuthProvider
├── styles/           — theme.ts (JS mirror of CSS tokens)
└── types/            — index.ts (all TypeScript interfaces)
```

**Key decisions:**

- All design tokens are defined in `src/index.css` via Tailwind v4's `@theme` directive. No `tailwind.config.js` is used. Token classes like `bg-surface-base` and `text-ink-primary` are used throughout — no hardcoded hex values in components.
- SSE streaming uses the native `fetch` API with `ReadableStream`, not `EventSource`. This is necessary because `EventSource` does not support `POST` requests or `Authorization` headers.
- Optimistic UI: the user's message is added to the UI immediately before the server confirms it. The optimistic message is replaced by the real server message when the `user_message` SSE event arrives.
- `useChat` is a single hook that owns all chat state — sessions, messages, streaming content, errors, and both `sendMessage` and `regenerateMessage` logic.
- `AbortController` is used to stop generation mid-stream. When stopped, the partial response is saved as an assistant message in local state (but not persisted to the database).

---

## Progressive Web App

**Plugin:** `vite-plugin-pwa` with Workbox `generateSW` strategy.

**Structure:**

```
frontend/
├── index.html                      — Full PWA meta (theme-color, apple-mobile-web-app, OG)
├── public/
│   ├── manifest.webmanifest        — W3C Web App Manifest
│   ├── icons/                      — 14 PNG icons (72–512 px, any + maskable)
│   └── screenshots/                — Desktop + mobile for install sheet
├── vite.config.ts                  — VitePWA plugin + Workbox config
└── src/
    ├── vite-env.d.ts               — virtual:pwa-register types
    ├── hooks/
    │   ├── usePWAInstall.ts        — Install prompt capture + iOS detection
    │   ├── usePWAUpdate.ts         — SW update detection, one-click apply
    │   └── useNetworkStatus.ts     — online/offline event tracking
    └── components/pwa/
        ├── PWAInstallBanner.tsx    — Slide-up install bar
        ├── PWAUpdatePrompt.tsx     — Update toast + offline-ready notice
        └── OfflineBanner.tsx       — Connectivity status banner
```

**Service worker registration:**
The SW is registered with `registerType: "prompt"`, meaning it never activates silently. The `usePWAUpdate` hook calls `registerSW` from `virtual:pwa-register` and exposes `needsUpdate` / `applyUpdate` to the `PWAUpdatePrompt` component. The SW polls for updates every 60 minutes via `registration.update()`.

**Caching:**

| Asset                  | Handler                     | Max age              |
| ---------------------- | --------------------------- | -------------------- |
| App shell (pre-cached) | Cache-first                 | Build hash versioned |
| Images / fonts         | Cache-first                 | 30 days              |
| `/api/*`               | Network-first, 10 s timeout | 5 min stale          |
| `accounts.google.com`  | Network-only                | —                    |

**Install UX:**
`usePWAInstall` captures `beforeinstallprompt` in a ref (not state) to avoid triggering unnecessary re-renders. The deferred prompt is fired when the user clicks "Install" in `PWAInstallBanner`. On iOS, where `beforeinstallprompt` is not supported, the banner instead opens a modal guide for the share-sheet flow.

**Key decisions:**

- `devOptions.enabled: false` — the service worker is disabled during `vite dev` to prevent stale caches from masking code changes. Use `yarn build && yarn preview` to test the full PWA stack locally.
- All `setState` calls in PWA hooks are placed inside event or timer callbacks, never synchronously in `useEffect` bodies, to comply with React's rules around cascading renders.
- `sessionStorage` is used (not `localStorage`) for install-dismissed and iOS-hint-shown flags so they reset on every new browser session without permanently suppressing the banner.

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

|               | Backend             | Frontend                             |
| ------------- | ------------------- | ------------------------------------ |
| Platform      | Render (free tier)  | Vercel (free tier)                   |
| Runtime       | Python / gunicorn   | Static (Vite build)                  |
| Database      | PostgreSQL via Neon | —                                    |
| Static files  | WhiteNoise          | Vercel CDN                           |
| Build command | `build.sh`          | `vite build`                         |
| PWA           | —                   | SW + manifest served as static files |

The Vite build outputs the service worker (`sw.js`) and Workbox runtime into `dist/`. Vercel serves these as static files at the origin, which satisfies the same-origin requirement for service worker registration.

**`vercel.json`** must preserve the existing SPA rewrite while allowing the service worker to be served without redirect:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

The rewrite applies to navigation requests only — Vercel serves `/sw.js`, `/manifest.webmanifest`, and `/icons/*` as static files before the rewrite rule runs.

---

## Environment Variables

**Backend**

| Variable               | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `SECRET_KEY`           | Django secret key                                      |
| `DEBUG`                | `True` locally, `False` in production                  |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                                 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                             |
| `DATABASE_URL`         | PostgreSQL connection string (auto-injected by Render) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins       |
| `FRONTEND_URL`         | Used as OAuth callback base URL                        |
| `GROQ_API_KEY`         | Groq API key                                           |
| `GEMINI_API_KEY`       | Google Gemini API key                                  |
| `MISTRAL_API_KEY`      | Mistral API key                                        |
| `RATE_LIMIT_PER_HOUR`  | Max messages per user per hour (default 30)            |

**Frontend**

| Variable                | Description            |
| ----------------------- | ---------------------- |
| `VITE_API_BASE_URL`     | Backend API base URL   |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
