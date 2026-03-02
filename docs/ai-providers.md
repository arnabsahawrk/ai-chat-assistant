# AI Providers

## Overview

The application supports three AI providers with automatic failover. Requests are routed to the first available provider based on daily usage limits. This is entirely transparent to the user — they never see which provider is active unless they look at the metadata shown below each assistant message.

---

## Providers

| Provider | Model | Daily Limit |
|----------|-------|-------------|
| Groq | llama-3.3-70b-versatile | 14,000 requests |
| Google Gemini | gemini-2.0-flash | 1,400 requests |
| Mistral | mistral-small-latest | 500 requests |

Limits are configurable via `settings.py`:

```python
AI_DAILY_LIMIT_GROQ = 14000
AI_DAILY_LIMIT_GEMINI = 1400
AI_DAILY_LIMIT_MISTRAL = 500
```

---

## Routing Logic

On every request, `pick_provider()` in `router.py` iterates the provider list in order (Groq → Gemini → Mistral) and returns the first one whose daily request count is below its limit.

```
Request comes in
  → Check Groq usage today
      → Under limit? Use Groq
      → Over limit? Check Gemini
          → Under limit? Use Gemini
          → Over limit? Check Mistral
              → Under limit? Use Mistral
              → Over limit? Raise RuntimeError — all providers exhausted
```

`increment_usage()` is called before streaming begins, not after, to prevent concurrent requests from exceeding limits under load.

Daily counts are stored in `AIProviderUsage` keyed by `(provider, date)`. Counts reset automatically at midnight UTC because a new row is created for each calendar day.

---

## Streaming

All AI responses are streamed token-by-token via Server-Sent Events (SSE). The Django view uses `StreamingHttpResponse` with `content_type="text/event-stream"`. The frontend reads the stream with the Fetch API and `ReadableStream` rather than `EventSource`, because `EventSource` does not support `POST` requests or custom headers.

Each provider has a dedicated streaming function in `providers.py`:

- `stream_groq()` — uses the Groq Python SDK with `stream=True`
- `stream_gemini()` — uses `google-genai` with `generate_content_stream()`
- `stream_mistral()` — uses the Mistral Python SDK with `client.chat.stream()`

Each function yields plain strings (token chunks) and is consumed by the SSE generator in `views.py`.

The `X-Accel-Buffering: no` response header is set to prevent Nginx and Render's proxy layer from buffering the stream.

---

## Context Window

Every request includes the last 10 messages from the session as conversation history, so the AI can refer back to earlier parts of the conversation. The context is built by `build_messages()` in `router.py`:

```
[system prompt] + [last 10 messages] + [current user message]
```

The system prompt instructs the model to be concise, accurate, and to format code with markdown code blocks. The context window size is configurable:

```python
AI_CONTEXT_WINDOW = 10
```

---

## Auto-title Generation

After the first user message in a new session, a separate non-streaming AI call is made to generate a short title (4–6 words). This call uses whichever provider `pick_provider()` returns at that moment and is made inside the SSE generator, so it does not block the main streaming response.

If title generation fails for any reason, the session title stays as "New Chat" and the stream continues normally. The generated title is sent to the frontend as a `title` SSE event before the AI starts streaming its response.

---

## Provider Metadata

The `provider` name and `model_used` string are stored on every assistant `Message` row and displayed below each assistant bubble in the UI. This lets users see which model answered a given message.

---

## Error Handling

If a provider raises an exception mid-stream, the SSE generator catches it and emits an `error` event to the frontend. The frontend shows the error message in the UI and stops the stream. Partial responses are discarded — they are not saved to the database.

If all providers are exhausted, a `RuntimeError` is raised before streaming begins, and the endpoint returns a 500 error with a descriptive message.
