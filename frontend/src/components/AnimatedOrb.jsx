import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

export function AnimatedOrb() {
  const containerRef = useRef(null);

  useEffect(() => {
    const onPointerMove = (event) => {
      if (!containerRef.current) return;
      const { clientX, clientY } = event;
      const { width, height, left, top } = containerRef.current.getBoundingClientRect();
      const x = (clientX - left - width / 2) / 20;
      const y = (clientY - top - height / 2) / 20;
      containerRef.current.style.transform = `perspective(1000px) rotateX(${y}deg) rotateY(${x}deg)`;
    };

    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  return (
    <div ref={containerRef} className="animated-orb-container" style={{ transition: "transform 0.1s ease-out" }}>
      <motion.div
        className="animated-orb"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 400 400" className="orb-svg">
          <defs>
            <radialGradient id="orbGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d7aa58" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#143a2f" stopOpacity="0.1" />
            </radialGradient>
            <filter id="orbGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer rotating ring */}
          <motion.circle
            cx="200"
            cy="200"
            r="180"
            fill="none"
            stroke="url(#orbGradient)"
            strokeWidth="2"
            opacity="0.5"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />

          {/* Middle ring */}
          <motion.circle
            cx="200"
            cy="200"
            r="120"
            fill="none"
            stroke="#d7aa58"
            strokeWidth="1.5"
            opacity="0.3"
            animate={{ rotate: -180 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          />

          {/* Core sphere with glow */}
          <circle cx="200" cy="200" r="60" fill="url(#orbGradient)" filter="url(#orbGlow)" opacity="0.8" />

          {/* Orbiting points */}
          {[0, 120, 240].map((angle) => (
            <motion.circle
              key={angle}
              cx="200"
              cy="200"
              r="5"
              fill="#d7aa58"
              animate={{
                cx: Math.cos((angle * Math.PI) / 180) * 140 + 200,
                cy: Math.sin((angle * Math.PI) / 180) * 140 + 200,
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              filter="url(#orbGlow)"
              opacity="0.9"
            />
          ))}

          {/* Play symbol */}
          <g transform="translate(200, 200)">
            <polygon points="0,-12 16,0 0,12" fill="#d7aa58" opacity="0.7" />
          </g>
        </svg>
      </motion.div>

      <motion.div
        className="orb-pulse"
        animate={{
          boxShadow: [
            "0 0 30px rgba(215, 170, 88, 0.2)",
            "0 0 60px rgba(215, 170, 88, 0.4)",
            "0 0 30px rgba(215, 170, 88, 0.2)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </div>
  );
}
