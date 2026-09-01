"""Runtime, mutable application settings, persisted to a small JSON file."""
from __future__ import annotations

import json
import os
from pathlib import Path
from threading import Lock
from urllib.parse import urlsplit, urlunsplit

from dotenv import load_dotenv

from backend.models.schemas import ContainerPreference, SettingsModel
from backend.utils.system import default_download_dir, find_ffmpeg

# interpolate=False: bcrypt hashes and secrets contain `$` which dotenv would
# otherwise treat as variable expansion. Always load backend/.env by path so
# cwd (repo root vs backend/) does not change which file is read.
load_dotenv(Path(__file__).resolve().parent / ".env", interpolate=False, encoding="utf-8-sig")

_SETTINGS_FILE = Path(__file__).resolve().parent / "downloads" / "settings.json"


class AppSettingsStore:
    def __init__(self):
        self._lock = Lock()
        self._settings = self._load()

    def _load(self) -> SettingsModel:
        if _SETTINGS_FILE.exists():
            try:
                data = json.loads(_SETTINGS_FILE.read_text())
                return SettingsModel(**data)
            except Exception:  # noqa: BLE001
                pass
        env_dir = os.getenv("DOWNLOAD_DIR")
        return SettingsModel(
            download_dir=env_dir or str(default_download_dir()),
            default_quality="best",
            container=ContainerPreference.AUTO,
            concurrent_downloads=int(os.getenv("MAX_CONCURRENT_DOWNLOADS", "1")),
            theme="dark",
        )

    def get(self) -> SettingsModel:
        return self._settings

    def update(self, new_settings: SettingsModel) -> SettingsModel:
        with self._lock:
            self._settings = new_settings
            _SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
            _SETTINGS_FILE.write_text(self._settings.model_dump_json(indent=2))
        return self._settings

    @property
    def ffmpeg_path(self) -> str | None:
        return find_ffmpeg(os.getenv("FFMPEG_PATH") or None)

    @property
    def youtube_cookies_path(self) -> str | None:
        value = os.getenv("YOUTUBE_COOKIES_FILE")
        if not value:
            return None
        path = Path(value).expanduser()
        return str(path) if path.is_file() else None

    @property
    def db_path(self) -> str:
        return os.getenv("DB_PATH", str(Path(__file__).resolve().parent / "downloads" / "history.db"))

    @property
    def cors_origin(self) -> str:
        return os.getenv("CORS_ORIGIN", "http://localhost:5173")

    @property
    def cors_origins(self) -> list[str]:
        raw = os.getenv("CORS_ORIGINS") or self.cors_origin
        origins = []
        for value in raw.split(","):
            value = value.strip().strip('"\'')
            if not value:
                continue
            if "://" not in value:
                scheme = "http" if value.startswith(("localhost", "127.0.0.1")) else "https"
                value = f"{scheme}://{value}"
            parsed = urlsplit(value)
            origins.append(urlunsplit((parsed.scheme, parsed.netloc, "", "", "")))
        return origins


settings_store = AppSettingsStore()
