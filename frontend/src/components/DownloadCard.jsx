import { useEffect, useState } from "react";
import { useDownloadProgress } from "../hooks/useDownloadProgress";
import ProgressBar from "./ProgressBar";
import SaveFileModal from "./SaveFileModal";
import { api } from "../services/api";

const STAGE_LABELS = {
  queued: "Queued",
  analyzing: "Analyzing",
  downloading_video: "Downloading video",
  downloading_audio: "Downloading audio",
  merging: "Merging streams",
  finalizing: "Finalizing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec) return null;
  const mb = bytesPerSec / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB/s`;
  return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
}

function formatSize(bytes) {
  if (!bytes) return null;
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function formatEta(seconds) {
  if (seconds === null || seconds === undefined) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default function DownloadCard({ initialItem, onRemoved }) {
  const item = useDownloadProgress(initialItem.id, initialItem) || initialItem;
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const isActive = ["downloading_video", "downloading_audio", "merging", "finalizing"].includes(item.stage);
  const isDone = item.stage === "completed";
  const isFailed = item.stage === "failed";
  const isCancelled = item.stage === "cancelled";

  useEffect(() => {
    if (item.stage === "completed" && item.file_path) {
      setSaveModalOpen(true);
    }
  }, [item.stage, item.file_path]);

  async function handleCancel() {
    await api.cancelDownload(item.id);
  }
  async function handleRetry() {
    await api.startDownload({
      url: item.url,
      format_key: "best",
      format_selector: "bestvideo*+bestaudio/best",
      title: item.title,
      channel: item.channel,
      container: "auto",
    });
  }
  async function handleRemove() {
    await api.removeDownload(item.id);
    onRemoved?.(item.id);
  }

  return (
    <>
      <div className="card p-4 sm:p-5 animate-fadeIn">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-100 truncate">{item.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{item.format_label}</p>
        </div>
        <StageBadge stage={item.stage} />
      </div>

      {(isActive || item.stage === "queued") && (
        <div className="mt-3.5">
          <ProgressBar percent={item.percent} indeterminate={item.stage === "queued"} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
            <span>{item.percent ? `${item.percent.toFixed(0)}%` : "--"}</span>
            {formatSpeed(item.speed_bytes_s) && <span>{formatSpeed(item.speed_bytes_s)}</span>}
            {(item.downloaded_bytes || item.total_bytes) && (
              <span>
                {formatSize(item.downloaded_bytes) || "0 MB"}
                {formatSize(item.total_bytes) ? ` / ${formatSize(item.total_bytes)}` : ""}
              </span>
            )}
            {formatEta(item.eta_seconds) && <span>ETA {formatEta(item.eta_seconds)}</span>}
          </div>
        </div>
      )}

      {isFailed && item.error && <p className="text-xs text-rose-400 mt-2">{item.error}</p>}

      <div className="flex items-center gap-2 mt-3">
        {isActive || item.stage === "queued" ? (
          <button className="btn-ghost" onClick={handleCancel}>Cancel</button>
        ) : null}
        {isFailed || isCancelled ? (
          <button className="btn-ghost" onClick={handleRetry}>Retry</button>
        ) : null}
        {(isDone || isFailed || isCancelled) && (
          <button className="btn-ghost ml-auto" onClick={handleRemove}>Remove</button>
        )}
      </div>
      </div>
      {saveModalOpen && (
        <SaveFileModal item={item} onClose={() => setSaveModalOpen(false)} />
      )}
    </>
  );
}

function StageBadge({ stage }) {
  const styles = {
    queued: "bg-base-800 text-slate-400",
    analyzing: "bg-base-800 text-slate-400",
    downloading_video: "bg-accent-500/15 text-accent-400",
    downloading_audio: "bg-accent-500/15 text-accent-400",
    merging: "bg-amber-500/15 text-amber-400",
    finalizing: "bg-amber-500/15 text-amber-400",
    completed: "bg-emerald-500/15 text-emerald-400",
    failed: "bg-rose-500/15 text-rose-400",
    cancelled: "bg-base-800 text-slate-500",
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-1 rounded-lg whitespace-nowrap ${styles[stage] || styles.queued}`}>
      {STAGE_LABELS[stage] || stage}
    </span>
  );
}
