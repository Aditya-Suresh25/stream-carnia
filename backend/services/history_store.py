"""Lightweight SQLite-backed download history."""
import sqlite3
from pathlib import Path
from threading import Lock

from backend.models.schemas import HistoryEntry

_SCHEMA = """
CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    quality TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    file_path TEXT
);
"""


class HistoryStore:
    def __init__(self, db_path: str):
        self._db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        with self._connect() as conn:
            conn.execute(_SCHEMA)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def upsert(self, entry: HistoryEntry) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO history (id, title, url, quality, date, status, file_path)
                VALUES (:id, :title, :url, :quality, :date, :status, :file_path)
                ON CONFLICT(id) DO UPDATE SET
                    title=excluded.title, status=excluded.status,
                    file_path=excluded.file_path, date=excluded.date
                """,
                entry.model_dump(),
            )

    def list_recent(self, limit: int = 50) -> list[HistoryEntry]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM history ORDER BY date DESC LIMIT ?", (limit,)
            ).fetchall()
        return [HistoryEntry(**dict(row)) for row in rows]

    def remove(self, entry_id: str) -> None:
        with self._lock, self._connect() as conn:
            conn.execute("DELETE FROM history WHERE id = ?", (entry_id,))
