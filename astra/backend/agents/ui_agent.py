"""
UI Agent - Generates React components and UI designs
"""

from core.agent_manager import AgentType
from services.openai_service import generate_response


class UIAgent:
    """UI Agent for component and UI generation"""
    
    agent_type = AgentType.UI
    
    @staticmethod
    async def process(prompt: str, framework: str = "react") -> str:
        """
        Generate UI components
        
        Args:
            prompt: UI design prompt
            framework: Framework to use (react, vue, svelte)
            
        Returns:
            str: Generated component code
        """
        enhanced_prompt = (
            f"Generate a modern {framework} component for: {prompt}\n\n"
            "Use Tailwind CSS for styling. Include proper accessibility. "
            "Make it beautiful and responsive. Return complete, functional code."
        )
        return await generate_response(enhanced_prompt, UIAgent.agent_type, max_tokens=3000)
