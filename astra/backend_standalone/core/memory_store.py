import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List


class MemoryStore:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_message TEXT NOT NULL,
                    ai_response TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                )
                """
            )
            conn.commit()

    def add(self, user_message: str, ai_response: str) -> int:
        now = datetime.utcnow().isoformat() + "Z"
        with self._connect() as conn:
            cur = conn.execute(
                "INSERT INTO conversations (user_message, ai_response, timestamp) VALUES (?, ?, ?)",
                (user_message, ai_response, now),
            )
            conn.commit()
            return int(cur.lastrowid)

    def history(self, limit: int = 100) -> List[Dict[str, Any]]:
        safe_limit = max(1, min(limit, 500))
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, user_message, ai_response, timestamp FROM conversations ORDER BY id DESC LIMIT ?",
                (safe_limit,),
            ).fetchall()
        return [dict(row) for row in reversed(rows)]

    def recent_user_topics(self, limit: int = 8) -> List[str]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT user_message FROM conversations ORDER BY id DESC LIMIT ?",
                (max(1, min(limit, 50)),),
            ).fetchall()
        return [str(r["user_message"]) for r in rows]
