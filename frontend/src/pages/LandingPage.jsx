import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const features = [
  ["01", "Original quality", "Keep the highest available quality without unnecessary re-encoding."],
  ["02", "1440p & 60 FPS", "Preserve high-resolution and high-frame-rate video when available."],
  ["03", "Livestream VODs", "Save completed livestreams and long-form recordings."],
  ["04", "Video + audio", "Automatically combine separate streams when a merge is required."],
  ["05", "Real-time progress", "See exactly what is happening from first byte to final file."],
  ["06", "Local & private", "Your downloads stay on your machine, under your control."],
];

const qualityRows = ["360p", "720p", "1080p", "1440p", "1440p 60", "4K"];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [orbStyle, setOrbStyle] = useState({ transform: "translate3d(0, 0, 0)" });

  useEffect(() => {
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
    const onPointerMove = (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 10;
      const y = (event.clientY / window.innerHeight - 0.5) * 10;
      setOrbStyle({ transform: `translate3d(${x}px, ${y}px, 0)` });
    };
    revealVisible();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="landing-page">
      <LandingNav scrolled={scrolled} menuOpen={menuOpen} onToggle={() => setMenuOpen(!menuOpen)} onNavigate={closeMenu} />
      <main>
        <section className="landing-hero" id="top">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy reveal-up">
            <p className="eyebrow"><span className="eyebrow-mark" /> StreamCarnia</p>
            <h1>Don't let good streams<br /><em>fade with time..</em></h1>
            <p className="hero-lede">Download videos and livestreams with the quality they were meant to have.</p>
            <Link className="landing-button landing-button-primary" to="/download">Start downloading <span aria-hidden="true">↗</span></Link>
            <a className="hero-scroll" href="#features">Explore StreamCarnia <span aria-hidden="true">↓</span></a>
          </div>
          <div className="time-orb-wrap reveal-orb" aria-label="Abstract time and stream motif">
            <div className="time-orb" style={orbStyle}>
              <div className="orb-ring orb-ring-outer" />
              <div className="orb-ring orb-ring-middle" />
              <div className="orb-core"><span className="play-mark" /></div>
              <span className="orb-note note-one" /><span className="orb-note note-two" /><span className="orb-note note-three" />
            </div>
            <p className="orb-caption">A clear path from signal<br />to story</p>
          </div>
        </section>

        <section className="landing-section feature-section" id="features">
          <div className="section-heading reveal-up reveal-on-scroll"><p className="eyebrow">Built for the keepers</p><h2>Everything you need.<br /><em>Nothing you don't.</em></h2></div>
          <div className="feature-grid">{features.map(([number, title, copy]) => <article className="feature-item reveal-up reveal-on-scroll" key={title}><span className="feature-number">{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
        </section>

        <section className="quality-section" id="quality">
          <div className="quality-copy reveal-up reveal-on-scroll"><p className="eyebrow">Quality, selected</p><h2>Keep the detail<br /><em>in the moment.</em></h2><p>StreamCarnia surfaces the formats your source actually offers, so you can choose with confidence.</p><Link className="text-link" to="/download">Open the downloader <span aria-hidden="true">→</span></Link></div>
          <div className="quality-console reveal-up reveal-on-scroll" aria-label="Example quality selection"><div className="console-top"><span>AVAILABLE QUALITY</span><span className="console-live"><i /> SOURCE SIGNAL</span></div>{qualityRows.map((quality) => <div className={`quality-row ${quality === "1440p 60" ? "quality-selected" : ""}`} key={quality}><span>{quality}</span>{quality === "1440p 60" ? <b>BEST AVAILABLE</b> : <span className="quality-line" />}</div>)}</div>
        </section>

        <section className="landing-section steps-section" id="how-it-works">
          <div className="section-heading reveal-up reveal-on-scroll"><p className="eyebrow">The simple way through</p><h2>Three steps.<br /><em>One clean download.</em></h2></div>
          <div className="steps-grid">{[["01", "Paste", "Paste your video URL."], ["02", "Choose", "Pick the quality you want."], ["03", "Download", "Get the source quality available."]].map(([number, title, copy]) => <article className="step-item reveal-up reveal-on-scroll" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
        </section>

        <section className="landing-cta" id="about"><div className="cta-rune" aria-hidden="true">◌　◌　◌</div><p className="eyebrow">Keep what matters</p><h2>Make room for the<br /><em>moments worth keeping.</em></h2><p className="cta-note">A quiet place for the things worth returning to.</p></section>
      </main>
      <footer className="landing-footer"><div><strong>StreamCarnia</strong><p>Video downloads, without the compromise.</p></div><nav aria-label="Footer navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><Link to="/download">Tool</Link></nav><div className="footer-meta"><p>Built for creators & archivists.</p><p>Download content you have permission to save and use.</p><small>© 2026 StreamCarnia</small></div></footer>
    </div>
  );
}

function LandingNav({ scrolled, menuOpen, onToggle, onNavigate }) {
  return (
    <header className={`landing-nav ${scrolled ? "nav-scrolled" : ""}`}>
      <a className="brand" href="#top" onClick={onNavigate}>
        <img
          className="brand-logo"
          src="/favicon.png"
          alt="StreamCarnia"
        />

        <span>StreamCarnia</span>
      </a>

      <button
        className="menu-toggle"
        onClick={onToggle}
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
      >
        <span />
        <span />
      </button>

      <nav className={menuOpen ? "nav-links nav-open" : "nav-links"}>
        <a href="#features" onClick={onNavigate}>Features</a>
        <a href="#how-it-works" onClick={onNavigate}>How it works</a>
        <a href="#about" onClick={onNavigate}>About</a>
        <Link className="nav-cta" to="/download" onClick={onNavigate}>
          Get started <span aria-hidden="true">↗</span>
        </Link>
      </nav>
    </header>
  );
}

