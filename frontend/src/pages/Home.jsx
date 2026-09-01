import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import UrlInput from "../components/UrlInput";
import VideoInfo from "../components/VideoInfo";
import DownloadQueue from "../components/DownloadQueue";
import Toasts from "../components/Toasts";
import { api } from "../services/api";

export default function Home() {
  const [analysis, setAnalysis] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isQueuing, setIsQueuing] = useState(false);
  const [queue, setQueue] = useState([]);
  const [toasts, setToasts] = useState([]);

  const toastId = useRef(0);

  function pushToast(message, type = "info") {
    const id = ++toastId.current;

    setToasts((t) => [
      ...t,
      {
        id,
        message,
        type,
      },
    ]);

    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  }

  useEffect(() => {
    api
      .listDownloads()
      .then(setQueue)
      .catch(() => {});
  }, []);

  async function handleAnalyze(url) {
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const info = await api.analyze(url);

      setAnalysis({
        url,
        info,
      });

      setSelectedKey(
        info.formats.find((f) => f.recommended)?.key ||
          info.formats[0]?.key
      );

      pushToast("Video analyzed successfully");
    } catch (err) {
      pushToast(
        err.message || "Could not analyze this URL.",
        "error"
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleDownload() {
    if (!analysis) return;

    const format = analysis.info.formats.find(
      (f) => f.key === selectedKey
    );

    if (!format) return;

    setIsQueuing(true);

    try {
      const item = await api.startDownload({
        url: analysis.url,
        format_key: format.key,
        format_selector: format.format_selector,
        title: analysis.info.title,
        channel: analysis.info.channel,
        container: "auto",
      });

      setQueue((q) => [item, ...q]);

      pushToast("Download started");
    } catch (err) {
      pushToast(
        err.message || "Could not start the download.",
        "error"
      );
    } finally {
      setIsQueuing(false);
    }
  }

  function handleRemoved(id) {
    setQueue((q) => q.filter((i) => i.id !== id));
  }

  return (
    <div className="downloader-page">
      <div className="downloader-shell">
        <Header />

        <main className="downloader-main">
          {/* ================= HERO / INPUT ================= */}
          <section className="downloader-hero">
            <div className="downloader-hero-content">
              <div className="downloader-eyebrow">
                <span className="downloader-eyebrow-line" />
                StreamCarnia Downloader
              </div>

              <h1>
                Download media.
                <br />
                <em>Your way.</em>
              </h1>

              <p>
                Paste a URL, choose your quality, and let StreamCarnia
                handle the rest.
              </p>
            </div>

            <div className="downloader-input-section">
              <UrlInput
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />
            </div>
          </section>

          {/* ================= ANALYSIS ================= */}
          {analysis && (
            <section className="downloader-section analysis-section">
              <div className="downloader-section-heading">
                <div>
                  <span className="downloader-section-label">
                    ANALYSIS
                  </span>

                  <h2>
                    Ready to <em>download</em>
                  </h2>
                </div>

                <span className="downloader-status">
                  ● Analyzed
                </span>
              </div>

              <div className="downloader-component-wrapper">
                <VideoInfo
                  info={analysis.info}
                  selectedKey={selectedKey}
                  onSelect={setSelectedKey}
                  onDownload={handleDownload}
                  isQueuing={isQueuing}
                />
              </div>
            </section>
          )}

          {/* ================= DOWNLOAD QUEUE ================= */}
          <section className="downloader-section queue-section">
            <div className="downloader-section-heading">
              <div>
                <span className="downloader-section-label">
                  DOWNLOADS
                </span>

                <h2>
                  Your <em>queue</em>
                </h2>
              </div>

              {queue.length > 0 && (
                <span className="queue-count">
                  {queue.length}{" "}
                  {queue.length === 1 ? "item" : "items"}
                </span>
              )}
            </div>

            <div className="downloader-component-wrapper">
              <DownloadQueue
                items={queue}
                onRemoved={handleRemoved}
              />
            </div>
          </section>
        </main>
      </div>

      <Toasts toasts={toasts} />
    </div>
  );
}