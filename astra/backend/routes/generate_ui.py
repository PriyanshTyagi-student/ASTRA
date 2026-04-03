"""
UI Generation Route - Component and UI generation endpoint
"""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from schemas.request_models import UIGenerationRequest, UIGenerationResponse
from agents.ui_agent import UIAgent
from services.memory_service import save_to_memory
from database.models import get_db
from core.agent_manager import AgentType

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate-ui", response_model=UIGenerationResponse)
async def generate_ui(
    request: UIGenerationRequest,
    db: Session = Depends(get_db)
) -> UIGenerationResponse:
    """
    Generate UI components
    
    - **prompt**: UI design prompt
    - **framework**: Framework (default: react)
    """
    try:
        response = await UIAgent.process(
            request.prompt,
            framework=request.framework or "react"
        )
        
        # Save to memory
        await save_to_memory(
            db,
            request.prompt,
            response,
            AgentType.UI
        )
        
        return UIGenerationResponse(
            component=response,
            preview_info="React component with Tailwind CSS",
            framework=request.framework or "react"
        )
    
    except Exception as e:
        logger.error(f"UI generation error: {e}")
        return UIGenerationResponse(
            component="",
            preview_info="An error occurred generating UI.",
            framework=request.framework or "react"
        )
