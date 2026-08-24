import { useState } from "react";
import QualitySelector from "./QualitySelector";

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function VideoInfo({ info, selectedKey, onSelect, onDownload, isQueuing }) {
  const [showTech, setShowTech] = useState(false);
  const selected = info.formats.find((f) => f.key === selectedKey);
  const kindLabel = info.is_live ? "Live now" : info.was_live ? "Livestream VOD" : "Video";

  return (
    <div className="card p-6 sm:p-7 animate-fadeIn">
      <div className="flex flex-col sm:flex-row gap-5">
        <div className="sm:w-64 shrink-0">
          {info.thumbnail ? (
            <img src={info.thumbnail} alt="" className="w-full aspect-video object-cover rounded-xl border border-white/5" />
          ) : (
            <div className="w-full aspect-video rounded-xl bg-base-800" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-50 truncate" title={info.title}>
            {info.title}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">{info.channel}</p>

          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-400">
            {formatDuration(info.duration) && (
              <span className="bg-base-800 px-2.5 py-1 rounded-lg">{formatDuration(info.duration)}</span>
            )}
            <span className="bg-base-800 px-2.5 py-1 rounded-lg">{kindLabel}</span>
            {info.upload_date && (
              <span className="bg-base-800 px-2.5 py-1 rounded-lg">
                {info.upload_date.slice(0, 4)}-{info.upload_date.slice(4, 6)}-{info.upload_date.slice(6, 8)}
              </span>
            )}
          </div>

          <div className="mt-5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Quality</label>
            <div className="mt-1.5">
              <QualitySelector formats={info.formats} selectedKey={selectedKey} onSelect={onSelect} />
            </div>
          </div>

          {selected && (selected.vcodec || selected.acodec || selected.fps) && (
            <div className="mt-3">
              <button className="text-xs text-slate-500 hover:text-slate-300 transition" onClick={() => setShowTech((v) => !v)}>
                {showTech ? "Hide" : "Show"} technical details
              </button>
              {showTech && (
                <div className="mt-2 text-xs text-slate-400 bg-base-850 rounded-xl p-3 space-y-1 font-mono">
                  {selected.vcodec && <div>Video: {selected.vcodec.toUpperCase()}</div>}
                  {selected.fps && <div>FPS: {Math.round(selected.fps)}</div>}
                  {selected.height && <div>Resolution height: {selected.height}p</div>}
                  {selected.is_hdr && <div>Dynamic range: HDR</div>}
                </div>
              )}
            </div>
          )}

          <button onClick={onDownload} disabled={isQueuing} className="btn-primary mt-5 w-full sm:w-auto">
            {isQueuing ? "Adding to queue..." : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}
