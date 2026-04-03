"""
Agent Manager - Routes requests to the appropriate agent based on input analysis
"""

from enum import Enum
from typing import Literal


class AgentType(str, Enum):
    """Available agent types"""
    CHAT = "chat"
    CODE = "code"
    UI = "ui"
    COMMAND = "command"


def detect_agent(user_input: str) -> AgentType:
    """
    Analyze user input and return the appropriate agent type
    
    Args:
        user_input: The user's request text
        
    Returns:
        AgentType: The detected agent type
    """
    input_lower = user_input.lower().strip()
    
    # Code generation keywords
    code_keywords = [
        "create code", "write code", "write function", "generate code",
        "code snippet", "function", "class", "algorithm", "implement",
        "debug", "refactor", "optimize", "write a script", "python",
        "javascript", "typescript", "java", "cpp", "c#", "golang",
        "rust", "ruby", "php", "sql", "html", "css"
    ]
    
    # UI generation keywords
    ui_keywords = [
        "design ui", "create component", "build ui", "generate component",
        "react component", "create page", "design page", "ui design",
        "component design", "layout", "frontend", "interface", "dashboard",
        "landing page", "form design", "button design", "card design"
    ]
    
    # Command execution keywords
    command_keywords = [
        "open", "run", "execute", "launch", "start", "close",
        "search", "google", "find", "look up", "navigate", "go to",
        "browse", "visit", "access", "open url"
    ]
    
    # Check for code agent
    for keyword in code_keywords:
        if keyword in input_lower:
            return AgentType.CODE
    
    # Check for UI agent
    for keyword in ui_keywords:
        if keyword in input_lower:
            return AgentType.UI
    
    # Check for command agent
    for keyword in command_keywords:
        if keyword in input_lower:
            return AgentType.COMMAND
    
    # Default to chat
    return AgentType.CHAT


def get_system_role(agent_type: AgentType) -> str:
    """
    Get the system role prompt for the specified agent type
    
    Args:
        agent_type: The type of agent
        
    Returns:
        str: The system role prompt
    """
    roles = {
        AgentType.CHAT: (
            "You are ASTRA, a concise and helpful AI engineering assistant. "
            "You provide information and guidance on technical topics with clarity and precision. "
            "Always be helpful, accurate, and respectful."
        ),
        AgentType.CODE: (
            "You are an expert programmer and code generation AI. "
            "Generate clean, efficient, well-documented code. "
            "Include comments explaining complex logic. "
            "Follow best practices and design patterns. "
            "Format code with proper syntax highlighting markers."
        ),
        AgentType.UI: (
            "You are a frontend designer specializing in React and Tailwind CSS. "
            "Generate beautiful, responsive React components with modern UI design. "
            "Use Tailwind CSS for styling. Include proper accessibility (a11y). "
            "Make components reusable and well-structured. "
            "Provide complete, functional component code."
        ),
        AgentType.COMMAND: (
            "You are an automation assistant. Analyze user requests and provide "
            "structured actions to execute. Return JSON with action details like URLs, "
            "commands, or parameters. Be precise and actionable."
        ),
    }
    
    return roles.get(agent_type, roles[AgentType.CHAT])
