"""FFmpeg availability checks."""
from dataclasses import dataclass

from backend.utils.system import check_ffmpeg_version, find_ffmpeg


@dataclass
class FfmpegStatus:
    installed: bool
    path: str | None
    version: str | None


def get_ffmpeg_status(explicit_path: str | None = None) -> FfmpegStatus:
    path = find_ffmpeg(explicit_path)
    if not path:
        return FfmpegStatus(installed=False, path=None, version=None)
    version = check_ffmpeg_version(path)
    return FfmpegStatus(installed=True, path=path, version=version)
