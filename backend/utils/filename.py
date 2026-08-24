"""Filename sanitization helpers for safe, cross-platform (esp. Windows) filenames."""
import re

ILLEGAL_WINDOWS_CHARS = r'<>:"/\\|?*'
_ILLEGAL_RE = re.compile(f"[{re.escape(ILLEGAL_WINDOWS_CHARS)}\x00-\x1f]")
_RESERVED_NAMES = {
    "CON", "PRN", "AUX", "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
}
MAX_FILENAME_LENGTH = 150  # leaves headroom for extension + Windows MAX_PATH concerns


def sanitize_filename(name: str) -> str:
    """Strip illegal characters, collapse whitespace, and cap length for Windows safety."""
    if not name:
        return "download"

    cleaned = _ILLEGAL_RE.sub("", name)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .")

    if not cleaned:
        cleaned = "download"

    stem = cleaned.split(".")[0].upper()
    if stem in _RESERVED_NAMES:
        cleaned = f"_{cleaned}"

    if len(cleaned) > MAX_FILENAME_LENGTH:
        cleaned = cleaned[:MAX_FILENAME_LENGTH].rstrip(" .")

    return cleaned or "download"


def build_output_template(channel: str | None, title: str, quality_tag: str) -> str:
    """Build the 'Channel - Title [quality].ext' base name (without extension)."""
    channel_part = sanitize_filename(channel) if channel else None
    title_part = sanitize_filename(title)
    tag_part = f"[{quality_tag}]" if quality_tag else ""

    if channel_part:
        base = f"{channel_part} - {title_part} {tag_part}".strip()
    else:
        base = f"{title_part} {tag_part}".strip()

    if len(base) > MAX_FILENAME_LENGTH:
        overflow = len(base) - MAX_FILENAME_LENGTH
        title_part = title_part[: max(10, len(title_part) - overflow)].rstrip()
        if channel_part:
            base = f"{channel_part} - {title_part} {tag_part}".strip()
        else:
            base = f"{title_part} {tag_part}".strip()

    return base
