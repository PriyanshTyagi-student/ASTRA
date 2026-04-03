"""
Memory/History Route - Chat history and memory endpoints
"""

import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from schemas.request_models import MemoryResponse, MemoryItem
from services.memory_service import get_memory_history, clear_memory, get_memory_by_agent
from database.models import get_db
from core.agent_manager import AgentType

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/memory", response_model=MemoryResponse)
async def get_memory(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
) -> MemoryResponse:
    """
    Retrieve chat history and memory
    
    - **limit**: Number of records (max 200)
    - **offset**: Number of records to skip
    """
    try:
        records, total_count = await get_memory_history(db, limit=limit, offset=offset)
        
        memory_items = [MemoryItem.model_validate(record) for record in records]
        
        return MemoryResponse(history=memory_items, total_count=total_count)
    
    except Exception as e:
        logger.error(f"Memory retrieval error: {e}")
        return MemoryResponse(history=[], total_count=0)


@router.get("/memory/{agent_name}", response_model=MemoryResponse)
async def get_memory_by_agent_type(
    agent_name: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
) -> MemoryResponse:
    """
    Retrieve memory for specific agent type
    
    - **agent_name**: Agent type (chat, code, ui, command)
    - **limit**: Number of records (max 200)
    """
    try:
        records = await get_memory_by_agent(db, agent_name, limit=limit)
        memory_items = [MemoryItem.model_validate(record) for record in records]
        
        return MemoryResponse(history=memory_items, total_count=len(memory_items))
    
    except Exception as e:
        logger.error(f"Agent memory retrieval error: {e}")
        return MemoryResponse(history=[], total_count=0)


@router.delete("/memory")
async def clear_chat_memory(db: Session = Depends(get_db)) -> dict:
    """Clear all chat history and memory"""
    try:
        count = await clear_memory(db)
        return {"message": f"Cleared {count} memory records", "count": count}
    
    except Exception as e:
        logger.error(f"Memory clear error: {e}")
        return {"message": "Error clearing memory", "count": 0}
