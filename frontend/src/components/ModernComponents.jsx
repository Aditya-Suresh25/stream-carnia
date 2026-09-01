import { motion } from "framer-motion";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faStar } from "@fortawesome/free-solid-svg-icons";

export function ModernCard({ children, className = "", delay = 0, hover3d = true }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={`modern-card ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={hover3d ? { y: -8 } : undefined}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={
        hover3d && isHovered
          ? {
              perspective: "1000px",
              transform: "translateZ(20px) rotateX(5deg) rotateY(-5deg)",
            }
          : {}
      }
    >
      {children}
    </motion.div>
  );
}

export function AnimatedButton({ children, onClick, variant = "primary", loading = false }) {
  return (
    <motion.button
      className={`animated-button animated-button-${variant}`}
      onClick={onClick}
      disabled={loading}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="button-content"
        animate={loading ? { opacity: 0.7 } : { opacity: 1 }}
      >
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{ display: "inline-block" }}
          >
            <FontAwesomeIcon icon={faGear} aria-hidden="true" />
          </motion.div>
        ) : (
          children
        )}
      </motion.div>
      <div className="button-shimmer" />
    </motion.button>
  );
}

export function FeatureCard({ number, title, description, icon = faStar, delay = 0 }) {
  return (
    <ModernCard delay={delay}>
      <motion.div
        className="feature-card-inner"
        whileHover={{
          scale: 1.02,
        }}
      >
        <motion.div
          className="feature-icon"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <FontAwesomeIcon icon={icon} aria-hidden="true" />
        </motion.div>
        <div className="feature-number">{number}</div>
        <h3 className="feature-title">{title}</h3>
        <p className="feature-description">{description}</p>
        <div className="feature-shine" />
      </motion.div>
    </ModernCard>
  );
}

export function GlassContainer({ children, className = "" }) {
  return (
    <motion.div
      className={`glass-container ${className}`}
      initial={{ backdropFilter: "blur(0px)" }}
      whileInView={{ backdropFilter: "blur(10px)" }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
