from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

from app.core.config import settings


class MemoryStore:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _init_db(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_message TEXT NOT NULL,
                    ai_response TEXT NOT NULL,
                    mode TEXT NOT NULL DEFAULT 'chat',
                    timestamp TEXT NOT NULL
                )
                """
            )
            connection.commit()

    def save_message(self, user_message: str, ai_response: str, mode: str = "chat") -> int:
        timestamp = datetime.utcnow().isoformat() + "Z"
        with self._connect() as connection:
            cursor = connection.execute(
                "INSERT INTO conversations (user_message, ai_response, mode, timestamp) VALUES (?, ?, ?, ?)",
                (user_message, ai_response, mode, timestamp),
            )
            connection.commit()
            return int(cursor.lastrowid or 0)

    def get_history(self, limit: int = 100) -> list[dict[str, Any]]:
        safe_limit = max(1, min(limit, 500))
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT id, user_message, ai_response, mode, timestamp FROM conversations ORDER BY id DESC LIMIT ?",
                (safe_limit,),
            ).fetchall()
        return [dict(row) for row in reversed(rows)]

    def clear_history(self) -> int:
        with self._connect() as connection:
            cursor = connection.execute("DELETE FROM conversations")
            connection.commit()
            return int(cursor.rowcount or 0)

    def recent_topics(self, limit: int = 10) -> list[str]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT user_message FROM conversations ORDER BY id DESC LIMIT ?",
                (max(1, min(limit, 50)),),
            ).fetchall()
        return [str(row["user_message"]) for row in rows]


memory_store = MemoryStore(settings.memory_db_path)
