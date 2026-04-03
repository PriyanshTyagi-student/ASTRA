from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.local_ai import LocalAIEngine
from core.memory_store import MemoryStore


class ChatRequest(BaseModel):
    message: str


class CommandRequest(BaseModel):
    message: str


app = FastAPI(title="ASTRA Standalone Local Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

memory = MemoryStore(db_path="data/local_ai.db")
ai = LocalAIEngine()


@app.get("/health")
def health() -> dict:
    return {
        "status": "healthy",
        "service": "ASTRA Standalone Local Backend",
        "mode": "fully-local",
    }


@app.get("/status")
def status() -> dict:
    return {
        "status": "online",
        "backend": "standalone-local-ai",
        "external_ai_calls": False,
    }


@app.get("/history")
def history(limit: int = 100) -> dict:
    return {"history": memory.history(limit=limit)}


@app.post("/command")
def command(payload: CommandRequest) -> dict:
    result = ai.parse_command(payload.message)
    return {"action": result.action, "url": result.url}


@app.post("/chat")
def chat(payload: ChatRequest) -> dict:
    recent_topics = memory.recent_user_topics(limit=8)
    response = ai.respond(payload.message, recent_topics=recent_topics)
    memory.add(payload.message, response)
    return {"response": response}
