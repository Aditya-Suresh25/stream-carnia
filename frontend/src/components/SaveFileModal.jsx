import { useState } from "react";
import { api } from "../services/api";

function fileNameFromPath(filePath, title) {
  return filePath?.split(/[\\/]/).pop() || `${title || "video"}.mp4`;
}

export default function SaveFileModal({ item, onClose }) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const fileName = fileNameFromPath(item.file_path, item.title);

  async function handleSave() {
    setIsSaving(true);
    setError("");
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: "Video file", accept: { "video/*": [".mp4", ".mkv", ".webm"] } }],
        });
        const response = await fetch(api.downloadFileUrl(item.id));
        if (!response.ok) throw new Error("Could not retrieve the completed file.");
        const writable = await handle.createWritable();
        await writable.write(await response.blob());
        await writable.close();
      } else {
        const link = document.createElement("a");
        link.href = api.downloadFileUrl(item.id);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      onClose();
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || "Could not save the file.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="card w-full max-w-md p-6">
        <p className="text-lg font-semibold text-slate-100">Download complete</p>
        <p className="mt-2 text-sm text-slate-400">Choose where to save {fileName}.</p>
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose} disabled={isSaving}>Later</button>
          <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Choose location"}
          </button>
        </div>
      </div>
    </div>
  );
}
