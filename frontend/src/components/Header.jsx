import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function Header({ onOpenSettings }) {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ status: "error" }));
  }, []);

  return (
    <header className="flex items-center justify-between py-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-glow">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
            <path d="M10 8.64L15.27 12 10 15.36V8.64zM21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42a2.5 2.5 0 0 0-1.76 1.77A26 26 0 0 0 2 12a26 26 0 0 0 .42 4.81 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.42-4.81z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-slate-100">YouTube Downloader</h1>
          <p className="text-xs text-slate-500">Local utility · original quality</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {health && (
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 mr-2">
            <StatusDot ok={health.ffmpeg_installed} label="FFmpeg" />
            <StatusDot ok={health.status === "ok"} label={health.ytdlp_version ? `yt-dlp ${health.ytdlp_version}` : "yt-dlp"} />
          </div>
        )}
        <button className="btn-ghost" onClick={onOpenSettings}>
          Settings
        </button>
      </div>
    </header>
  );
}

function StatusDot({ ok, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-rose-400"}`} />
      {label}
    </span>
  );
}
