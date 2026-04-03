"""
Command Agent - Handles action execution and automation
"""

import json
import logging
from core.agent_manager import AgentType
from services.openai_service import generate_response

logger = logging.getLogger(__name__)


class CommandAgent:
    """Command Agent for action execution"""
    
    agent_type = AgentType.COMMAND
    
    @staticmethod
    async def process(user_input: str) -> dict:
        """
        Process user command and return structured action
        
        Args:
            user_input: User command
            
        Returns:
            dict: Structured action with details
        """
        prompt = (
            f"User command: {user_input}\n\n"
            "Return a JSON object with 'action' (open_url, search, execute, etc) and 'details' dict. "
            "Example: {\"action\": \"open_url\", \"details\": {\"url\": \"https://...\"}}"
        )
        
        response = await generate_response(prompt, CommandAgent.agent_type)
        
        try:
            # Try to parse JSON response
            action_data = json.loads(response)
            if "action" in action_data:
                return action_data
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse command response as JSON: {response}")
        
        # Fallback if response isn't valid JSON
        return {
            "action": "unknown",
            "details": {"message": response}
        }
