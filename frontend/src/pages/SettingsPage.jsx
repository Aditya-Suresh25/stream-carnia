import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Settings from "../components/Settings";

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="downloader-page min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Header />
        <main className="pb-16 pt-12 sm:pt-16">
          <p className="tool-eyebrow">Workspace control</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-50">Settings</h2>
          <p className="text-sm text-slate-500 mt-2">Tune where and how StreamCarnia prepares your files.</p>
        </main>
      </div>
      <Settings open onClose={() => navigate("/download")} />
    </div>
  );
}
