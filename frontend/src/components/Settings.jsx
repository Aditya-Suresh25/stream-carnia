import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function Settings({ open, onClose }) {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      api.getSettings().then(setSettings);
      setSaved(false);
    }
  }, [open]);

  if (!open || !settings) return null;

  async function handleSave() {
    const updated = await api.updateSettings(settings);
    setSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md p-6 animate-fadeIn">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-slate-50">Settings</h3>
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Download location</label>
            <input
              className="input-field mt-1.5 text-sm"
              value={settings.download_dir}
              onChange={(e) => setSettings({ ...settings, download_dir: e.target.value })}
              placeholder="C:\Users\...\Downloads\YouTube Downloader"
            />
            <p className="text-xs text-slate-500 mt-1">
              Paste a folder path (native file browser isn't available in a web UI).
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Default quality</label>
            <select
              className="input-field mt-1.5 text-sm"
              value={settings.default_quality}
              onChange={(e) => setSettings({ ...settings, default_quality: e.target.value })}
            >
              <option value="best">Best Available</option>
              <option value="1440p">1440p</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="audio">Audio Only</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Container</label>
            <select
              className="input-field mt-1.5 text-sm"
              value={settings.container}
              onChange={(e) => setSettings({ ...settings, container: e.target.value })}
            >
              <option value="auto">Auto</option>
              <option value="mp4">MP4</option>
              <option value="mkv">MKV</option>
              <option value="webm">WebM</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Concurrent downloads</label>
            <select
              className="input-field mt-1.5 text-sm"
              value={settings.concurrent_downloads}
              onChange={(e) => setSettings({ ...settings, concurrent_downloads: Number(e.target.value) })}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">Restart the backend for this to take effect.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Theme</label>
            <select
              className="input-field mt-1.5 text-sm"
              value={settings.theme}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button className="btn-primary" onClick={handleSave}>Save settings</button>
          {saved && <span className="text-xs text-emerald-400">Settings saved</span>}
        </div>
      </div>
    </div>
  );
}
