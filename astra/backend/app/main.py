from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes.chat import router as chat_router
from app.services.memory import memory_store

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("astra")

app = FastAPI(title="ASTRA", version="2.0.0", description="Modular AI system with planner, memory, and execution engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("ASTRA modular backend starting")
    logger.info("Memory store initialized at %s", settings.memory_db_path)


@app.get("/health")
def health() -> dict:
    return {
        "status": "healthy",
        "service": "ASTRA",
        "mode": f"modular-{settings.ai_provider}",
        "provider": settings.ai_provider,
    }


@app.get("/status")
def status() -> dict:
    return {
        "status": "online",
        "service": "ASTRA",
        "mode": f"modular-{settings.ai_provider}",
        "memory_records": len(memory_store.get_history(limit=1)),
        "provider": settings.ai_provider,
    }


app.include_router(chat_router)

