import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatedOrb } from "../components/AnimatedOrb";
import { ModernCard, AnimatedButton, FeatureCard, GlassContainer } from "../components/ModernComponents";
import { StreamCarniaLogo, StreamCarniaLogoBrand } from "../components/StreamCarniaLogo";
import { motion } from "framer-motion";

const features = [
  { number: "01", title: "Original quality", description: "Keep the highest available quality without unnecessary re-encoding." },
  { number: "02", title: "1440p & 60 FPS", description: "Preserve high-resolution and high-frame-rate video when available." },
  { number: "03", title: "Livestream VODs", description: "Save completed livestreams and long-form recordings." },
  { number: "04", title: "FFmpeg processing", description: "Advanced encoding and format handling on your machine." },
  { number: "05", title: "Real-time progress", description: "See exactly what is happening from first byte to final file." },
  { number: "06", title: "Local & private", description: "Your downloads stay on your machine, under your control." },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Track page visit
    fetch("/api/admin/track/page-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: "home",
        referrer: document.referrer,
        user_agent: navigator.userAgent,
      }),
    }).catch(() => {});

    const revealElements = [...document.querySelectorAll(".reveal-on-scroll")];
    const revealVisible = () => {
      const threshold = window.innerHeight * 0.88;
      revealElements.forEach((element) => {
        if (element.getBoundingClientRect().top < threshold) element.classList.add("is-visible");
      });
    };

    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      revealVisible();
    };

    revealVisible();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing-page">
      <LandingNav scrolled={scrolled} menuOpen={menuOpen} onToggle={() => setMenuOpen(!menuOpen)} onNavigate={() => setMenuOpen(false)} />
      <main>
        <section className="landing-hero" id="top">
          <div className="hero-grid" aria-hidden="true" />
          <motion.div className="hero-copy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <motion.div className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <span className="eyebrow-mark" /> StreamCarnia
            </motion.div>
            <h1>High-quality media<br /><em>for Windows</em></h1>
            <p className="hero-lede">Download videos and livestreams with the quality they were meant to have. Now as a native Windows application.</p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <AnimatedButton onClick={() => window.location.href = "/download"} variant="primary">
                Download Now <span aria-hidden="true">↓</span>
              </AnimatedButton>
            </motion.div>
            <motion.a
              className="hero-scroll"
              href="#features"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Explore StreamCarnia <span aria-hidden="true">↓</span>
            </motion.a>
          </motion.div>
          <motion.div
            className="time-orb-wrap"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            aria-label="Abstract time and stream motif"
          >
            <AnimatedOrb />
          </motion.div>
        </section>

        <section className="landing-section feature-section" id="features">
          <motion.div className="section-heading" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="eyebrow">Built for the keepers</p>
            <h2>Everything you need.<br /><em>Nothing you don't.</em></h2>
          </motion.div>
          <div className="feature-grid">
            {features.map((feature, idx) => (
              <FeatureCard key={feature.number} {...feature} delay={idx * 0.1} />
            ))}
          </div>
        </section>

        <section className="quality-section landing-section" id="quality">
          <motion.div className="quality-copy" initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="eyebrow">Desktop First</p>
            <h2>Native Windows<br /><em>application</em></h2>
            <p>StreamCarnia is now a standalone Windows desktop application. Powerful, local, and completely under your control.</p>
            <Link className="text-link" to="/download">Get StreamCarnia <span aria-hidden="true">→</span></Link>
          </motion.div>
          <motion.div
            className="glass-container"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            aria-label="Application status"
          >
            <div className="console-top">
              <span>STATUS</span>
              <span className="console-live"><i /> AVAILABLE</span>
            </div>
            <div className="quality-row quality-selected"><span><strong>2160p60</strong></span><b>READY</b></div>
            <div className="quality-row"><span>1440p</span><span className="quality-line" /></div>
            <div className="quality-row"><span>1080p</span><span className="quality-line" /></div>
          </motion.div>
        </section>

        <section className="platform-section landing-section" id="platforms">
          <motion.div className="section-heading" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="eyebrow">Platforms</p>
            <h2>Windows today.<br /><em>Android soon.</em></h2>
          </motion.div>
          <div className="platform-grid">
            <ModernCard delay={0}>
              <div className="platform-badge platform-badge-win">Windows</div>
              <h3>StreamCarnia for Windows</h3>
              <p>Built for reliable local downloads, quality control, and fast processing without friction.</p>
              <Link className="text-link" to="/download">Download for Windows <span aria-hidden="true">→</span></Link>
            </ModernCard>
            <ModernCard delay={0.1}>
              <div className="platform-badge platform-badge-soon">Coming Soon</div>
              <h3>Android</h3>
              <p>StreamCarnia is coming to Android with the same focus on quality, privacy, and simple workflows.</p>
              <div className="platform-soon-label">Android · Coming Soon</div>
            </ModernCard>
          </div>
        </section>

        <section className="landing-section" id="how-it-works">
          <motion.div className="section-heading" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="eyebrow">The simple way through</p>
            <h2>Three steps.<br /><em>One clean download.</em></h2>
          </motion.div>
          <div className="steps-grid">
            {[
              { number: "01", title: "Paste", description: "Paste your video URL." },
              { number: "02", title: "Choose", description: "Pick the quality you want." },
              { number: "03", title: "Download", description: "Get the source quality available." },
            ].map((step, idx) => (
              <motion.div
                key={step.number}
                className="step-item"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="landing-cta" id="about">
          <div className="cta-rune" aria-hidden="true">◌　◌　◌</div>
          <p className="eyebrow">Keep what matters</p>
          <h2>Make room for the<br /><em>moments worth keeping.</em></h2>
          <p className="cta-note">A quiet place for the things worth returning to.</p>
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <AnimatedButton onClick={() => window.location.href = "/download"} variant="primary" style={{ marginTop: "2rem" }}>
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
          <p>High-quality media downloads for Windows.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#features">Features</a>
          <Link to="/download">Download</Link>
          <Link to="/versions">Version History</Link>
        </nav>
        <div className="footer-meta">
          <p>Download content you have permission to save and use.</p>
          <small>© 2026 StreamCarnia</small>
        </div>
      </footer>
    </div>
  );
}

function LandingNav({ scrolled, menuOpen, onToggle, onNavigate }) {
  return (
    <header className={`landing-nav ${scrolled ? "nav-scrolled" : ""}`}>
      <Link className="brand" to="/" onClick={onNavigate} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <StreamCarniaLogo size="sm" animated />
        <span>StreamCarnia</span>
      </Link>
      <nav className={`nav-links ${menuOpen ? "nav-open" : ""}`}>
        <a href="#features" onClick={onNavigate}>Features</a>
        <Link to="/download" onClick={onNavigate}>Download</Link>
        <Link to="/versions" onClick={onNavigate}>Version History</Link>
      </nav>
    </header>
  );
}

