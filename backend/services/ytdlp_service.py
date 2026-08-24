"""
Core yt-dlp integration.

Responsible for:
 - Extracting metadata/formats for a URL ("analyze")
 - Turning raw yt-dlp formats into a clean, ranked list of user-facing
   quality options (grouping video-only streams with the best matching audio)
 - Building the actual yt-dlp format selector string for a chosen quality
 - Running the download with progress hooks, reporting back to a callback
"""
from __future__ import annotations

import logging
import re
from typing import Any, Callable, Optional

import yt_dlp

from backend.models.schemas import AnalyzeResponse, DownloadStage, FormatOption
from backend.utils.filename import build_output_template

logger = logging.getLogger("ytdlp_service")

ProgressCallback = Callable[[dict[str, Any]], None]

YOUTUBE_URL_RE = re.compile(
    r"^(https?://)?(www\.)?(m\.)?(youtube\.com/(watch\?v=|live/|shorts/)|youtu\.be/)",
    re.IGNORECASE,
)


class UnsupportedURLError(ValueError):
    pass


def validate_youtube_url(url: str) -> str:
    url = url.strip()
    if not YOUTUBE_URL_RE.match(url):
        raise UnsupportedURLError(
            "That doesn't look like a supported YouTube URL. "
            "Use a youtube.com/watch, youtube.com/live, or youtu.be link."
        )
    return url


def _base_ydl_opts(ffmpeg_path: str | None, cookies_path: str | None = None) -> dict[str, Any]:
    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "nocheckcertificate": False,
        "retries": 5,
        "fragment_retries": 5,
        "socket_timeout": 30,
    }
    if ffmpeg_path:
        opts["ffmpeg_location"] = ffmpeg_path
    if cookies_path:
        opts["cookiefile"] = cookies_path
    return opts


def _friendly_error(exc: Exception) -> str:
    text = str(exc)
    lower = text.lower()
    if "sign in" in lower or "confirm you're not a bot" in lower or "cookies" in lower:
        return (
            "Unable to access this video. YouTube may require sign-in/verification "
            "for this content, so it isn't downloadable this way."
        )
    if "private video" in lower:
        return "This video is private and can't be downloaded."
    if "age" in lower and "restrict" in lower:
        return "This video is age-restricted and requires authentication to access."
    if "video unavailable" in lower or "has been removed" in lower:
        return "This video is unavailable or has been removed."
    if "unsupported url" in lower:
        return "This URL isn't a supported YouTube link."
    if "429" in text or "too many requests" in lower:
        return "YouTube is rate-limiting requests right now. Wait a bit and try again."
    if "network" in lower or "timed out" in lower or "connection" in lower:
        return "A network error occurred while contacting YouTube. Check your connection and retry."
    return "Something went wrong while processing this video. See the server log for details."


def _fmt_codec(codec: str | None) -> str | None:
    if not codec or codec == "none":
        return None
    return codec.split(".")[0]


def _is_hdr(fmt: dict[str, Any]) -> bool:
    dr = (fmt.get("dynamic_range") or "").upper()
    return dr not in ("", "SDR", "NONE")


