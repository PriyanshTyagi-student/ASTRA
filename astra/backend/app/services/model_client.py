from __future__ import annotations

import json
import time
from typing import Any

import httpx

from app.core.config import settings
from app.services.memory import memory_store

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
HUGGINGFACE_URL = "https://api-inference.huggingface.co/models/{model}"
HUGGINGFACE_CHAT_URL = "https://router.huggingface.co/v1/chat/completions"
OLLAMA_CHAT_URL = "/api/chat"
GEMINI_MODEL_FALLBACKS = (
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-002",
)
LEGACY_GEMINI_MODELS = {
    "gemini-1.5-flash",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro",
    "gemini-1.5-pro-002",
}
GEMINI_RATE_LIMIT_COOLDOWN_SECONDS = 300
GEMINI_RATE_LIMIT_STATE_KEY = "gemini_rate_limited_until"
HUGGINGFACE_MODEL_FALLBACKS = (
    "Qwen/Qwen2.5-7B-Instruct",
    "mistralai/Mistral-7B-Instruct-v0.3",
    "HuggingFaceH4/zephyr-7b-beta",
)
SYSTEM_PROMPT = (
    "You are ASTRA, an advanced autonomous AI system that can plan, code, and execute tasks. "
    "Use disciplined problem solving: restate the objective, identify constraints, break the work into ordered steps, "
    "choose the simplest correct approach, and verify edge cases before concluding. "
    "When requirements are unclear, ask the smallest necessary clarifying question instead of guessing. "
    "Prefer structured answers with concise plans, explicit assumptions, and validation notes. "
    "Do not reveal private chain-of-thought; provide the final answer, plan, or code only. "
    "When generating code, return exact code fences or structured JSON when asked."
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

    cooldown_until = _get_gemini_cooldown_until()
    if time.time() < cooldown_until:
        raise httpx.HTTPStatusError(
            "Gemini is temporarily rate-limited",
            request=httpx.Request("POST", "https://generativelanguage.googleapis.com"),
            response=httpx.Response(429, request=httpx.Request("POST", "https://generativelanguage.googleapis.com")),
        )

    model_order = GEMINI_MODEL_FALLBACKS + (settings.gemini_model,) if settings.gemini_model in LEGACY_GEMINI_MODELS else (settings.gemini_model,) + GEMINI_MODEL_FALLBACKS

    candidate_models = []
    for model_name in model_order:
        if model_name and model_name not in candidate_models:
            candidate_models.append(model_name)

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

    last_response: httpx.Response | None = None

    async with httpx.AsyncClient(timeout=60) as client:
        for model_name in candidate_models:
            url = GEMINI_URL.format(model=model_name, api_key=settings.gemini_api_key)
            response = await client.post(url, json=payload)
            last_response = response

            if response.status_code == 404:
                continue

            if response.status_code == 429:
                _set_gemini_cooldown_until(time.time() + GEMINI_RATE_LIMIT_COOLDOWN_SECONDS)
                raise httpx.HTTPStatusError("Gemini rate limit exceeded", request=response.request, response=response)

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

    if last_response is not None:
        last_response.raise_for_status()

    raise RuntimeError("Gemini request failed before a response was returned.")


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


async def call_huggingface(prompt: str, system_prompt: str | None = None, temperature: float = 0.5) -> str:
    if not settings.huggingface_api_key:
        return (
            "Hugging Face API key is not configured. "
            "Set HUGGINGFACE_API_KEY or HF_TOKEN in backend/.env to enable live model responses."
        )

    headers = {
        "Authorization": f"Bearer {settings.huggingface_api_key}",
        "Content-Type": "application/json",
    }

    candidate_models = []
    for model_name in (settings.huggingface_model, *HUGGINGFACE_MODEL_FALLBACKS):
        if model_name and model_name not in candidate_models:
            candidate_models.append(model_name)

    async with httpx.AsyncClient(timeout=60) as client:
        for model_name in candidate_models:
            chat_payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt or SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "temperature": temperature,
            }

            chat_response = await client.post(HUGGINGFACE_CHAT_URL, headers=headers, json=chat_payload)

            if chat_response.status_code == 429:
                raise httpx.HTTPStatusError("Hugging Face rate limit exceeded", request=chat_response.request, response=chat_response)

            if chat_response.status_code in {400, 404, 410, 422}:
                pass
            else:
                chat_response.raise_for_status()
                data: Any = chat_response.json()
                text = _extract_huggingface_chat_text(data)
                if text:
                    return text

            inference_payload = {
                "inputs": f"{system_prompt or SYSTEM_PROMPT}\n\nUser request: {prompt}",
                "parameters": {
                    "temperature": temperature,
                    "return_full_text": False,
                },
                "options": {
                    "wait_for_model": True,
                    "use_cache": False,
                },
            }

            response = await client.post(
                HUGGINGFACE_URL.format(model=model_name),
                headers=headers,
                json=inference_payload,
            )

            if response.status_code == 429:
                raise httpx.HTTPStatusError("Hugging Face rate limit exceeded", request=response.request, response=response)

            if response.status_code in {400, 404, 410, 422}:
                continue

            response.raise_for_status()
            data = response.json()
            text = _extract_huggingface_inference_text(data)
            if text:
                return text

    raise json.JSONDecodeError("Missing Hugging Face generated text", "", 0)


