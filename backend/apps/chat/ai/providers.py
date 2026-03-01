from collections.abc import Generator
from typing import Any, Literal, TypedDict, cast
from django.conf import settings


class ChatMessage(TypedDict):
    role: Literal["system", "user", "assistant"]
    content: str


def stream_groq(messages: list[ChatMessage]) -> Generator[str, None, None]:
    from groq import Groq

    client = Groq(api_key=settings.GROQ_API_KEY)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=cast(Any, messages),
        stream=True,
        max_tokens=1024,
    )
    for chunk in response:
        delta = cast(Any, chunk.choices[0].delta.content)
        if isinstance(delta, str):
            yield delta
        elif isinstance(delta, list):
            for part in delta:
                text = getattr(part, "text", None)
                if isinstance(text, str) and text:
                    yield text


def stream_gemini(messages: list[ChatMessage]) -> Generator[str, None, None]:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    # Convert messages — separate system prompt and history
    system_instruction = None
    contents = []

    for msg in messages:
        if msg["role"] == "system":
            system_instruction = msg["content"]
        elif msg["role"] == "user":
            contents.append(
                types.Content(role="user", parts=[types.Part(text=msg["content"])])
            )
        elif msg["role"] == "assistant":
            contents.append(
                types.Content(role="model", parts=[types.Part(text=msg["content"])])
            )

    response = client.models.generate_content_stream(
        model="gemini-2.0-flash",
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            max_output_tokens=1024,
        ),
    )

    for chunk in response:
        if chunk.text:
            yield chunk.text


def stream_mistral(messages: list[ChatMessage]) -> Generator[str, None, None]:
    from mistralai import Mistral

    client = Mistral(api_key=settings.MISTRAL_API_KEY)
    response = client.chat.stream(
        model="mistral-small-latest",
        messages=cast(Any, messages),
        max_tokens=1024,
    )
    for event in response:
        delta = cast(Any, event.data.choices[0].delta.content)
        if isinstance(delta, str):
            yield delta
        elif isinstance(delta, list):
            for part in delta:
                text = getattr(part, "text", None)
                if isinstance(text, str) and text:
                    yield text
