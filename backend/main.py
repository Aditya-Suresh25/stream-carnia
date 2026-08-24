"""FastAPI application entrypoint."""
from __future__ import annotations

import logging
import platform
from logging.handlers import RotatingFileHandler
from pathlib import Path

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router, websocket_download_progress, download_manager
from backend.app_settings import settings_store
from backend.services.ffmpeg_service import get_ffmpeg_status
from backend.utils.system import cleanup_staging

LOG_DIR = Path(__file__).resolve().parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[
        RotatingFileHandler(LOG_DIR / "app.log", maxBytes=2_000_000, backupCount=3),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("main")

app = FastAPI(title="YouTube Downloader API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings_store.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.on_event("startup")
async def on_startup():
    import asyncio
    download_manager.bind_loop(asyncio.get_event_loop())
    removed = cleanup_staging()
    ffmpeg = get_ffmpeg_status(settings_store.ffmpeg_path)
    import yt_dlp
    logger.info(
        "StreamCarina backend started on %s; yt-dlp=%s, ffmpeg=%s, cors=%s, removed %d stale staging job(s).",
        platform.system(), yt_dlp.version.__version__, ffmpeg.version or "unavailable",
        settings_store.cors_origins, removed,
    )


@app.websocket("/ws/download/{download_id}")
async def ws_download_progress(websocket: WebSocket, download_id: str):
    await websocket_download_progress(websocket, download_id)
