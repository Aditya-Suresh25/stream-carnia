"""System-level helpers: ffmpeg detection, default download directory, disk checks."""
import os
import platform
import shutil
import subprocess
import tempfile
from pathlib import Path


def default_download_dir() -> Path:
    """Return the default download directory (Downloads/YouTube Downloader)."""
    home = Path.home()
    return home / "Downloads" / "YouTube Downloader"


def staging_download_dir() -> Path:
    """Return the temporary directory used before the user saves a file."""
    return Path(tempfile.gettempdir()) / "YouTube Downloader" / "staging"


def find_ffmpeg(explicit_path: str | None = None) -> str | None:
    """Locate ffmpeg: explicit configured path, then bundled local exe, then PATH."""
    candidates: list[str] = []
    if explicit_path:
        candidates.append(explicit_path)

    exe_name = "ffmpeg.exe" if platform.system() == "Windows" else "ffmpeg"
    bundled = Path(__file__).resolve().parent.parent / "bin" / exe_name
    candidates.append(str(bundled))

    from_path = shutil.which("ffmpeg")
    if from_path:
        candidates.append(from_path)

    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
        if candidate and shutil.which(candidate):
            return candidate

    return None


def check_ffmpeg_version(ffmpeg_path: str) -> str | None:
    try:
        result = subprocess.run(
            [ffmpeg_path, "-version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        first_line = result.stdout.splitlines()[0] if result.stdout else ""
        return first_line.replace("ffmpeg version ", "").split(" ")[0] or None
    except Exception:
        return None


def has_enough_disk_space(directory: Path, minimum_bytes: int = 200 * 1024 * 1024) -> bool:
    try:
        directory.mkdir(parents=True, exist_ok=True)
        usage = shutil.disk_usage(directory)
        return usage.free > minimum_bytes
    except OSError:
        return False


def ensure_within_directory(base_dir: Path, target_path: Path) -> bool:
    """Guard against path traversal: target must resolve inside base_dir."""
    try:
        base_resolved = base_dir.resolve()
        target_resolved = target_path.resolve()
        return target_resolved.is_relative_to(base_resolved)
    except (OSError, ValueError):
        return False
