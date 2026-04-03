"""
Code Generation Route - Code generation endpoint
"""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from schemas.request_models import CodeGenerationRequest, CodeGenerationResponse
from agents.code_agent import CodeAgent
from services.memory_service import save_to_memory
from database.models import get_db
from core.agent_manager import AgentType

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate-code", response_model=CodeGenerationResponse)
async def generate_code(
    request: CodeGenerationRequest,
    db: Session = Depends(get_db)
) -> CodeGenerationResponse:
    """
    Generate code based on prompt
    
    - **prompt**: Code generation prompt
    - **language**: Programming language (default: python)
    """
    try:
        response = await CodeAgent.process(
            request.prompt,
            language=request.language or "python"
        )
        
        # Save to memory
        await save_to_memory(
            db,
            request.prompt,
            response,
            AgentType.CODE
        )
        
        return CodeGenerationResponse(
            code=response,
            explanation="Code generated using AI",
            language=request.language or "python"
        )
    
    except Exception as e:
        logger.error(f"Code generation error: {e}")
        return CodeGenerationResponse(
            code="",
            explanation="An error occurred generating code.",
            language=request.language or "python"
        )
