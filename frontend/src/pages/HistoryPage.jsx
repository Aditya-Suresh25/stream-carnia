import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { api } from "../services/api";

export default function HistoryPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHistory().then(setEntries).catch(() => setEntries([])).finally(() => setLoading(false));
  }, []);

  async function removeEntry(id) {
    await api.deleteHistoryEntry(id);
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <div className="downloader-page min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Header />
        <main className="pb-16 pt-12 sm:pt-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <p className="tool-eyebrow">Your archive</p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-50">Download history</h2>
              <p className="text-sm text-slate-500 mt-2">A record of files processed on this machine.</p>
            </div>
            <Link className="btn-primary" to="/download">New download <span aria-hidden="true">↗</span></Link>
          </div>

          {loading ? <p className="text-sm text-slate-500">Loading history...</p> : entries.length ? (
            <div className="space-y-3">
              {entries.map((entry) => (
                <article className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4" key={entry.id}>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-slate-100 truncate" title={entry.title}>{entry.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 truncate">{entry.url}</p>
                    <p className="text-xs text-slate-500 mt-2">{entry.quality} · {new Date(entry.date).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={entry.status === "completed" ? "history-status history-complete" : "history-status"}>{entry.status}</span>
                    <button className="btn-ghost" onClick={() => removeEntry(entry.id)}>Remove</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="card p-10 text-center"><p className="text-slate-300">No downloads yet.</p><p className="text-sm text-slate-500 mt-2">Completed and failed downloads will appear here.</p></div>}
        </main>
      </div>
    </div>
  );
}
