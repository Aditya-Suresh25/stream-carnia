# YouTube Downloader

A local desktop utility for downloading YouTube videos and livestream VODs in
their **original/highest available quality** (up to 4K60), built on top of
[yt-dlp](https://github.com/yt-dlp/yt-dlp) and FFmpeg. React + Vite frontend,
Python + FastAPI backend.

> **Legal note:** Only download content you own or have permission to
> download, and comply with YouTube's Terms of Service and applicable law.
> This tool does not bypass DRM or any access controls — it only downloads
> what yt-dlp can already retrieve for a public/authorized video.

---

## Features

- Paste a YouTube URL → analyze → pick a quality → download, with real
  progress (speed, ETA, downloaded/total size) over a WebSocket.
- Quality list is built from the video's **actual available formats**, not a
  hardcoded list — including 1440p60, 2160p60/4K60, and HDR when present.
- Video-only + audio-only adaptive streams are combined automatically via
  FFmpeg; a "Best Quality" option defers to yt-dlp's own best-stream logic.
- Supports regular videos, livestream VODs, and long recordings.
- Download queue with cancel / retry / remove, and a small download history.
- Clean, sanitized filenames: `Channel Name - Video Title [1440p60].mp4`,
  safe for Windows.
- Settings for download folder, default quality, container preference
  (Auto/MP4/MKV/WebM), and concurrent downloads.
- Friendly error messages — no raw Python tracebacks in the UI (full details
  go to `backend/logs/app.log`).

## Screenshots

_(Add screenshots of the home screen, video info card, and download queue
here once you've run the app.)_

---

## Requirements

- **Python 3.10+**
- **Node.js 18+**
- **FFmpeg** — either on your system `PATH`, or dropped as `ffmpeg.exe`
  into `backend/bin/`. The app checks for FFmpeg on startup and shows its
  status in the header.

On Windows, the easiest way to get FFmpeg is `winget install ffmpeg` or
downloading a build from https://www.gyan.dev/ffmpeg/builds/ and adding the
`bin` folder to your PATH.

---

## Installation

```bash
git clone <this-repo>
cd ytdl
```

### Backend

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux, for development
pip install -r backend/requirements.txt
copy backend\.env.example backend\.env   # Windows
# cp backend/.env.example backend/.env   # macOS/Linux
```

Edit `backend/.env` if you want a non-default download folder or ffmpeg
path.

### Frontend

```bash
cd frontend
npm install
```

---

## Running

Open two terminals.

**Terminal 1 — backend:**

```bash
venv\Scripts\activate
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser. The Vite dev server
proxies `/api` and `/ws` to the backend on port 8000, so no extra CORS
configuration is needed in development.

---

## Project structure

```
backend/
├── main.py                  # FastAPI app, logging, CORS, WebSocket route
├── app_settings.py          # Persisted app settings (download dir, etc.)
├── api/
│   └── routes.py            # All REST endpoints + WS handler
├── services/
│   ├── ytdlp_service.py     # yt-dlp integration: analyze, format ranking,
│   │                        #   selector building, download + progress hooks
│   ├── ffmpeg_service.py    # FFmpeg detection/version check
│   ├── download_manager.py  # In-process queue, thread pool, WS broadcast
│   └── history_store.py     # SQLite-backed download history
├── models/
│   └── schemas.py           # Pydantic request/response models
├── utils/
│   ├── filename.py          # Windows-safe filename sanitization
│   └── system.py            # ffmpeg lookup, disk space, default dirs
├── downloads/                # Default local output + settings.json + history.db
├── logs/                     # app.log (rotating)
└── requirements.txt

frontend/
├── src/
│   ├── components/           # UrlInput, VideoInfo, QualitySelector,
│   │                         #   DownloadCard, DownloadQueue, Settings, ...
│   ├── pages/Home.jsx
│   ├── services/api.js       # REST client + WS URL helper
│   ├── hooks/useDownloadProgress.js
│   ├── App.jsx / main.jsx
├── tailwind.config.js
├── vite.config.js
└── package.json
```

---

## API overview

| Method | Path                          | Purpose                          |
|--------|--------------------------------|-----------------------------------|
| GET    | `/api/health`                  | FFmpeg/yt-dlp status              |
| POST   | `/api/analyze`                 | Fetch metadata + quality options  |
| POST   | `/api/download`                | Queue a download                  |
| GET    | `/api/download`                | List all queue items              |
| GET    | `/api/download/{id}`           | Get one item's state              |
| DELETE | `/api/download/{id}`           | Remove a finished/failed item     |
| POST   | `/api/download/{id}/cancel`    | Cancel an active/queued download  |
| GET    | `/api/settings`                | Read settings                     |
| PUT    | `/api/settings`                | Update settings                   |
| GET    | `/api/history`                 | Download history                  |
| DELETE | `/api/history/{id}`            | Remove a history entry            |
| WS     | `/ws/download/{id}`            | Live progress for one download    |

---

## How quality selection works

yt-dlp exposes every available stream for a video (progressive, video-only,
audio-only, at every resolution/fps/codec YouTube offers). On analyze, the
backend groups video-only streams by `(height, fps, HDR)`, keeps the
highest-bitrate representative of each group, and ranks them by resolution
first, then FPS — so `1440p60` always ranks above `1440p30`, which ranks
above `1080p60`. Selecting `1440p60` builds a selector like
`308+bestaudio/308`, which tells yt-dlp to grab that specific video stream
plus the best matching audio and mux them together with FFmpeg. "Best
Quality" instead uses yt-dlp's own `bestvideo*+bestaudio/best` logic
directly.

FFmpeg is used for **muxing**, not re-encoding — the source video/audio
quality is preserved. Output container is MP4 when the codecs allow it,
falling back to MKV/WebM automatically when they don't (or per your
Settings preference).

---

## Troubleshooting

- **"FFmpeg is required for high-quality downloads"** — install FFmpeg and
  make sure it's on PATH, or place `ffmpeg.exe` in `backend/bin/`, then
  restart the backend.
- **"Unable to access this video"** — the video may require YouTube
  sign-in/verification, be private, or be age-restricted; yt-dlp can't
  retrieve those without authentication, which this tool doesn't provide.
- **Downloads are slow / stalled** — check `backend/logs/app.log` for the
  underlying yt-dlp error; YouTube occasionally rate-limits aggressive
  downloading.
- **yt-dlp extraction breaks after a YouTube change** — YouTube updates its
  site frequently; update yt-dlp:
  ```bash
  pip install -U yt-dlp
  ```

## yt-dlp information

Check the installed version any time via `GET /api/health`
(`ytdlp_version`). Keep it current — YouTube extraction logic changes
often enough that an outdated yt-dlp is the most common cause of failures.

## Limitations

- Pause isn't implemented (yt-dlp doesn't support a reliable pause/resume
  mid-stream for a single format download); use Cancel + Retry instead,
  which restarts the download (yt-dlp's `--continue` behavior will resume
  a partially-written file where the file system allows it).
- Age-restricted, private, or sign-in-gated videos aren't supported, since
  this tool doesn't handle YouTube authentication/cookies.
- Native "Browse folder" isn't available in a browser-based UI — paste the
  full folder path in Settings instead.

## Legal / usage note

Use this tool only for content you have the right to download. Respect
YouTube's Terms of Service, applicable copyright law, and any
platform/content-owner restrictions. This project simply automates a
tool (yt-dlp) that only retrieves streams YouTube already serves to your
browser; it does not defeat DRM or other access controls.
