"""
Request and Response Schema Models
"""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict


class ChatRequest(BaseModel):
    """Chat request model"""
    message: str = Field(..., min_length=1, description="User message")
    

class ChatResponse(BaseModel):
    """Chat response model"""
    response: str = Field(..., description="AI response")
    agent_used: str = Field(..., description="Agent type used")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CodeGenerationRequest(BaseModel):
    """Code generation request model"""
    prompt: str = Field(..., min_length=1, description="Code generation prompt")
    language: Optional[str] = Field(default="python", description="Programming language")
    

class CodeGenerationResponse(BaseModel):
    """Code generation response model"""
    code: str = Field(..., description="Generated code")
    explanation: str = Field(..., description="Code explanation")
    language: str = Field(..., description="Programming language")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class UIGenerationRequest(BaseModel):
    """UI generation request model"""
    prompt: str = Field(..., min_length=1, description="UI design prompt")
    framework: Optional[str] = Field(default="react", description="Framework (react, vue, svelte)")
    

class UIGenerationResponse(BaseModel):
    """UI generation response model"""
    component: str = Field(..., description="Generated component code")
    preview_info: str = Field(..., description="Component preview information")
    framework: str = Field(..., description="Framework used")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CommandRequest(BaseModel):
    """Command request model"""
    message: str = Field(..., min_length=1, description="User command")
    

class CommandResponse(BaseModel):
    """Command response model"""
    action: str = Field(..., description="Action type (open_url, search, etc)")
    details: Dict[str, Any] = Field(default_factory=dict, description="Action details")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MemoryItem(BaseModel):
    """Memory/Chat history item"""
    id: int
    user_input: str
    ai_output: str
    agent_used: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


class MemoryResponse(BaseModel):
    """Memory retrieval response"""
    history: list[MemoryItem] = Field(default_factory=list)
    total_count: int = 0
