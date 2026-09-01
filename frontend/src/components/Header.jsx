import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu automatically on route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleNavigate = () => setMenuOpen(false);

  return (
    <header className="global-header relative flex items-center justify-between py-5 z-50">
      {/* Brand / Logo */}
      <Link to="/" onClick={handleNavigate} className="flex items-center gap-3 z-50">
        <div className="w-9 h-9 flex items-center justify-center">
          <img
            src="/favicon.png"
            alt="StreamCarnia"
            className="w-9 h-9 object-contain"
          />
        </div>

        <div>
          <h1 className="text-sm font-semibold tracking-tight text-slate-100">
            StreamCarnia
          </h1>
      
        </div>
      </Link>

      {/* Mobile Hamburger Button */}
      <button
        className="menu-toggle block md:hidden z-50 p-2 text-slate-300 hover:text-white focus:outline-none"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle Navigation Menu"
        aria-expanded={menuOpen}
      >
        <div className={`hamburger ${menuOpen ? "open" : ""}`} />
      </button>

      {/* Navigation Links - Desktop Inline & Mobile Top-Down Overlay */}
      <nav
        className={`utility-nav nav-links ${menuOpen ? "nav-open" : ""}`}
        aria-label="Application navigation"
      >
        <NavLink to="/" end onClick={handleNavigate}>
          Home
        </NavLink>
        <NavLink to="/download" onClick={handleNavigate}>
          Download
        </NavLink>
        <NavLink to="/versions" onClick={handleNavigate}>
          Releases
        </NavLink>
      </nav>
    </header>
  );
}