def build_format_options(info: dict[str, Any]) -> list[FormatOption]:
    """
    Convert yt-dlp's raw `formats` list into a clean, ranked set of
    user-facing quality choices, grouped by (height, fps, hdr).

    Video-only formats get paired against the best audio at selection time
    via a format *selector string* (e.g. "137+bestaudio/best"), rather than
    us guessing a fixed audio format id.
    """
    raw_formats: list[dict[str, Any]] = info.get("formats") or []

    video_formats = [
        f for f in raw_formats
        if f.get("vcodec") not in (None, "none") and f.get("height")
    ]
    has_audio_stream = any(
        f.get("acodec") not in (None, "none") and f.get("vcodec") in (None, "none")
        for f in raw_formats
    )

    # Group by (height, fps rounded, hdr) keeping the best-bitrate representative
    groups: dict[tuple, dict[str, Any]] = {}
    for f in video_formats:
        height = f.get("height")
        fps = round(f.get("fps") or 0)
        hdr = _is_hdr(f)
        key = (height, fps, hdr)
        existing = groups.get(key)
        this_bitrate = (f.get("tbr") or f.get("vbr") or 0)
        if existing is None or this_bitrate > (existing.get("tbr") or existing.get("vbr") or 0):
            groups[key] = f

    ranked_keys = sorted(
        groups.keys(),
        key=lambda k: (k[0] or 0, k[1] or 0, k[2]),
        reverse=True,
    )

    options: list[FormatOption] = []

    # "Best / Original Quality" — let yt-dlp's own best-quality logic pick.
    options.append(
        FormatOption(
            key="best",
            label="Best Quality",
            sublabel="Original source quality (video + audio combined)",
            format_selector="bestvideo*+bestaudio/best",
            recommended=True,
        )
    )

    audio_selector = "bestaudio" if has_audio_stream else "bestaudio/best"

    for idx, key in enumerate(ranked_keys):
        height, fps, hdr = key
        f = groups[key]
        vcodec = _fmt_codec(f.get("vcodec"))
        format_id = f.get("format_id")

        fps_label = f" {fps} FPS" if fps and fps > 30 else ("" if not fps else "")
        # Only show FPS explicitly when it's notable (>=48) to avoid clutter at 24/25/30
        show_fps = fps and fps >= 48
        label = f"{height}p" + (f" {fps} FPS" if show_fps else "")
        if hdr:
            label += " HDR"

        sub_parts = []
        if f.get("width") and height:
            sub_parts.append(f"{f['width']} x {height}")
        if fps:
            sub_parts.append(f"{round(fps)} FPS")
        if vcodec:
            sub_parts.append(vcodec.upper())
        sublabel = " . ".join(sub_parts)

        selector = f"{format_id}+{audio_selector}/{format_id}"

        options.append(
            FormatOption(
                key=f"{height}p{round(fps) if show_fps else ''}"
                    + ("hdr" if hdr else "") + f"_{format_id}",
                label=label,
                sublabel=sublabel,
                height=height,
                fps=fps or None,
                vcodec=vcodec,
                acodec=None,
                is_hdr=hdr,
                approx_filesize=f.get("filesize") or f.get("filesize_approx"),
                format_selector=selector,
                recommended=False,
            )
        )

    # Audio only
    options.append(
        FormatOption(
            key="audio_only",
            label="Audio Only",
            sublabel="Best available audio track",
            is_audio_only=True,
            acodec=None,
            format_selector="bestaudio/best",
            recommended=False,
        )
    )

    return options