def _extract_huggingface_chat_text(data: Any) -> str:
    if not isinstance(data, dict):
        return ""

    choices = data.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""

    first_choice = choices[0]
    if not isinstance(first_choice, dict):
        return ""

    message = first_choice.get("message")
    if isinstance(message, dict):
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            return content.strip()

    text = first_choice.get("text")
    if isinstance(text, str) and text.strip():
        return text.strip()

    return ""


def _extract_huggingface_inference_text(data: Any) -> str:
    if isinstance(data, dict):
        if data.get("error"):
            return ""

        generated_text = data.get("generated_text")
        if isinstance(generated_text, str) and generated_text.strip():
            return generated_text.strip()

        if isinstance(data.get("choices"), list) and data["choices"]:
            choice = data["choices"][0]
            if isinstance(choice, dict):
                text = choice.get("text") or choice.get("generated_text")
                if isinstance(text, str) and text.strip():
                    return text.strip()

    if isinstance(data, list) and data:
        first_item = data[0]
        if isinstance(first_item, dict):
            generated_text = first_item.get("generated_text")
            if isinstance(generated_text, str) and generated_text.strip():
                return generated_text.strip()

    return ""


async def call_model(prompt: str, system_prompt: str | None = None, temperature: float = 0.5) -> str:
    try:
        if settings.ai_provider == "gemini" and time.time() < _get_gemini_cooldown_until():
            return _fallback_response(prompt, settings.ai_provider)
        if settings.ai_provider == "gemini":
            return await call_gemini(prompt=prompt, system_prompt=system_prompt, temperature=temperature)
        if settings.ai_provider in {"huggingface", "hf"}:
            return await call_huggingface(prompt=prompt, system_prompt=system_prompt, temperature=temperature)
        if settings.ai_provider == "ollama":
            return await call_ollama(prompt=prompt, system_prompt=system_prompt, temperature=temperature)
        return await call_openai(prompt=prompt, system_prompt=system_prompt, temperature=temperature)
    except (httpx.HTTPStatusError, httpx.RequestError, KeyError, IndexError, json.JSONDecodeError):
        return _fallback_response(prompt, settings.ai_provider)


def _get_gemini_cooldown_until() -> float:
    raw_value = memory_store.get_state(GEMINI_RATE_LIMIT_STATE_KEY)
    if not raw_value:
        return 0.0

    try:
        return float(raw_value)
    except ValueError:
        return 0.0


def _set_gemini_cooldown_until(until_timestamp: float) -> None:
    memory_store.set_state(GEMINI_RATE_LIMIT_STATE_KEY, str(until_timestamp))


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
                "summary": "Generated locally because the live model request was unavailable.",
            }
        )

    return (
        f"ASTRA is running in local fallback mode because the {provider.upper()} provider is currently unavailable. "
        "I can still help plan, code, and structure tasks. Try asking for a project plan or code snippet."
    )
