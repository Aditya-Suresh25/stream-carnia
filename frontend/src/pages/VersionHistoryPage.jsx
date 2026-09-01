import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ModernCard, AnimatedButton } from "../components/ModernComponents";
import { StreamCarniaLogo } from "../components/StreamCarniaLogo";

export default function VersionHistoryPage() {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Fetch all versions
    const fetchVersions = async () => {
      try {
        const res = await fetch("/api/admin/versions");
        if (res.ok) {
          const data = await res.json();
          setVersions(data);
        } else {
          setError("Could not fetch versions");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();

    // Track page visit
    fetch("/api/admin/track/page-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: "versions",
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

  const handleVersionDownload = (version) => {
    fetch("/api/admin/track/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: version.version,
        source: "version-history",
        user_agent: navigator.userAgent,
        referrer: document.referrer,
      }),
    }).catch(() => {});

    const target = version.file_name ? `/api/admin/releases/${version.version}/download` : version.download_url;
    if (target) {
      window.location.href = target;
    }
  };

  return (
    <div className="landing-page">
      <VersionNav scrolled={scrolled} />
      <main>
        <section className="landing-hero" id="top">
          <div className="hero-grid" aria-hidden="true" />
          <motion.div className="hero-copy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <motion.div className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <span className="eyebrow-mark" /> StreamCarnia
            </motion.div>
            <h1>Version History<br /><em>and Releases</em></h1>
            <p className="hero-lede">See what's new in each StreamCarnia release. Browse our complete update history.</p>
            <AnimatedButton onClick={() => window.location.href = "/download"} variant="primary">
              Download Latest <span aria-hidden="true">↓</span>
            </AnimatedButton>
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
            <p className="eyebrow">Releases</p>
            <h2>Version History<br /><em>All releases</em></h2>
          </motion.div>

          {loading && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ color: "rgba(243,234,214,.6)", textAlign: "center" }}
            >
              ⚙️ Loading versions...
            </motion.p>
          )}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ color: "var(--gold)", textAlign: "center" }}
            >
              {error}
            </motion.p>
          )}

          <div style={{ marginTop: "3rem" }}>
            {versions.map((version, index) => (
              <motion.div
                key={version.version}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <ModernCard className="version-card" style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "2rem" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
                        {version.version}
                        {version.is_latest && (
                          <span style={{
                            fontSize: "0.75rem",
                            textTransform: "uppercase",
                            letterSpacing: ".1em",
                            color: "var(--gold)",
                            border: "1px solid var(--gold)",
                            padding: "0.4rem 0.6rem",
                            borderRadius: "4px",
                            fontWeight: 600,
                          }}>
                            Latest
                          </span>
                        )}
                        <span style={{
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                          letterSpacing: ".1em",
                          color: version.status === "stable" ? "#9cc5a6" : "var(--gold)",
                          border: `1px solid ${version.status === "stable" ? "rgba(156,197,166,.4)" : "rgba(215,170,88,.4)"}`,
                          padding: "0.4rem 0.6rem",
                          borderRadius: "4px",
                          fontWeight: 600,
                          background: version.status === "stable" ? "rgba(156,197,166,.1)" : "rgba(215,170,88,.1)",
                        }}>
                          {version.status}
                        </span>
                      </h3>
                      <p style={{ color: "rgba(243,234,214,.5)", fontSize: "0.9rem", marginBottom: "1rem", marginTop: "0.5rem" }}>
                        📅 {new Date(version.release_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      {version.changelog && (
                        <div style={{ color: "rgba(243,234,214,.65)", fontSize: "0.95rem", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                          {version.changelog}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", minWidth: "200px", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-end" }}>
                      {version.file_size && (
                        <p style={{ color: "rgba(243,234,214,.5)", fontSize: "0.9rem", margin: 0 }}>
                          💾 {(version.file_size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      )}
                      {version.download_count !== undefined && (
                        <p style={{ color: "rgba(243,234,214,.5)", fontSize: "0.9rem", margin: 0 }}>
                          ⬇️ {version.download_count} downloads
                        </p>
                      )}
                      <AnimatedButton
                        onClick={() => handleVersionDownload(version)}
                        variant="primary"
                        style={{
                          padding: "0.8rem 1.2rem",
                          fontSize: "0.85rem",
                          marginTop: "0.5rem",
                        }}
                      >
                        Download
                      </AnimatedButton>
                    </div>
                  </div>
                </ModernCard>
              </motion.div>
            ))}
          </div>

          {versions.length === 0 && !loading && !error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ color: "rgba(243,234,214,.6)", textAlign: "center", marginTop: "2rem" }}
            >
              No versions available yet.
            </motion.p>
          )}
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
          <a href="#features">Features</a>
          <Link to="/download">Download</Link>
        </nav>
        <div className="footer-meta">
          <p>Use StreamCarnia only for content you own or have permission to download.</p>
          <small>© 2026 StreamCarnia</small>
        </div>
      </footer>
    </div>
  );
}

function VersionNav({ scrolled }) {
  return (
    <header className={`landing-nav ${scrolled ? "nav-scrolled" : ""}`}>
      <Link className="brand" to="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <StreamCarniaLogo size="sm" animated />
        <span>StreamCarnia</span>
      </Link>
      <nav className="nav-links">
        <Link to="/">Home</Link>
        <a href="#" style={{ color: "var(--gold)" }}>Version History <span aria-hidden="true">↗</span></a>
        <Link to="/download">Download</Link>
      </nav>
    </header>
  );
}
