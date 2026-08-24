import { useState } from "react";

export default function UrlInput({ onAnalyze, isAnalyzing }) {
  const [url, setUrl] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim() || isAnalyzing) return;
    onAnalyze(url.trim());
  }

  return (
    <div className="card p-8 sm:p-10 text-center animate-fadeIn">
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-50">
        Download your videos in original quality
      </h2>
      <p className="text-slate-500 mt-2 text-sm">
        Paste a YouTube link — video, livestream VOD, or short.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="input-field flex-1"
          autoFocus
        />
        <button type="submit" disabled={isAnalyzing || !url.trim()} className="btn-primary whitespace-nowrap">
          {isAnalyzing ? (
            <span className="flex items-center gap-2">
              <Spinner /> Analyzing...
            </span>
          ) : (
            "Analyze Video"
          )}
        </button>
      </form>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
    </svg>
  );
}