def analyze_url(
    url: str,
    ffmpeg_path: str | None = None,
    cookies_path: str | None = None,
) -> AnalyzeResponse:
    url = validate_youtube_url(url)
    opts = _base_ydl_opts(ffmpeg_path, cookies_path)

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as exc:
        logger.error("analyze_url failed for %s: %s", url, exc)
        raise RuntimeError(_friendly_error(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected analyze_url failure for %s", url)
        raise RuntimeError(_friendly_error(exc)) from exc

    if info is None:
        raise RuntimeError("Could not retrieve information for this URL.")

    formats = build_format_options(info)

    return AnalyzeResponse(
        title=info.get("title") or "Untitled",
        channel=info.get("channel") or info.get("uploader"),
        duration=info.get("duration"),
        thumbnail=info.get("thumbnail"),
        is_live=bool(info.get("is_live")),
        is_upcoming=info.get("live_status") == "is_upcoming",
        was_live=bool(info.get("was_live")) or info.get("live_status") == "was_live",
        upload_date=info.get("upload_date"),
        formats=formats,
        webpage_url=info.get("webpage_url") or url,
    )


def _quality_tag_from_selector_key(key: str) -> str:
    if key == "best":
        return "best"
    if key == "audio_only":
        return "audio"
    return re.sub(r"_[\w-]+$", "", key)  # strip trailing "_<format_id>"


def download_video(
    url: str,
    format_selector: str,
    quality_key: str,
    channel: str | None,
    title_hint: str | None,
    output_dir: str,
    container: str,
    ffmpeg_path: str | None,
    cookies_path: str | None,
    on_progress: ProgressCallback,
) -> dict[str, Any]:
    """
    Runs a blocking yt-dlp download (intended to be called from a worker thread).
    Returns a dict with the final file path and metadata on success.
    Raises RuntimeError with a friendly message on failure.
    """
    url = validate_youtube_url(url)
    quality_tag = _quality_tag_from_selector_key(quality_key)

    merge_format = None if container == "auto" else container

    def outtmpl_provider(info_dict: dict[str, Any]) -> str:
        title = info_dict.get("title") or title_hint or "video"
        chan = info_dict.get("channel") or info_dict.get("uploader") or channel
        base = build_output_template(chan, title, quality_tag)
        return base

    last_percent = {"value": -1.0}

    def hook(d: dict[str, Any]) -> None:
        status = d.get("status")
        if status == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            downloaded = d.get("downloaded_bytes") or 0
            percent = (downloaded / total * 100) if total else 0.0
            if abs(percent - last_percent["value"]) < 0.3 and status == "downloading":
                return
            last_percent["value"] = percent

            info_dict = d.get("info_dict") or {}
            is_audio_stage = (
                info_dict.get("vcodec") in (None, "none")
                and info_dict.get("acodec") not in (None, "none")
            )
            stage = DownloadStage.DOWNLOADING_AUDIO if is_audio_stage else DownloadStage.DOWNLOADING_VIDEO

            on_progress({
                "stage": stage,
                "percent": round(percent, 1),
                "speed_bytes_s": d.get("speed"),
                "downloaded_bytes": downloaded,
                "total_bytes": total,
                "eta_seconds": d.get("eta"),
            })
        elif status == "finished":
            on_progress({
                "stage": DownloadStage.MERGING,
                "percent": 99.0,
                "message": "Download finished, finalizing file...",
            })
        elif status == "error":
            on_progress({
                "stage": DownloadStage.FAILED,
                "percent": last_percent["value"] if last_percent["value"] > 0 else 0.0,
                "message": "yt-dlp reported an error during download.",
            })

    def postprocessor_hook(d: dict[str, Any]) -> None:
        if d.get("status") == "started":
            pp = d.get("postprocessor", "")
            if "Merger" in pp:
                on_progress({"stage": DownloadStage.MERGING, "percent": 99.0})
            else:
                on_progress({"stage": DownloadStage.FINALIZING, "percent": 99.5})

    opts: dict[str, Any] = {
        **_base_ydl_opts(ffmpeg_path, cookies_path),
        "format": format_selector,
        "outtmpl": {"default": f"{output_dir}/%(_custom_base)s.%(ext)s"},
        "progress_hooks": [hook],
        "postprocessor_hooks": [postprocessor_hook],
        "continuedl": True,
        "windowsfilenames": True,
        "restrictfilenames": False,
        "merge_output_format": merge_format,
        "writeinfojson": False,
        "writethumbnail": False,
        "quiet": True,
        "no_warnings": True,
    }

    def prepare_filename_field(info_dict: dict[str, Any]) -> None:
        info_dict["_custom_base"] = outtmpl_provider(info_dict)

    opts["postprocessor_args"] = {}

    final_path: dict[str, Optional[str]] = {"path": None}

    def _hook_wraps_final_path(d: dict[str, Any]) -> None:
        if d.get("status") == "finished":
            fp = d.get("info_dict", {}).get("filepath") or d.get("filename")
            if fp:
                final_path["path"] = fp

    opts["progress_hooks"].append(_hook_wraps_final_path)

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            # Inject our sanitized "Channel - Title [quality]" base name into the
            # info dict right before yt-dlp resolves the output template, so the
            # %(_custom_base)s field in `outtmpl` above has something to expand.
            original_process = ydl.process_video_result

            def patched(info_dict, download=True):
                prepare_filename_field(info_dict)
                return original_process(info_dict, download=download)

            ydl.process_video_result = patched  # type: ignore[method-assign]

            info = ydl.extract_info(url, download=True)
            requested_downloads = (info or {}).get("requested_downloads") or []
            if requested_downloads:
                final_path["path"] = requested_downloads[-1].get("filepath")
            elif not final_path["path"]:
                final_path["path"] = ydl.prepare_filename(info)

    except yt_dlp.utils.DownloadError as exc:
        logger.error("download_video failed for %s: %s", url, exc)
        raise RuntimeError(_friendly_error(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected download_video failure for %s", url)
        raise RuntimeError(_friendly_error(exc)) from exc

    on_progress({"stage": DownloadStage.COMPLETED, "percent": 100.0})
    return {"file_path": final_path["path"]}
