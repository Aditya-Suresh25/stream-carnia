export default function Toasts({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2.5 rounded-xl text-sm shadow-glow border animate-fadeIn
            ${t.type === "error" ? "bg-rose-500/10 border-rose-500/30 text-rose-300" : "bg-base-900 border-white/10 text-slate-200"}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
