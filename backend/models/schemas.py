"""Pydantic models shared across the backend."""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class DownloadStage(str, Enum):
    QUEUED = "queued"
    ANALYZING = "analyzing"
    DOWNLOADING_VIDEO = "downloading_video"
    DOWNLOADING_AUDIO = "downloading_audio"
    MERGING = "merging"
    FINALIZING = "finalizing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ContainerPreference(str, Enum):
    AUTO = "auto"
    MP4 = "mp4"
    MKV = "mkv"
    WEBM = "webm"


class AnalyzeRequest(BaseModel):
    url: str = Field(..., min_length=1)

    @field_validator("url")
    @classmethod
    def strip_url(cls, v: str) -> str:
        return v.strip()


class FormatOption(BaseModel):
    """A selectable quality option built from one or more raw yt-dlp formats."""

    key: str
    label: str
    sublabel: str
    height: Optional[int] = None
    fps: Optional[float] = None
    vcodec: Optional[str] = None
    acodec: Optional[str] = None
    is_hdr: bool = False
    is_audio_only: bool = False
    approx_filesize: Optional[int] = None
    format_selector: str
    recommended: bool = False


class AnalyzeResponse(BaseModel):
    title: str
    channel: Optional[str] = None
    duration: Optional[int] = None
    thumbnail: Optional[str] = None
    is_live: bool = False
    is_upcoming: bool = False
    was_live: bool = False
    upload_date: Optional[str] = None
    formats: list[FormatOption]
    webpage_url: str


class DownloadRequest(BaseModel):
    url: str
    format_key: str
    format_selector: str
    title: Optional[str] = None
    channel: Optional[str] = None
    container: ContainerPreference = ContainerPreference.AUTO


class ProgressPayload(BaseModel):
    download_id: str
    stage: DownloadStage
    percent: float = 0.0
    speed_bytes_s: Optional[float] = None
    downloaded_bytes: Optional[int] = None
    total_bytes: Optional[int] = None
    eta_seconds: Optional[int] = None
    message: Optional[str] = None


class DownloadItem(BaseModel):
    id: str
    url: str
    title: str
    channel: Optional[str] = None
    format_label: str
    stage: DownloadStage
    percent: float = 0.0
    speed_bytes_s: Optional[float] = None
    downloaded_bytes: Optional[int] = None
    total_bytes: Optional[int] = None
    eta_seconds: Optional[int] = None
    message: Optional[str] = None
    error: Optional[str] = None
    file_path: Optional[str] = None
    created_at: str


class SettingsModel(BaseModel):
    download_dir: str
    default_quality: str = "best"
    container: ContainerPreference = ContainerPreference.AUTO
    concurrent_downloads: int = 1
    theme: str = "dark"


class HistoryEntry(BaseModel):
    id: str
    title: str
    url: str
    quality: str
    date: str
    status: str
    file_path: Optional[str] = None
