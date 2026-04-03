import os
import logging

from dotenv import load_dotenv
from openai import (
    APIConnectionError,
    APITimeoutError,
    AsyncOpenAI,
    AuthenticationError,
    BadRequestError,
    RateLimitError,
)

load_dotenv()

logger = logging.getLogger(__name__)

ASSISTANT_INSTRUCTIONS = (
    "You are ASTRA, a concise and helpful AI engineering assistant. "
    "When the user asks to create or generate code/files, respond ONLY with strict JSON using this schema: "
    "{\"type\":\"code_generation\",\"filename\":\"string\",\"language\":\"typescript|javascript|json|markdown|css|html|python\",\"code\":\"string\",\"summary\":\"short plain-text summary\"}. "
    "Do not wrap JSON in markdown fences. "
    "For non-code requests, respond in normal plain text."
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
AI_PROVIDER = os.getenv("AI_PROVIDER", "openai").strip().lower() or "openai"

_openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
_groq_client = (
    AsyncOpenAI(base_url="https://api.groq.com/openai/v1", api_key=GROQ_API_KEY)
    if GROQ_API_KEY
    else None
)


def _resolve_provider() -> tuple[str, AsyncOpenAI | None, str]:
    if AI_PROVIDER == "groq":
        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip() or "llama-3.3-70b-versatile"
        return "groq", _groq_client, model

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
    return "openai", _openai_client, model


async def generate_response(message: str) -> str:
    if not message.strip():
        return "Please provide a message so I can help."

    provider, client, model = _resolve_provider()

    if client is None:
        if provider == "groq":
            return (
                f"Mock ASTRA reply: You said '{message}'. Configure GROQ_API_KEY for live Groq responses."
            )
        return f"Mock ASTRA reply: You said '{message}'. Configure OPENAI_API_KEY for live OpenAI responses."

    try:
        completion = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": ASSISTANT_INSTRUCTIONS},
                {"role": "user", "content": message},
            ],
        )

        response_text = completion.choices[0].message.content.strip() if completion.choices else ""
        if response_text:
            return response_text
        return "I could not generate a response at the moment."
    except AuthenticationError:
        logger.exception("%s authentication failed", provider.upper())
        key_name = "GROQ_API_KEY" if provider == "groq" else "OPENAI_API_KEY"
        return f"{provider.upper()} authentication failed. Please verify {key_name} and restart backend."
    except RateLimitError:
        logger.exception("%s rate limit or quota issue", provider.upper())
        return f"{provider.upper()} quota or rate limit reached. Please check billing/usage and try again."
    except BadRequestError as exc:
        logger.exception("%s bad request", provider.upper())
        return f"{provider.upper()} request rejected ({model}). {exc.message}"
    except (APIConnectionError, APITimeoutError):
        logger.exception("%s connection/timeout error", provider.upper())
        return (
            f"Cannot connect to {provider.upper()} right now. Check internet/proxy/firewall and retry."
        )
    except Exception:
        logger.exception("Unexpected %s error", provider.upper())
        return f"I am temporarily unable to reach {provider.upper()}. Please try again shortly."
