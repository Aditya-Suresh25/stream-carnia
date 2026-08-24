export default function ProgressBar({ percent = 0, indeterminate = false }) {
  return (
    <div className="h-2 w-full bg-base-800 rounded-full overflow-hidden">
      {indeterminate ? (
        <div className="h-full w-1/3 bg-gradient-to-r from-accent-500 to-accent-400 rounded-full animate-pulseSoft" />
      ) : (
        <div
          className="h-full bg-gradient-to-r from-accent-500 to-accent-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      )}
    </div>
  );
}
