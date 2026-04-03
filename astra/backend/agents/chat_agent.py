"""
Chat Agent - Handles general conversational AI
"""

from core.agent_manager import AgentType
from services.openai_service import generate_response


class ChatAgent:
    """Chat Agent for general conversation"""
    
    agent_type = AgentType.CHAT
    
    @staticmethod
    async def process(user_input: str) -> str:
        """
        Process user input and generate chat response
        
        Args:
            user_input: The user's message/question
            
        Returns:
            str: The AI-generated response
        """
        return await generate_response(user_input, ChatAgent.agent_type)
