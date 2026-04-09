from __future__ import annotations

import json
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
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS app_state (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    kind TEXT NOT NULL DEFAULT 'chat',
                    title TEXT NOT NULL,
                    messages_json TEXT NOT NULL,
                    files_json TEXT NOT NULL DEFAULT '[]',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
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

    def get_state(self, key: str) -> str | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT value FROM app_state WHERE key = ?",
                (key,),
            ).fetchone()
        if row is None:
            return None
        return str(row["value"])

    def set_state(self, key: str, value: str) -> None:
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, value),
            )
            connection.commit()

    def save_session(
        self,
        session_id: str,
        title: str,
        messages: list[dict[str, Any]],
        files: list[dict[str, Any]] | None = None,
        kind: str = "chat",
    ) -> dict[str, Any]:
        timestamp = datetime.utcnow().isoformat() + "Z"
        normalized_files = files or []
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO sessions (id, kind, title, messages_json, files_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    kind = excluded.kind,
                    title = excluded.title,
                    messages_json = excluded.messages_json,
                    files_json = excluded.files_json,
                    updated_at = excluded.updated_at
                """,
                (session_id, kind, title, json.dumps(messages), json.dumps(normalized_files), timestamp, timestamp),
            )
            connection.commit()

        return self.get_session(session_id) or {
            "id": session_id,
            "kind": kind,
            "title": title,
            "messages": messages,
            "files": normalized_files,
            "created_at": timestamp,
            "updated_at": timestamp,
        }

    def list_sessions(self) -> list[dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT id, kind, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC",
            ).fetchall()
        return [dict(row) for row in rows]

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT id, kind, title, messages_json, files_json, created_at, updated_at FROM sessions WHERE id = ?",
                (session_id,),
            ).fetchone()
        if row is None:
            return None

        return {
            "id": row["id"],
            "kind": row["kind"],
            "title": row["title"],
            "messages": json.loads(row["messages_json"] or "[]"),
            "files": json.loads(row["files_json"] or "[]"),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }


memory_store = MemoryStore(settings.memory_db_path)
