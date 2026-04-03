"""
Code Agent - Generates programming code
"""

from core.agent_manager import AgentType
from services.openai_service import generate_response


class CodeAgent:
    """Code Agent for code generation"""
    
    agent_type = AgentType.CODE
    
    @staticmethod
    async def process(prompt: str, language: str = "python") -> str:
        """
        Generate code based on prompt
        
        Args:
            prompt: Code generation prompt
            language: Programming language
            
        Returns:
            str: Generated code with explanation
        """
        enhanced_prompt = f"Generate {language} code for: {prompt}\n\nProvide clean, well-commented code."
        return await generate_response(enhanced_prompt, CodeAgent.agent_type, max_tokens=3000)
