# StreamCarnia

StreamCarnia is a local-first video downloader for public or authorized
YouTube videos and livestream VODs. It preserves the highest available source
quality, including adaptive 1440p60 and 4K formats when offered.

## Production architecture

The Vite/React frontend can run on Vercel and the FastAPI backend can run on
Render. Set the frontend's public API and WebSocket origins to the Render
service; no secrets belong in `VITE_` variables.

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

## Environment variables

Copy `frontend/.env.example` for local overrides:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

For Vercel, set these to the Render service origins, for example
`https://streamcarnia-api.onrender.com` and
`wss://streamcarnia-api.onrender.com`. The frontend falls back to Vite's
local `/api` and `/ws` proxy when they are blank.

For the backend, set `CORS_ORIGINS` to a comma-separated list containing the
Vercel URL and any local development URL. `STAGING_DIR` is optional and
defaults to the operating system temporary directory. `PORT` is supplied by
Render.

## Authenticated YouTube videos

Some videos require an authenticated YouTube session. To enable authorized
access, export a Netscape-format cookies file from a browser account that has
permission to view the content, then configure the backend-only
`YOUTUBE_COOKIES_FILE` variable to its path. Never commit this file, put it in
the frontend, send it through the API, or paste its contents into logs.

For Render, add the file as a Secret File named
`/etc/secrets/youtube-cookies.txt` and set:

```env
YOUTUBE_COOKIES_FILE=/etc/secrets/youtube-cookies.txt
```

Redeploy after adding or rotating the secret. The health response reports only
whether a readable cookie file is configured. Cookies expire and should be
rotated; use an account dedicated to this service and revoke it if exposed.
This does not bypass DRM or access controls and does not guarantee access to
content the account is not authorized to view.

## Routes

| Route | View |
|---|---|
| `/` | StreamCarina landing page |
| `/download` | Video downloader |
| `/history` | Download history |
| `/settings` | Settings |
| `/*` | Themed not-found page |

Vercel uses `frontend/vercel.json` to serve `index.html` for direct SPA route
refreshes.

## Render deployment

Deploy the repository with the included `Dockerfile`. It installs Linux
FFmpeg, installs `backend/requirements.txt`, and starts:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

Set `CORS_ORIGINS=https://YOUR-APP.vercel.app` in Render. The backend's
`backend/bin/ffmpeg.exe` is used only on Windows; Linux uses `ffmpeg` from
PATH in the container. Render's filesystem is ephemeral, so completed files
are staged under `/tmp/StreamCarnia` and retained only temporarily. Stale job
directories older than 24 hours are removed on startup.

## Production download flow

The POST request creates an in-memory background job. yt-dlp downloads the
selected video/audio streams, FFmpeg muxes them without re-encoding, and the
browser retrieves the completed file through
`GET /api/download/{download_id}/file`. Files are not permanent storage and
may disappear when Render restarts or after staging cleanup.

## Known hosting limitations

Render's free or small instances can cold-start, run out of disk, throttle
CPU/network, or restart during long VOD downloads. The queue and WebSocket
state are in memory and are lost on a service restart. Large files consume
Render disk and outbound bandwidth, and the browser must finish receiving a
file before temporary cleanup can safely occur. For dependable long-running
or multi-GB downloads, use a persistent worker and object storage rather than
the current personal-use deployment.

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
