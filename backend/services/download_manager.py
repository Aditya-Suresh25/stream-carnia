"""
In-process download queue/manager.

Runs downloads on a bounded thread pool (yt-dlp is blocking), tracks state
for each queued/active/completed item, and pushes progress to any WebSocket
subscribers for a given download id.
"""
from __future__ import annotations

import asyncio
import logging
import shutil
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import WebSocket

from backend.models.schemas import DownloadItem, DownloadStage, HistoryEntry
from backend.services import ytdlp_service
from backend.services.history_store import HistoryStore
from backend.utils.system import staging_download_dir

logger = logging.getLogger("download_manager")


@dataclass
class _ActiveDownload:
    item: DownloadItem
    cancel_requested: bool = False
    format_selector: str = ""
    container: str = "auto"


class DownloadManager:
    def __init__(
        self,
        download_dir_provider,
        ffmpeg_path_provider,
        container_provider,
        history_store: HistoryStore,
        max_workers: int = 1,
    ):
        self._download_dir_provider = download_dir_provider
        self._ffmpeg_path_provider = ffmpeg_path_provider
        self._container_provider = container_provider
        self._history = history_store
        self._items: dict[str, _ActiveDownload] = {}
        self._subscribers: dict[str, set[WebSocket]] = {}
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def list_items(self) -> list[DownloadItem]:
        return [d.item for d in self._items.values()]

    def get_item(self, download_id: str) -> Optional[DownloadItem]:
        active = self._items.get(download_id)
        return active.item if active else None

    def enqueue(
        self,
        url: str,
        format_selector: str,
        quality_key: str,
        title: str,
        channel: str | None,
        format_label: str,
        container: str,
    ) -> DownloadItem:
        download_id = str(uuid.uuid4())
        item = DownloadItem(
            id=download_id,
            url=url,
            title=title,
            channel=channel,
            format_label=format_label,
            stage=DownloadStage.QUEUED,
            percent=0.0,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        active = _ActiveDownload(item=item, format_selector=format_selector, container=container)
        self._items[download_id] = active
        self._executor.submit(self._run, download_id, quality_key)
        return item

    def cancel(self, download_id: str) -> bool:
        active = self._items.get(download_id)
        if not active:
            return False
        active.cancel_requested = True
        if active.item.stage in (DownloadStage.QUEUED, DownloadStage.ANALYZING,
                                   DownloadStage.DOWNLOADING_VIDEO, DownloadStage.DOWNLOADING_AUDIO):
            active.item.stage = DownloadStage.CANCELLED
            self._broadcast(download_id)
        return True

    def remove(self, download_id: str) -> bool:
        return self._items.pop(download_id, None) is not None

    def _run(self, download_id: str, quality_key: str) -> None:
        active = self._items[download_id]
        item = active.item

        def on_progress(update: dict) -> None:
            if active.cancel_requested:
                return
            for key, value in update.items():
                setattr(item, key, value)
            self._broadcast(download_id)

        try:
            output_dir = staging_download_dir() / download_id
            Path(output_dir).mkdir(parents=True, exist_ok=True)
            ffmpeg_path = self._ffmpeg_path_provider()

            item.stage = DownloadStage.DOWNLOADING_VIDEO
            self._broadcast(download_id)

            result = ytdlp_service.download_video(
                url=item.url,
                format_selector=active.format_selector,
                quality_key=quality_key,
                channel=item.channel,
                title_hint=item.title,
                output_dir=str(output_dir),
                container=active.container,
                ffmpeg_path=ffmpeg_path,
                on_progress=on_progress,
            )

            if active.cancel_requested:
                shutil.rmtree(output_dir, ignore_errors=True)
                item.stage = DownloadStage.CANCELLED
                self._broadcast(download_id)
                return

            item.file_path = result.get("file_path")
            item.stage = DownloadStage.COMPLETED
            item.percent = 100.0
            self._broadcast(download_id)

            self._history.upsert(HistoryEntry(
                id=item.id,
                title=item.title,
                url=item.url,
                quality=item.format_label,
                date=item.created_at,
                status="completed",
                file_path=item.file_path,
            ))
        except Exception as exc:  # noqa: BLE001
            shutil.rmtree(staging_download_dir() / download_id, ignore_errors=True)
            logger.exception("Download %s failed", download_id)
            item.stage = DownloadStage.FAILED
            item.error = str(exc)
            self._broadcast(download_id)
            self._history.upsert(HistoryEntry(
                id=item.id,
                title=item.title,
                url=item.url,
                quality=item.format_label,
                date=item.created_at,
                status="failed",
                file_path=None,
            ))

    # --- WebSocket plumbing -------------------------------------------------

    def subscribe(self, download_id: str, ws: WebSocket) -> None:
        self._subscribers.setdefault(download_id, set()).add(ws)

    def unsubscribe(self, download_id: str, ws: WebSocket) -> None:
        subs = self._subscribers.get(download_id)
        if subs:
            subs.discard(ws)

    def _broadcast(self, download_id: str) -> None:
        if not self._loop:
            return
        subs = self._subscribers.get(download_id)
        item = self._items[download_id].item
        payload = item.model_dump(mode="json")
        if subs:
            for ws in list(subs):
                asyncio.run_coroutine_threadsafe(self._safe_send(ws, payload), self._loop)
        # Always also push to an "all downloads" channel (id "*") for the queue view
        all_subs = self._subscribers.get("*")
        if all_subs:
            for ws in list(all_subs):
                asyncio.run_coroutine_threadsafe(self._safe_send(ws, payload), self._loop)

    @staticmethod
    async def _safe_send(ws: WebSocket, payload: dict) -> None:
        try:
            await ws.send_json(payload)
        except Exception:  # noqa: BLE001
            pass
