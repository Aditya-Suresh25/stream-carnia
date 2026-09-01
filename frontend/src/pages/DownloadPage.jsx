import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ModernCard, AnimatedButton } from "../components/ModernComponents";
import { StreamCarniaLogo } from "../components/StreamCarniaLogo";

export default function DownloadPage() {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  const downloadUrl = latest?.download_url || import.meta.env.VITE_DOWNLOAD_URL || "/api/admin/releases/latest/download";

  useEffect(() => {
    // Fetch latest version from API
    const fetchLatest = async () => {
      try {
        const res = await fetch("/api/admin/versions/latest");
        if (res.ok) {
          const data = await res.json();
          setLatest(data);
        } else {
          setError("Could not fetch latest version");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLatest();

    // Track page visit
    fetch("/api/admin/track/page-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: "download",
        referrer: document.referrer,
        user_agent: navigator.userAgent,
      }),
    }).catch(() => {});

    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleDownload = () => {
    if (!latest && !import.meta.env.VITE_DOWNLOAD_URL) {
      setError("No download is currently available");
      return;
    }

    fetch("/api/admin/track/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: latest?.version,
        source: "download-page",
        user_agent: navigator.userAgent,
        referrer: document.referrer,
      }),
    }).catch(() => {});

    const targetUrl = latest ? `/api/admin/releases/${latest.version}/download` : downloadUrl;
    window.location.href = targetUrl;
  };

  return (
    <div className="landing-page">
      <DownloadNav scrolled={scrolled} />
      <main>
        <section className="landing-hero" id="top">
          <div className="hero-grid" aria-hidden="true" />
          <motion.div className="hero-copy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <motion.div className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <span className="eyebrow-mark" /> StreamCarnia
            </motion.div>
            <h1>Download now<br /><em>for Windows</em></h1>
            <p className="hero-lede">Native Windows application for high-quality media downloads.</p>
            <AnimatedButton
              onClick={handleDownload}
              variant="primary"
              loading={loading}
            >
              {loading ? "Loading..." : "Download StreamCarnia"} <span aria-hidden="true">↓</span>
            </AnimatedButton>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ color: "var(--gold)", marginTop: "15px", fontSize: "14px" }}
              >
                {error}
              </motion.p>
            )}
          </motion.div>
          <motion.div
            className="time-orb-wrap"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            aria-label="System information"
          >
            <ModernCard className="quality-console" style={{ padding: "1.5rem" }}>
              <div style={{ fontSize: "0.85rem", color: "rgba(215,170,88,.8)", marginBottom: "1rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                📦 Latest Release
              </div>
              {!loading && latest && (
                <>
                  <div style={{ marginBottom: "0.8rem", paddingBottom: "0.8rem", borderBottom: "1px solid rgba(215,170,88,.2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>{latest.version}</span>
                      <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: latest.status === "stable" ? "#9cc5a6" : "var(--gold)", border: `1px solid ${latest.status === "stable" ? "rgba(156,197,166,.4)" : "rgba(215,170,88,.4)"}`, padding: "0.3rem 0.6rem", borderRadius: "2px", fontWeight: 600 }}>
                        {latest.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "rgba(243,234,214,.6)", lineHeight: "1.6" }}>
                    <div style={{ marginBottom: "0.4rem" }}>📅 {new Date(latest.release_date).toLocaleDateString()}</div>
                    {latest.file_size && (
                      <div>💾 {(latest.file_size / (1024 * 1024)).toFixed(1)} MB</div>
                    )}
                  </div>
                </>
              )}
              {loading && <div style={{ color: "rgba(243,234,214,.6)" }}>⚙️ Loading version info...</div>}
            </ModernCard>
          </motion.div>
        </section>

        <section className="landing-section">
          <motion.div
            className="section-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="eyebrow">System Requirements</p>
            <h2>Works on<br /><em>Windows 10 & 11</em></h2>
          </motion.div>
          <div className="feature-grid">
            {[
              ["🪟", "Windows 10 or later", "Compatible with modern Windows versions."],
              ["📦", ".NET 6.0 Runtime", "Lightweight runtime included in installer."],
              ["⚙️", "FFmpeg", "Optional for advanced encoding features."],
            ].map(([icon, title, copy], idx) => (
              <ModernCard key={title} delay={idx * 0.1}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>{icon}</div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </ModernCard>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <motion.div
            className="section-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="eyebrow">What you get</p>
            <h2>Complete control<br /><em>in one application</em></h2>
          </motion.div>
          <div className="feature-grid">
            {[
              ["01", "🎯", "High-Quality Downloads", "Keep the highest available quality from your source."],
              ["02", "🔒", "Local Processing", "All processing happens on your machine. Your data stays private."],
              ["03", "⚡", "Batch Downloads", "Download multiple videos efficiently in parallel."],
              ["04", "📋", "Download History", "Track and manage all your downloads locally."],
              ["05", "⚙️", "Custom Settings", "Configure quality, format, and output paths."],
              ["06", "📊", "Real-time Progress", "Watch the download process in detail."],
            ].map(([number, icon, title, copy], idx) => (
              <ModernCard key={title} delay={idx * 0.05}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>{icon}</div>
                <div className="feature-number">{number}</div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </ModernCard>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="cta-rune" aria-hidden="true">◌　◌　◌</div>
            <p className="eyebrow">Getting Started</p>
            <h2>Download &<br /><em>get started today</em></h2>
            <p className="cta-note">Simple installation. No ads. No telemetry. Just your media, the way you want it.</p>
            <AnimatedButton
              onClick={handleDownload}
              variant="primary"
              loading={loading}
              style={{ marginTop: "2rem" }}
            >
              Download Now <span aria-hidden="true">↓</span>
            </AnimatedButton>
          </motion.div>
        </section>
      </main>
      <footer className="landing-footer">
        <div>
          <Link to="/" className="logo-nav" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <StreamCarniaLogo size="sm" />
            <span>StreamCarnia</span>
          </Link>
          <p>Native Windows application for high-quality media downloads.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link to="/">Home</Link>
          <Link to="/versions">Version History</Link>
          <a href="#features">Documentation</a>
        </nav>
        <div className="footer-meta">
          <p>Use StreamCarnia only for content you own or have permission to download.</p>
          <small>© 2026 StreamCarnia</small>
        </div>
      </footer>
    </div>
  );
}

function DownloadNav({ scrolled }) {
  return (
    <header className={`landing-nav ${scrolled ? "nav-scrolled" : ""}`}>
      <Link className="brand" to="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <StreamCarniaLogo size="sm" animated />
        <span>StreamCarnia</span>
      </Link>
      <nav className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/versions">Version History</Link>
        <a href="#" style={{ color: "var(--gold)" }}>Download <span aria-hidden="true">↗</span></a>
      </nav>
    </header>
  );
}
