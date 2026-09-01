"""Analytics and version management database service."""
from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional


class AnalyticsStore:
    """Manages analytics events, versions, and admin authentication."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._lock = threading.Lock()
        self._init_db()

    def _init_db(self):
        """Initialize database schema if it doesn't exist."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Admin users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)

            # Software versions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS versions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version TEXT UNIQUE NOT NULL,
                    release_date TEXT NOT NULL,
                    status TEXT DEFAULT 'stable',
                    download_url TEXT NOT NULL,
                    file_size INTEGER,
                    changelog TEXT,
                    is_latest INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    file_path TEXT,
                    file_name TEXT,
                    uploaded_at TEXT,
                    is_published INTEGER DEFAULT 0,
                    download_count INTEGER DEFAULT 0
                )
            """)
            
            # Add new columns to existing table if they don't exist
            cursor.execute("PRAGMA table_info(versions)")
            columns = {col[1] for col in cursor.fetchall()}
            
            if "file_path" not in columns:
                cursor.execute("ALTER TABLE versions ADD COLUMN file_path TEXT")
            if "file_name" not in columns:
                cursor.execute("ALTER TABLE versions ADD COLUMN file_name TEXT")
            if "uploaded_at" not in columns:
                cursor.execute("ALTER TABLE versions ADD COLUMN uploaded_at TEXT")
            if "is_published" not in columns:
                cursor.execute("ALTER TABLE versions ADD COLUMN is_published INTEGER DEFAULT 0")
            if "download_count" not in columns:
                cursor.execute("ALTER TABLE versions ADD COLUMN download_count INTEGER DEFAULT 0")

            # Page visit analytics
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS page_visits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    page TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    user_agent TEXT,
                    referrer TEXT
                )
            """)

            # Download event tracking
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS download_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version TEXT,
                    timestamp TEXT NOT NULL,
                    user_agent TEXT,
                    referrer TEXT,
                    source TEXT
                )
            """)

            conn.commit()
            conn.close()

    def _hash_password(self, password: str) -> str:
        """Hash password using SHA-256."""
        return hashlib.sha256(password.encode()).hexdigest()

    # Admin authentication methods
    def create_admin_user(self, username: str, password: str) -> bool:
        """Create an admin user. Returns True if successful."""
        try:
            with self._lock:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                password_hash = self._hash_password(password)
                cursor.execute(
                    """
                    INSERT INTO admin_users (username, password_hash, created_at)
                    VALUES (?, ?, ?)
                    """,
                    (username, password_hash, datetime.utcnow().isoformat()),
                )
                conn.commit()
                conn.close()
            return True
        except sqlite3.IntegrityError:
            return False

    def verify_admin_user(self, username: str, password: str) -> bool:
        """Verify admin credentials."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            password_hash = self._hash_password(password)
            cursor.execute(
                "SELECT id FROM admin_users WHERE username = ? AND password_hash = ?",
                (username, password_hash),
            )
            result = cursor.fetchone()
            conn.close()
        return result is not None

    # Version management methods
    def create_version(
        self,
        version: str,
        release_date: str,
        download_url: str,
        file_size: Optional[int] = None,
        changelog: Optional[str] = None,
        status: str = "stable",
        is_latest: bool = False,
    ) -> bool:
        """Create a new version. Returns True if successful."""
        try:
            with self._lock:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()

                # If marking as latest, unmark previous latest
                if is_latest:
                    cursor.execute("UPDATE versions SET is_latest = 0")

                cursor.execute(
                    """
                    INSERT INTO versions
                    (version, release_date, status, download_url, file_size, changelog, is_latest, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        version,
                        release_date,
                        status,
                        download_url,
                        file_size,
                        changelog,
                        1 if is_latest else 0,
                        datetime.utcnow().isoformat(),
                    ),
                )
                conn.commit()
                conn.close()
            return True
        except sqlite3.IntegrityError:
            return False

    def get_latest_version(self) -> dict | None:
        """Get the latest version."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT version, release_date, status, download_url, file_size, changelog, created_at
                FROM versions
                WHERE is_latest = 1
                ORDER BY created_at DESC
                LIMIT 1
                """
            )
            row = cursor.fetchone()
            conn.close()

        if row:
            return {
                "version": row[0],
                "release_date": row[1],
                "status": row[2],
                "download_url": row[3],
                "file_size": row[4],
                "changelog": row[5],
                "created_at": row[6],
            }
        return None

    def get_all_versions(self) -> list[dict]:
        """Get all versions, sorted by release date (newest first)."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT version, release_date, status, download_url, file_size, changelog, created_at
                FROM versions
                ORDER BY release_date DESC
                """
            )
            rows = cursor.fetchall()
            conn.close()

        return [
            {
                "version": row[0],
                "release_date": row[1],
                "status": row[2],
                "download_url": row[3],
                "file_size": row[4],
                "changelog": row[5],
                "created_at": row[6],
            }
            for row in rows
        ]

    def update_version(
        self,
        version: str,
        release_date: Optional[str] = None,
        download_url: Optional[str] = None,
        file_size: Optional[int] = None,
        changelog: Optional[str] = None,
        status: Optional[str] = None,
        is_latest: bool = False,
    ) -> bool:
        """Update a version. Returns True if successful."""
        try:
            with self._lock:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()

                # Build update query dynamically
                updates = []
                params = []
                if release_date is not None:
                    updates.append("release_date = ?")
                    params.append(release_date)
                if download_url is not None:
                    updates.append("download_url = ?")
                    params.append(download_url)
                if file_size is not None:
                    updates.append("file_size = ?")
                    params.append(file_size)
                if changelog is not None:
                    updates.append("changelog = ?")
                    params.append(changelog)
                if status is not None:
                    updates.append("status = ?")
                    params.append(status)

                if is_latest:
                    cursor.execute("UPDATE versions SET is_latest = 0")
                    updates.append("is_latest = ?")
                    params.append(1)
                    
                params.append(version)
                cursor.execute(f"UPDATE versions SET {', '.join(updates)} WHERE version = ?", params)
                conn.commit()
                conn.close()
            return True
        except Exception:
            return False

    # Analytics tracking methods
    def record_page_visit(
        self, page: str, user_agent: Optional[str] = None, referrer: Optional[str] = None
    ) -> None:
        """Record a page visit."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO page_visits (page, timestamp, user_agent, referrer)
                VALUES (?, ?, ?, ?)
                """,
                (page, datetime.utcnow().isoformat(), user_agent, referrer),
            )
            conn.commit()
            conn.close()

    def record_download_event(
        self,
        version: Optional[str] = None,
        user_agent: Optional[str] = None,
        referrer: Optional[str] = None,
        source: str = "direct",
    ) -> None:
        """Record a download event."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO download_events (version, timestamp, user_agent, referrer, source)
                VALUES (?, ?, ?, ?, ?)
                """,
                (version, datetime.utcnow().isoformat(), user_agent, referrer, source),
            )
            conn.commit()
            conn.close()

    def get_analytics_summary(self) -> dict:
        """Get analytics summary for the dashboard."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) FROM page_visits")
            total_visitors = cursor.fetchone()[0] or 0

            cursor.execute(
                "SELECT COUNT(DISTINCT COALESCE(user_agent, 'anonymous')) FROM page_visits"
            )
            unique_visitors = cursor.fetchone()[0] or 0

            cursor.execute("SELECT COUNT(*) FROM download_events")
            total_downloads = cursor.fetchone()[0] or 0

            cursor.execute(
                """
                SELECT version, COUNT(*) as count
                FROM download_events
                WHERE version IS NOT NULL
                GROUP BY version
                ORDER BY count DESC
                """
            )
            downloads_by_version = {row[0]: row[1] for row in cursor.fetchall()}

            cursor.execute(
                """
                SELECT version FROM versions WHERE is_latest = 1
                ORDER BY created_at DESC
                LIMIT 1
                """
            )
            latest_row = cursor.fetchone()
            latest_version = latest_row[0] if latest_row else None

            conn.close()

        conversion_rate = (
            (total_downloads / total_visitors * 100) if total_visitors > 0 else 0
        )

        return {
            "total_visitors": total_visitors,
            "unique_visitors": unique_visitors,
            "total_downloads": total_downloads,
            "downloads_by_version": downloads_by_version,
            "conversion_rate": round(conversion_rate, 1),
            "latest_version": latest_version,
        }

    def get_visitor_trends(self, days: int = 30) -> list[dict]:
        """Get visitor trends for the last N days."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT DATE(timestamp), COUNT(*) as visits
                FROM page_visits
                WHERE timestamp > datetime('now', '-' || ? || ' days')
                GROUP BY DATE(timestamp)
                ORDER BY DATE(timestamp) ASC
                """,
                (days,),
            )
            rows = cursor.fetchall()
            conn.close()

        return [{"date": row[0], "visits": row[1]} for row in rows]

    def get_download_trends(self, days: int = 30) -> list[dict]:
        """Get download trends for the last N days."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT DATE(timestamp), COUNT(*) as downloads
                FROM download_events
                WHERE timestamp > datetime('now', '-' || ? || ' days')
                GROUP BY DATE(timestamp)
                ORDER BY DATE(timestamp) ASC
                """,
                (days,),
            )
            rows = cursor.fetchall()
            conn.close()

        return [{"date": row[0], "downloads": row[1]} for row in rows]

    # File management methods
    def save_release_file(
        self,
        version: str,
        file_path: str,
        file_name: str,
        file_size: int,
    ) -> bool:
        """Save release file metadata. Returns True if successful."""
        try:
            with self._lock:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                download_url = f"/api/admin/releases/{version}/download"
                cursor.execute(
                    """
                    UPDATE versions
                    SET file_path = ?, file_name = ?, file_size = ?, uploaded_at = ?, download_url = ?
                    WHERE version = ?
                    """,
                    (file_path, file_name, file_size, datetime.utcnow().isoformat(), download_url, version),
                )
                conn.commit()
                conn.close()
            return True
        except Exception:
            return False

    def publish_release(self, version: str) -> bool:
        """Publish a release (make it available for download). Returns True if successful."""
        try:
            with self._lock:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE versions SET is_published = 1 WHERE version = ?",
                    (version,),
                )
                conn.commit()
                conn.close()
            return True
        except Exception:
            return False

    def unpublish_release(self, version: str) -> bool:
        """Unpublish a release. Returns True if successful."""
        try:
            with self._lock:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE versions SET is_published = 0 WHERE version = ?",
                    (version,),
                )
                conn.commit()
                conn.close()
            return True
        except Exception:
            return False

    def increment_download_count(self, version: str) -> bool:
        """Increment download count for a version. Returns True if successful."""
        try:
            with self._lock:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE versions SET download_count = download_count + 1 WHERE version = ?",
                    (version,),
                )
                conn.commit()
                conn.close()
            return True
        except Exception:
            return False

    def delete_release(self, version: str) -> bool:
        """Delete a release. Returns True if successful."""
        try:
            with self._lock:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute("DELETE FROM versions WHERE version = ?", (version,))
                conn.commit()
                conn.close()
            return True
        except Exception:
            return False

    def get_release_file_info(self, version: str) -> dict | None:
        """Get file information for a specific version."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT file_path, file_name, file_size, is_published, download_count, uploaded_at
                FROM versions
                WHERE version = ?
                """,
                (version,),
            )
            row = cursor.fetchone()
            conn.close()

        if row:
            return {
                "file_path": row[0],
                "file_name": row[1],
                "file_size": row[2],
                "is_published": bool(row[3]),
                "download_count": row[4],
                "uploaded_at": row[5],
            }
        return None

    def get_all_versions_with_files(self) -> list[dict]:
        """Get all versions with file information, sorted by release date (newest first)."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT version, release_date, status, download_url, file_size, changelog, created_at,
                       file_path, file_name, uploaded_at, is_published, download_count, is_latest
                FROM versions
                ORDER BY release_date DESC
                """
            )
            rows = cursor.fetchall()
            conn.close()

        return [
            {
                "version": row[0],
                "release_date": row[1],
                "status": row[2],
                "download_url": row[3],
                "file_size": row[4],
                "changelog": row[5],
                "created_at": row[6],
                "file_path": row[7],
                "file_name": row[8],
                "uploaded_at": row[9],
                "is_published": bool(row[10]),
                "download_count": row[11],
                "is_latest": bool(row[12]),
            }
            for row in rows
        ]
