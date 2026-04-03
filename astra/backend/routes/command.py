"""
Command Route - Action execution endpoint
"""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from schemas.request_models import CommandRequest, CommandResponse
from agents.command_agent import CommandAgent
from services.memory_service import save_to_memory
from database.models import get_db
from core.agent_manager import AgentType

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/command", response_model=CommandResponse)
async def execute_command(
    request: CommandRequest,
    db: Session = Depends(get_db)
) -> CommandResponse:
    """
    Execute user command
    
    - **message**: Command description
    """
    try:
        action_data = await CommandAgent.process(request.message)
        
        # Save to memory
        await save_to_memory(
            db,
            request.message,
            str(action_data),
            AgentType.COMMAND
        )
        
        return CommandResponse(
            action=action_data.get("action", "unknown"),
            details=action_data.get("details", {})
        )
    
    except Exception as e:
        logger.error(f"Command execution error: {e}")
        return CommandResponse(
            action="error",
            details={"error": str(e)}
        )
