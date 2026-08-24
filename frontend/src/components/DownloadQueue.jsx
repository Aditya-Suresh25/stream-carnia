import DownloadCard from "./DownloadCard";

export default function DownloadQueue({ items, onRemoved }) {
  if (!items.length) return null;

  return (
    <div className="animate-fadeIn">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Downloads</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <DownloadCard key={item.id} initialItem={item} onRemoved={onRemoved} />
        ))}
      </div>
    </div>
  );
}
