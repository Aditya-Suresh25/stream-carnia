import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Link,NavLink } from "react-router-dom";


export default function Header({ onOpenSettings }) {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ status: "error" }));
  }, []);

  return (
    <header className="flex items-center justify-between py-5">
      <Link to="/" className="flex items-center gap-3">
        <div className="w-9 h-9 flex items-center justify-center">
          <img
            src="/favicon.png"
            alt="StreamCarnia"
            className="w-9 h-9 object-contain"
          />
        </div>

        <div>
          <h1 className="text-sm font-semibold tracking-tight text-slate-100">
            StreamCarnia
          </h1>
          <p className="text-xs text-slate-500">
            Original quality · kept local
          </p>
        </div>
      </Link>

      <nav className="utility-nav" aria-label="Application navigation">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/download">Downloader</NavLink>
        <NavLink to="/history">History</NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>

      <div className="flex items-center gap-2">
        {health && (
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 mr-2">
            <StatusDot ok={health.ffmpeg_installed} label="FFmpeg" />
            <StatusDot
              ok={health.status === "ok"}
              label={
                health.ytdlp_version
                  ? `yt-dlp ${health.ytdlp_version}`
                  : "yt-dlp"
              }
            />
          </div>
        )}

        {onOpenSettings && (
          <button
            className="btn-ghost utility-settings"
            onClick={onOpenSettings}
          >
            Quick settings
          </button>
        )}
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
