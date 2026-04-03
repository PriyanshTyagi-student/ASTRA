from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env", override=True)


class Settings:
    def __init__(self) -> None:
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2")
        self.ai_provider = os.getenv("AI_PROVIDER", "gemini").lower()
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        self.backend_host = os.getenv("HOST", "127.0.0.1")
        self.backend_port = int(os.getenv("PORT", "8000"))
        self.debug = os.getenv("DEBUG", "true").lower() == "true"
        self.memory_db_path = os.getenv("MEMORY_DB_PATH", str(BASE_DIR / "astra.db"))
        self.generated_dir = Path(os.getenv("GENERATED_DIR", str(BASE_DIR / "generated")))
        self.allowed_origins = ["*"]


settings = Settings()
