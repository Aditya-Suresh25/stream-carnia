import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="downloader-page min-h-screen flex items-center justify-center px-6">
      <main className="max-w-lg text-center">
        <p className="tool-eyebrow">Signal lost</p>
        <p className="not-found-code">404</p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-50">Lost in the flow of time?</h1>
        <p className="text-slate-500 mt-3">The page you are looking for does not exist.</p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link className="btn-primary" to="/">Return home</Link>
          <Link className="btn-secondary" to="/download">Open downloader</Link>
        </div>
      </main>
    </div>
  );
}
