from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import settings

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
OLLAMA_CHAT_URL = "/api/chat"
SYSTEM_PROMPT = (
    "You are ASTRA, an advanced autonomous AI system that can plan, code, and execute tasks. "
    "Respond clearly and concisely. When generating code, return exact code fences or structured JSON when asked."
)


async def call_openai(prompt: str, system_prompt: str | None = None, temperature: float = 0.5) -> str:
    if not settings.openai_api_key:
        return (
            "OpenAI API key is not configured. "
            "Set OPENAI_API_KEY in backend/.env to enable live model responses."
        )

    payload = {
        "model": settings.openai_model,
        "messages": [
            {"role": "system", "content": system_prompt or SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
    }

    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(OPENAI_URL, headers=headers, json=payload)
        response.raise_for_status()
        data: dict[str, Any] = response.json()

    return data["choices"][0]["message"]["content"].strip()


async def call_gemini(prompt: str, system_prompt: str | None = None, temperature: float = 0.5) -> str:
    if not settings.gemini_api_key:
        return (
            "Gemini API key is not configured. "
            "Set GEMINI_API_KEY in backend/.env to enable live model responses."
        )

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt or SYSTEM_PROMPT}],
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": temperature,
        },
    }

    url = GEMINI_URL.format(model=settings.gemini_model, api_key=settings.gemini_api_key)

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data: dict[str, Any] = response.json()

    candidates = data.get("candidates", [])
    if not candidates:
        raise json.JSONDecodeError("Missing Gemini candidates", response.text, 0)

    content_parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in content_parts if isinstance(part, dict))
    if not text.strip():
        raise json.JSONDecodeError("Missing Gemini text", response.text, 0)

    return text.strip()


async def call_ollama(prompt: str, system_prompt: str | None = None, temperature: float = 0.5) -> str:
    payload = {
        "model": settings.ollama_model,
        "messages": [
            {"role": "system", "content": system_prompt or SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        "options": {
            "temperature": temperature,
        },
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(f"{settings.ollama_base_url}{OLLAMA_CHAT_URL}", json=payload)
        response.raise_for_status()
        data: dict[str, Any] = response.json()

    message = data.get("message", {})
    content = message.get("content", "")
    if not isinstance(content, str) or not content.strip():
        raise json.JSONDecodeError("Missing message content", response.text, 0)

    return content.strip()


async def call_model(prompt: str, system_prompt: str | None = None, temperature: float = 0.5) -> str:
    try:
        if settings.ai_provider == "gemini":
            return await call_gemini(prompt=prompt, system_prompt=system_prompt, temperature=temperature)
        if settings.ai_provider == "ollama":
            return await call_ollama(prompt=prompt, system_prompt=system_prompt, temperature=temperature)
        return await call_openai(prompt=prompt, system_prompt=system_prompt, temperature=temperature)
    except (httpx.HTTPStatusError, httpx.RequestError, KeyError, IndexError, json.JSONDecodeError):
        return _fallback_response(prompt, settings.ai_provider)


def _fallback_response(prompt: str, provider: str) -> str:
    lowered = prompt.lower()

    if "json array" in lowered and "break the following task" in lowered:
        return json.dumps([
            "Clarify the goal and constraints",
            "Break the work into backend and frontend tasks",
            "Implement the core feature",
            "Validate the result and refine",
        ])

    if "generate code" in lowered or "return a json object" in lowered:
        code = (
            "export function generatedFeature(input: string): string {\n"
            "  return `ASTRA generated: ${input}`;\n"
            "}\n"
        )
        return json.dumps(
            {
                "filename": "generated-feature.ts",
                "language": "typescript",
                "code": code,
                "summary": "Generated locally because the OpenAI request was unavailable.",
            }
        )

    return (
        f"ASTRA is running in local fallback mode because the {provider.upper()} provider is currently unavailable. "
        "I can still help plan, code, and structure tasks. Try asking for a project plan or code snippet."
    )
