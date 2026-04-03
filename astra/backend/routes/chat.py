"""
Chat Route - General conversation endpoint
"""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from schemas.request_models import ChatRequest, ChatResponse
from agents.chat_agent import ChatAgent
from services.memory_service import save_to_memory
from database.models import get_db
from core.agent_manager import detect_agent, AgentType

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
) -> ChatResponse:
    """
    Process user input and return AI response
    
    - **message**: User's input message
    """
    try:
        # Detect which agent should handle this
        agent_type = detect_agent(request.message)
        
        # For chat route, we use chat agent
        response = await ChatAgent.process(request.message)
        
        # Save to memory
        await save_to_memory(
            db,
            request.message,
            response,
            AgentType.CHAT
        )
        
        return ChatResponse(
            response=response,
            agent_used=AgentType.CHAT.value
        )
    
    except Exception as e:
        logger.error(f"Chat processing error: {e}")
        return ChatResponse(
            response="An error occurred processing your request.",
            agent_used=AgentType.CHAT.value
        )
