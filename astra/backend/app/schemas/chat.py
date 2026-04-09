from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)


class ChatResponse(BaseModel):
    type: str = "chat"
    response: str
    mode: str = "chat"
    plan: list[str] = Field(default_factory=list)
    code: str | None = None
    language: str | None = None
    requiresApproval: bool = False
    files: list[dict[str, str]] = Field(default_factory=list)
    execution: list[str] = Field(default_factory=list)
    artifacts: list[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ExecuteRequest(BaseModel):
    plan: list[str] = Field(default_factory=list)
    request: str | None = None


class ProjectFile(BaseModel):
    name: str
    content: str


class ProjectResponse(BaseModel):
    type: str = "project"
    response: str = ""
    files: list[ProjectFile] = Field(default_factory=list)


class SessionMessage(BaseModel):
    sender: str
    content: str
    timestamp: datetime


class SessionFile(BaseModel):
    id: str
    name: str
    language: str
    content: str


class SessionRecord(BaseModel):
    id: str
    kind: str = "chat"
    title: str
    messages: list[SessionMessage] = Field(default_factory=list)
    files: list[SessionFile] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class SessionListResponse(BaseModel):
    sessions: list[SessionRecord]


class SaveSessionRequest(BaseModel):
    id: str
    kind: str = "chat"
    title: str
    messages: list[SessionMessage] = Field(default_factory=list)
    files: list[SessionFile] = Field(default_factory=list)


class CodeRequest(BaseModel):
    prompt: str | None = Field(default=None)
    language: str = Field(default="python")
    filename: str | None = Field(default=None)
    code: str | None = Field(default=None)
    project_name: str | None = Field(default=None)


class ProjectRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    project_name: str | None = None


class HistoryItem(BaseModel):
    id: int
    user_message: str
    ai_response: str
    mode: str
    timestamp: datetime

    class Config:
        from_attributes = True


class HistoryResponse(BaseModel):
    history: list[HistoryItem]
    total: int
