import { useState } from "react";

function formatBytes(bytes) {
  if (!bytes) return null;
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i += 1;
  }
  return `${val.toFixed(val >= 10 ? 0 : 1)} ${units[i]}`;
}

export default function QualitySelector({ formats, selectedKey, onSelect }) {
  const [open, setOpen] = useState(false);
  const selected = formats.find((f) => f.key === selectedKey) || formats[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input-field flex items-center justify-between text-left"
      >
        <span className="flex items-center gap-2">
          <span className="font-medium">{selected?.label}</span>
          {selected?.recommended && (
            <span className="text-[10px] uppercase tracking-wide bg-accent-500/20 text-accent-400 px-1.5 py-0.5 rounded-md">
              Recommended
            </span>
          )}
        </span>
        <svg className={`w-4 h-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="relative z-20 mt-2 w-full max-h-80 overflow-y-auto card p-1.5 animate-fadeIn">
          {formats.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                onSelect(f.key);
                setOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center justify-between gap-3
                ${f.key === selectedKey ? "bg-accent-500/15" : "hover:bg-white/5"}`}
            >
              <span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-100">{f.label}</span>
                  {f.recommended && (
                    <span className="text-[10px] uppercase tracking-wide bg-accent-500/20 text-accent-400 px-1.5 py-0.5 rounded-md">
                      Recommended
                    </span>
                  )}
                  {f.is_hdr && (
                    <span className="text-[10px] uppercase tracking-wide bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md">
                      HDR
                    </span>
                  )}
                </span>
                {f.sublabel && <span className="block text-xs text-slate-500 mt-0.5">{f.sublabel}</span>}
              </span>
              {formatBytes(f.approx_filesize) && (
                <span className="text-xs text-slate-500 whitespace-nowrap">{formatBytes(f.approx_filesize)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
