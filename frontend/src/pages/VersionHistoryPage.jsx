import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ModernCard, AnimatedButton } from "../components/ModernComponents";
import { StreamCarniaLogo } from "../components/StreamCarniaLogo";
import { AnimatedOrb } from "../components/AnimatedOrb";
import Header from "../components/Header";
import { api } from "../services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faCalendarDays, faDownload, faGears, faHardDrive } from "@fortawesome/free-solid-svg-icons";

export default function VersionHistoryPage() {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch all versions
    const fetchVersions = async () => {
      try {
        setVersions(await api.getVersions());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();

    // Track page visit
    api.trackPageVisit({
      page: "versions",
      referrer: document.referrer,
      user_agent: navigator.userAgent,
    }).catch(() => {});
  }, []);

  const handleVersionDownload = (version) => {
    // Track download
    api.trackDownload({
      version: version.version,
      source: "version-history",
      user_agent: navigator.userAgent,
      referrer: document.referrer,
    }).catch(() => {});

    const target = version.file_name
      ? api.releaseDownloadUrl(version.version)
      : version.download_url;

    if (target) {
      window.location.href = target;
    }
  };

  return (
    <div className="landing-page">
      <Header />

      <main>
        {/* ================= HERO ================= */}
        <section className="landing-hero" id="top">
          <div className="hero-grid" aria-hidden="true" />

          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="eyebrow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="eyebrow-mark" />
              StreamCarnia
            </motion.div>

            <h1>
              Version History
              <br />
              <em>and Releases</em>
            </h1>

            <p className="hero-lede">
              See what's new in each StreamCarnia release. Browse our complete
              update history.
            </p>

            <AnimatedButton
              onClick={() => (window.location.href = "/download")}
              variant="primary"
            >
              Download Latest <FontAwesomeIcon icon={faArrowDown} aria-hidden="true" />
            </AnimatedButton>
          </motion.div>

          <motion.div
            className="time-orb-wrap version-orb-wrap"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            aria-label="Interactive StreamCarnia logo for release history"
          >
            <AnimatedOrb />

            <p className="orb-caption">
              Release orbit
              <br />
              Every build, recorded
            </p>
          </motion.div>
        </section>

        {/* ================= VERSION HISTORY ================= */}
        <section className="landing-section">
          <motion.div
            className="section-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="eyebrow">Releases</p>

            <h2>
              Version History
              <br />
              <em>All releases</em>
            </h2>
          </motion.div>

          {/* Loading */}
          {loading && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                color: "rgba(243,234,214,.6)",
                textAlign: "center",
              }}
            >
              <FontAwesomeIcon icon={faGears} spin aria-hidden="true" /> Loading versions...
            </motion.p>
          )}

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                color: "var(--gold)",
                textAlign: "center",
              }}
            >
              {error}
            </motion.p>
          )}

          {/* Versions */}
          <div style={{ marginTop: "3rem" }}>
            {versions.map((version, index) => (
              <motion.div
                key={version.version}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{
                  once: true,
                  margin: "-50px",
                }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                }}
              >
                <ModernCard
                  className="version-card"
                  style={{ marginBottom: "1.5rem" }}
                >
                  <div className="version-card-inner">
                    {/* ================= VERSION INFO ================= */}
                    <div className="version-card-content">
                      <h3
                        style={{
                          marginBottom: "0.5rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.8rem",
                          flexWrap: "wrap",
                        }}
                      >
                        {version.version}

                        {/* Latest Badge */}
                        {version.is_latest && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              textTransform: "uppercase",
                              letterSpacing: ".1em",
                              color: "var(--gold)",
                              border: "1px solid var(--gold)",
                              padding: "0.4rem 0.6rem",
                              borderRadius: "4px",
                              fontWeight: 600,
                            }}
                          >
                            Latest
                          </span>
                        )}

                        {/* Status Badge */}
                        <span
                          style={{
                            fontSize: "0.75rem",
                            textTransform: "uppercase",
                            letterSpacing: ".1em",
                            color:
                              version.status === "stable"
                                ? "#9cc5a6"
                                : "var(--gold)",
                            border: `1px solid ${
                              version.status === "stable"
                                ? "rgba(156,197,166,.4)"
                                : "rgba(215,170,88,.4)"
                            }`,
                            padding: "0.4rem 0.6rem",
                            borderRadius: "4px",
                            fontWeight: 600,
                            background:
                              version.status === "stable"
                                ? "rgba(156,197,166,.1)"
                                : "rgba(215,170,88,.1)",
                          }}
                        >
                          {version.status}
                        </span>
                      </h3>

                      {/* Release Date */}
                      <p
                        style={{
                          color: "rgba(243,234,214,.5)",
                          fontSize: "0.9rem",
                          marginBottom: "1rem",
                          marginTop: "0.5rem",
                        }}
                      >
                        <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />{" "}
                        {new Date(
                          version.release_date
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>

                      {/* Changelog */}
                      {version.changelog && (
                        <div
                          style={{
                            color: "rgba(243,234,214,.65)",
                            fontSize: "0.95rem",
                            lineHeight: "1.6",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {version.changelog}
                        </div>
                      )}
                    </div>

                    {/* ================= DOWNLOAD / STATS ================= */}
                    <div className="version-card-actions">
                      {/* File Size */}
                      {version.file_size && (
                        <p
                          style={{
                            color: "rgba(243,234,214,.5)",
                            fontSize: "0.9rem",
                            margin: 0,
                          }}
                        >
                          <FontAwesomeIcon icon={faHardDrive} aria-hidden="true" />{" "}
                          {(version.file_size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      )}

                      {/* Download Count */}
                      {version.download_count !== undefined && (
                        <p
                          style={{
                            color: "rgba(243,234,214,.5)",
                            fontSize: "0.9rem",
                            margin: 0,
                          }}
                        >
                          <FontAwesomeIcon icon={faDownload} aria-hidden="true" /> {version.download_count} downloads
                        </p>
                      )}

                      {/* Download Button */}
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

          {/* No Versions */}
          {versions.length === 0 && !loading && !error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                color: "rgba(243,234,214,.6)",
                textAlign: "center",
                marginTop: "2rem",
              }}
            >
              No versions available yet.
            </motion.p>
          )}
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="landing-footer">
        <div>
          <Link
            to="/"
            className="logo-nav"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <StreamCarniaLogo size="sm" />
            <span>StreamCarnia</span>
          </Link>

          <p>
            Native Windows application for high-quality media downloads.
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <Link to="/">Home</Link>
          <a href="#features">Features</a>
          <Link to="/download">Download</Link>
        </nav>

        <div className="footer-meta">
          <p>
            Use StreamCarnia only for content you own or have permission to
            download.
          </p>

          <small>© 2026 StreamCarnia</small>
        </div>
      </footer>
    </div>
  );
}