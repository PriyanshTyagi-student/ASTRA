"""
OpenAI/Groq Service - Generate AI responses with different system roles
"""

import logging
from typing import Optional
from openai import AsyncOpenAI, AuthenticationError, RateLimitError, BadRequestError, APIConnectionError, APITimeoutError

from core.config import settings
from core.agent_manager import AgentType, get_system_role

logger = logging.getLogger(__name__)

# Initialize clients
_openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
_groq_client = (
    AsyncOpenAI(base_url="https://api.groq.com/openai/v1", api_key=settings.GROQ_API_KEY)
    if settings.GROQ_API_KEY
    else None
)


def _get_client() -> tuple[str, AsyncOpenAI | None, str]:
    """Get the appropriate AI client and model"""
    
    if settings.AI_PROVIDER == "groq":
        if not _groq_client:
            return "groq", None, settings.GROQ_MODEL
        return "groq", _groq_client, settings.GROQ_MODEL
    
    if not _openai_client:
        return "openai", None, settings.OPENAI_MODEL
    return "openai", _openai_client, settings.OPENAI_MODEL


async def generate_response(
    user_input: str,
    agent_type: AgentType,
    max_tokens: int = 2000
) -> str:
    """
    Generate AI response based on agent type and user input
    
    Args:
        user_input: The user's input/prompt
        agent_type: The type of agent (determines system role)
        max_tokens: Maximum tokens in response
        
    Returns:
        str: The AI-generated response
    """
    
    provider, client, model = _get_client()
    
    if not client:
        # Fallback mock response
        return f"Mock response from {provider}. Configure your API keys for live responses."
    
    system_role = get_system_role(agent_type)
    
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_role},
                {"role": "user", "content": user_input}
            ],
            max_tokens=max_tokens,
            temperature=0.7 if agent_type == AgentType.CHAT else 0.3,
        )
        
        return response.choices[0].message.content.strip()
    
    except AuthenticationError as e:
        logger.error(f"{provider.upper()} authentication failed: {e}")
        return f"{provider.upper()} authentication failed. Please check your API keys."
    
    except RateLimitError as e:
        logger.error(f"{provider.upper()} rate limit reached: {e}")
        return f"{provider.upper()} quota exceeded. Please try again later."
    
    except BadRequestError as e:
        logger.error(f"{provider.upper()} bad request: {e}")
        return f"{provider.upper()} request error: {str(e)}"
    
    except (APIConnectionError, APITimeoutError) as e:
        logger.error(f"{provider.upper()} connection error: {e}")
        return f"Cannot connect to {provider.upper()}. Please check your internet connection."
    
    except Exception as e:
        logger.error(f"Unexpected {provider.upper()} error: {e}")
        return f"An unexpected error occurred. Please try again."
