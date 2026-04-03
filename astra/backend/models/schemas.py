from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)


class ChatResponse(BaseModel):
    response: str


class ChatHistoryItem(BaseModel):
    id: int
    user_message: str
    ai_response: str
    timestamp: datetime

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    history: list[ChatHistoryItem]
    total: int


class CommandRequest(BaseModel):
    message: str = Field(..., min_length=1)


class CommandResponse(BaseModel):
    action: str = "none"
    url: str | None = None
