import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AnimatedButton } from "../components/ModernComponents";
import { StreamCarniaLogo } from "../components/StreamCarniaLogo";
import { apiUrl } from "../services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faBoxOpen, faChartBar, faKey, faUserShield, faUser } from "@fortawesome/free-solid-svg-icons";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem("admin_token");
    if (token) {
      navigate("/admin");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(apiUrl("/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (!data.token) {
          throw new Error("Login succeeded but no Appwrite session token was returned.");
        }
        localStorage.setItem("admin_token", data.token);
        window.location.assign("/admin");
      } else {
        const data = await res.json();
        setError(data.detail || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError(err.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="admin-login-page">
      {/* Background elements */}
      <div className="admin-login-background">
        <div className="admin-login-grid" aria-hidden="true" />
      </div>

      {/* Main content */}
      <motion.div
        className="admin-login-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Left section - Info */}
        <motion.div className="admin-login-info" variants={containerVariants} initial="hidden" animate="visible">
          <motion.div className="admin-login-info-content" variants={itemVariants}>
            <motion.div className="admin-login-logo" whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
              <Link to="/" className="brand" style={{ marginBottom: "3rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
                <StreamCarniaLogo size="md" animated />
                <span>StreamCarnia</span>
              </Link>
            </motion.div>

            <motion.h1 className="admin-login-title" variants={itemVariants}>Admin Access</motion.h1>
            <motion.p className="admin-login-subtitle" variants={itemVariants}>Manage releases and view analytics</motion.p>

            <motion.div className="admin-login-features" variants={containerVariants}>
              {[
                { icon: faBoxOpen, title: "Release Management", desc: "Upload and publish new versions" },
                { icon: faChartBar, title: "Analytics", desc: "Track downloads and visitors" },
                { icon: faUserShield, title: "Secure Dashboard", desc: "Token-based authentication" },
              ].map((feature, idx) => (
                <motion.div key={idx} className="admin-login-feature" variants={itemVariants}>
                  <span className="admin-login-feature-icon"><FontAwesomeIcon icon={feature.icon} aria-hidden="true" /></span>
                  <div>
                    <div className="admin-login-feature-title">{feature.title}</div>
                    <div className="admin-login-feature-desc">{feature.desc}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right section - Login form */}
        <motion.div
          className="admin-login-form-wrapper"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <motion.form onSubmit={handleLogin} className="admin-login-form" variants={containerVariants} initial="hidden" animate="visible">
            <motion.div className="admin-login-form-header" variants={itemVariants}>
              <h2>Welcome back</h2>
              <p>Sign in to your StreamCarnia admin account</p>
            </motion.div>

            {/* Appwrite account email field */}
            <motion.div className="admin-login-form-group" variants={itemVariants}>
              <label htmlFor="username" className="admin-login-form-label">
                <FontAwesomeIcon icon={faUser} aria-hidden="true" /> Email
              </label>
              <motion.div
                className={`admin-login-form-input-wrapper ${focusedField === "username" ? "focused" : ""}`}
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <input
                  id="username"
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  className="admin-login-form-input"
                  placeholder="Enter your admin email"
                  disabled={loading}
                  required
                  autoComplete="email"
                />
              </motion.div>
            </motion.div>

            {/* Password field */}
            <motion.div className="admin-login-form-group" variants={itemVariants}>
              <label htmlFor="password" className="admin-login-form-label">
                <FontAwesomeIcon icon={faKey} aria-hidden="true" /> Password
              </label>
              <motion.div
                className={`admin-login-form-input-wrapper ${focusedField === "password" ? "focused" : ""}`}
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  className="admin-login-form-input"
                  placeholder="Enter your password"
                  disabled={loading}
                  required
                  autoComplete="current-password"
                />
              </motion.div>
            </motion.div>

            {/* Error message */}
            {error && (
              <motion.div
                className="admin-login-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <span className="admin-login-error-icon">⚠️</span>
                <span>{error}</span>
              </motion.div>
            )}

            {/* Submit button */}
            <motion.div variants={itemVariants}>
              <AnimatedButton
                onClick={handleLogin}
                variant="primary"
                loading={loading}
                style={{
                  width: "100%",
                  padding: "0.8rem 1.5rem",
                  fontSize: "0.95rem",
                  marginBottom: "1.5rem",
                }}
              >
                {loading ? "Signing in..." : "Sign In"}
                {!loading && <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />}
              </AnimatedButton>
            </motion.div>

            {/* Footer note */}
            <motion.p className="admin-login-form-footer" variants={itemVariants}>
              <Link to="/" className="admin-login-form-link">
                🏠 Back to StreamCarnia
              </Link>
            </motion.p>
          </motion.form>
        </motion.div>
      </motion.div>
    </div>
  );
}

