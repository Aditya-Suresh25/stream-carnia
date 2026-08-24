"""HTTP + WebSocket route handlers."""
from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

from backend.app_settings import settings_store
from backend.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    DownloadItem,
    DownloadRequest,
    SettingsModel,
)
from backend.services import ytdlp_service
from backend.services.download_manager import DownloadManager
from backend.services.ffmpeg_service import get_ffmpeg_status
from backend.services.history_store import HistoryStore
from backend.utils.system import staging_download_dir

logger = logging.getLogger("api")
router = APIRouter()

history_store = HistoryStore(settings_store.db_path)
download_manager = DownloadManager(
    download_dir_provider=lambda: settings_store.get().download_dir,
    ffmpeg_path_provider=lambda: settings_store.ffmpeg_path,
    container_provider=lambda: settings_store.get().container.value,
    history_store=history_store,
    max_workers=max(1, settings_store.get().concurrent_downloads),
)


@router.get("/health")
def health():
    ffmpeg = get_ffmpeg_status(settings_store.ffmpeg_path)
    import yt_dlp
    return {
        "status": "ok" if ffmpeg.installed else "degraded",
        "yt_dlp": True,
        "ffmpeg": ffmpeg.installed,
        "ffmpeg_installed": ffmpeg.installed,
        "ffmpeg_version": ffmpeg.version,
        "ytdlp_version": yt_dlp.version.__version__,
    }


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest):
    try:
        return ytdlp_service.analyze_url(payload.url, ffmpeg_path=settings_store.ffmpeg_path)
    except ytdlp_service.UnsupportedURLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/download", response_model=DownloadItem)
def start_download(payload: DownloadRequest):
    ffmpeg = get_ffmpeg_status(settings_store.ffmpeg_path)
    if not ffmpeg.installed:
        raise HTTPException(
            status_code=412,
            detail="FFmpeg is required for high-quality downloads. Install it and add it to PATH, "
                   "or place ffmpeg.exe in backend/bin/, then retry.",
        )
    try:
        item = download_manager.enqueue(
            url=payload.url,
            format_selector=payload.format_selector,
            quality_key=payload.format_key,
            title=payload.title or "Untitled",
            channel=payload.channel,
            format_label=payload.format_key,
            container=payload.container.value,
        )
        return item
    except ytdlp_service.UnsupportedURLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/download", response_model=list[DownloadItem])
def list_downloads():
    return download_manager.list_items()


@router.get("/download/{download_id}", response_model=DownloadItem)
def get_download(download_id: str):
    item = download_manager.get_item(download_id)
    if not item:
        raise HTTPException(status_code=404, detail="Download not found.")
    return item


@router.get("/download/{download_id}/file")
def download_file(download_id: str):
    item = download_manager.get_item(download_id)
    if not item:
        raise HTTPException(status_code=404, detail="Download not found.")
    if item.stage.value != "completed" or not item.file_path:
        raise HTTPException(status_code=409, detail="This download is not complete.")

    file_path = Path(item.file_path).resolve()
    staging_dir = staging_download_dir().resolve()
    if not file_path.is_relative_to(staging_dir) or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Downloaded file not found.")

    return FileResponse(file_path, filename=file_path.name, media_type="application/octet-stream")


@router.delete("/download/{download_id}")
def remove_download(download_id: str):
    removed = download_manager.remove(download_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Download not found.")
    return {"removed": True}


@router.post("/download/{download_id}/cancel")
def cancel_download(download_id: str):
    ok = download_manager.cancel(download_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Download not found.")
    return {"cancelled": True}


@router.get("/settings", response_model=SettingsModel)
def get_settings():
    return settings_store.get()


@router.put("/settings", response_model=SettingsModel)
def update_settings(payload: SettingsModel):
    return settings_store.update(payload)


@router.get("/history")
def get_history(limit: int = 50):
    return history_store.list_recent(limit=limit)


@router.delete("/history/{entry_id}")
def delete_history_entry(entry_id: str):
    history_store.remove(entry_id)
    return {"removed": True}


async def websocket_download_progress(websocket: WebSocket, download_id: str):
    await websocket.accept()
    download_manager.subscribe(download_id, websocket)
    try:
        item = download_manager.get_item(download_id)
        if item:
            await websocket.send_json(item.model_dump(mode="json"))
        while True:
            # Client doesn't need to send anything; keep the socket alive.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        download_manager.unsubscribe(download_id, websocket)
