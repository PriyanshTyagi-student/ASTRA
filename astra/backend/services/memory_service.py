"""
Memory Service - Store and retrieve chat history
"""

from datetime import datetime
from sqlalchemy.orm import Session
from database.models import Memory
from core.agent_manager import AgentType


async def save_to_memory(
    db: Session,
    user_input: str,
    ai_output: str,
    agent_used: AgentType | str
) -> Memory:
    """
    Save user input and AI output to memory
    
    Args:
        db: Database session
        user_input: User's input
        ai_output: AI's response
        agent_used: Agent that processed the request
        
    Returns:
        Memory: The saved memory record
    """
    agent_name = agent_used.value if isinstance(agent_used, AgentType) else agent_used
    
    memory_record = Memory(
        user_input=user_input,
        ai_output=ai_output,
        agent_used=agent_name,
        timestamp=datetime.utcnow()
    )
    
    db.add(memory_record)
    db.commit()
    db.refresh(memory_record)
    
    return memory_record


async def get_memory_history(
    db: Session,
    limit: int = 50,
    offset: int = 0
) -> tuple[list[Memory], int]:
    """
    Retrieve chat history
    
    Args:
        db: Database session
        limit: Number of records to retrieve
        offset: Number of records to skip
        
    Returns:
        tuple: (memory_records, total_count)
    """
    total_count = db.query(Memory).count()
    
    records = (
        db.query(Memory)
        .order_by(Memory.timestamp.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    
    # Reverse to get chronological order
    records = list(reversed(records))
    
    return records, total_count


async def clear_memory(db: Session) -> int:
    """
    Clear all chat history
    
    Args:
        db: Database session
        
    Returns:
        int: Number of records deleted
    """
    count = db.query(Memory).delete()
    db.commit()
    return count


async def get_memory_by_agent(
    db: Session,
    agent_type: AgentType | str,
    limit: int = 50
) -> list[Memory]:
    """
    Retrieve chat history for a specific agent
    
    Args:
        db: Database session
        agent_type: Agent type to filter by
        limit: Number of records to retrieve
        
    Returns:
        list[Memory]: Memory records for the agent
    """
    agent_name = agent_type.value if isinstance(agent_type, AgentType) else agent_type
    
    records = (
        db.query(Memory)
        .filter(Memory.agent_used == agent_name)
        .order_by(Memory.timestamp.desc())
        .limit(limit)
        .all()
    )
    
    return list(reversed(records))
