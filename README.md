# StreamCarnia

StreamCarnia is the official software distribution site for the StreamCarnia
Windows application. It presents the product, publishes the latest installer,
and keeps a browsable history of releases.

## Production architecture

The Vite/React frontend can run on Vercel and the FastAPI backend can run on
Render. Set the frontend's public API and WebSocket origins to the Render
service; no secrets belong in `VITE_` variables.

React + Vite frontend with a Python + FastAPI release and analytics backend.

---

## Features

- A polished landing page for the Windows product.
- Latest-release download with download tracking.
- Complete version history with release notes, file sizes, and download counts.
- Responsive navigation with a mobile hamburger menu.
- Admin dashboard for publishing releases and viewing site analytics.

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
- A polished landing page for the Windows product.
- Latest-release download with download tracking.
- Complete version history with release notes, file sizes, and download counts.
- Responsive navigation with a mobile hamburger menu.
- Admin dashboard for publishing releases and viewing site analytics.
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
| `/download` | StreamCarnia software download |
| `/versions` | Version history and releases |
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

### Appwrite setup

Appwrite is used for persistent admin authentication, release metadata, and
ZIP storage when all `APPWRITE_*` variables are configured. In Appwrite:

1. Create a project and an admin user with an email/password account.
2. Create a database and a `releases` collection. Add these attributes:
  `version` (required string), `release_date` (required string), `status`
  (required string), `download_url` (string), `file_size` (integer),
  `changelog` (string), `is_latest` (boolean), `is_published` (boolean),
  `download_count` (integer), `file_id` (string), `file_name` (string), and
  `uploaded_at` (string).
3. Create a private storage bucket for ZIP files. Create a server API key with
  these scopes: `databases.read`, `databases.write`, `documents.read`,
  `documents.write`, `files.read`, and `files.write`. The missing
  `documents.read` scope produces a 401 from Appwrite. Do not expose this key
  to Vercel.
4. Add the Appwrite endpoint, project, API key, database, collection, and
  bucket IDs to Render using the names in `backend/.env.example`.
5. Redeploy Render, then log in at `/admin/login` using the Appwrite account
  email and password. Create a release, upload its ZIP, and publish it.

When Appwrite variables are absent, local development falls back to the
existing SQLite/local-file implementation. This fallback is useful locally;
configure Appwrite in Render for persistent production releases.

### Vercel + Render checklist

1. Create a Render Web Service from this repository using the included
  `render.yaml`, or choose Docker with the repository root as its context.
2. Create a Vercel project from the same repository and set its **Root
  Directory** to `frontend`. The included `frontend/vercel.json` handles SPA
  route refreshes.
3. In Vercel, set `VITE_API_URL` to the Render HTTPS origin and `VITE_WS_URL`
  to its `wss://` origin. Set `VITE_DOWNLOAD_URL` to a public Windows release
  URL when releases are hosted outside the API.
4. In Render, set `CORS_ORIGINS` to the exact Vercel origin, optionally adding
  a local development origin, then redeploy the service.

## Release download flow

The public download page retrieves the latest release metadata from the API and
streams the published installer through the release endpoint. With Appwrite
configured, release metadata is stored in the Appwrite database and ZIP files
are stored in the Appwrite bucket, so they survive Render restarts.

## Known hosting limitations

Render's filesystem is ephemeral. For dependable software distribution, host
installer files in GitHub Releases or object storage and use the API to track
downloads and publish metadata.

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
├── postcss.config.js
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
