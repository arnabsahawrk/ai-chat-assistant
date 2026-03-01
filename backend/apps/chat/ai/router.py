from typing import Generator, cast
from datetime import date
from django.conf import settings
from apps.chat.models import AIProviderUsage
from .providers import ChatMessage


PROVIDERS = [
    {
        "name": "groq",
        "model": "llama-3.3-70b-versatile",
        "daily_limit": settings.AI_DAILY_LIMIT_GROQ,
    },
    {
        "name": "gemini",
        "model": "gemini-2.0-flash",
        "daily_limit": settings.AI_DAILY_LIMIT_GEMINI,
    },
    {
        "name": "mistral",
        "model": "mistral-small-latest",
        "daily_limit": settings.AI_DAILY_LIMIT_MISTRAL,
    },
]


def get_usage_today(provider_name: str) -> int:
    usage = AIProviderUsage.objects.filter(
        provider=provider_name,
        date=date.today(),
    ).first()
    return usage.request_count if usage else 0


def increment_usage(provider_name: str) -> None:
    usage, _ = AIProviderUsage.objects.get_or_create(
        provider=provider_name,
        date=date.today(),
    )
    usage.request_count += 1
    usage.save()


def pick_provider() -> dict | None:
    """Pick the first provider that hasn't exceeded its daily limit."""
    for provider in PROVIDERS:
        usage = get_usage_today(provider["name"])
        if usage < provider["daily_limit"]:
            return provider
    return None  # all providers exhausted


def stream_ai_response(
    messages: list[ChatMessage],
) -> tuple[Generator[str, None, None], str, str]:
    """
    Returns (stream_generator, provider_name, model_name).
    Raises RuntimeError if all providers are exhausted.
    """
    from .providers import stream_groq, stream_gemini, stream_mistral

    provider = pick_provider()
    if not provider:
        raise RuntimeError("All AI providers have reached their daily limit.")

    increment_usage(provider["name"])

    stream_fn = {
        "groq": stream_groq,
        "gemini": stream_gemini,
        "mistral": stream_mistral,
    }[provider["name"]]

    return stream_fn(messages), provider["name"], provider["model"]


def build_messages(session, current_content: str) -> list[ChatMessage]:
    """
    Build the message list to send to the AI:
    system prompt + last N messages + current user message.
    """
    system_prompt: ChatMessage = {
        "role": "system",
        "content": (
            "You are a helpful, concise AI assistant. "
            "Format code with proper markdown code blocks. "
            "Be direct and accurate."
        ),
    }

    # Fetch last N messages for context window (excluding current)
    context_limit = getattr(settings, "AI_CONTEXT_WINDOW", 10)
    recent_messages = session.messages.order_by("-created_at")[:context_limit]
    history: list[ChatMessage] = [
        cast(ChatMessage, {"role": msg.role, "content": msg.content})
        for msg in reversed(recent_messages)
    ]

    current_message: ChatMessage = {"role": "user", "content": current_content}
    return [system_prompt] + history + [current_message]


def generate_title(user_message: str) -> str:
    prompt = (
        "Generate a short, descriptive title (4-6 words max) for a chat that starts with this message. "
        "Return ONLY the title, no quotes, no punctuation at the end.\n\n"
        f"Message: {user_message}"
    )

    provider = pick_provider()
    if provider is None:
        return "New Chat"

    try:
        if provider == "groq":
            from groq import Groq

            client = Groq(api_key=settings.GROQ_API_KEY)
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=20,
                temperature=0.5,
            )
            content = response.choices[0].message.content
            return content.strip() if content else "New Chat"

        elif provider == "gemini":
            from google.genai import Client

            client = Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            return response.text.strip() if response.text else "New Chat"

        elif provider == "mistral":
            from mistralai import Mistral

            client = Mistral(api_key=settings.MISTRAL_API_KEY)
            response = client.chat.complete(
                model="mistral-small-latest",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=20,
                temperature=0.5,
            )
            content = response.choices[0].message.content if response.choices else None
            return content.strip() if isinstance(content, str) else "New Chat"

    except Exception:
        pass

    return "New Chat"
