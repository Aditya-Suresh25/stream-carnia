import { motion } from "framer-motion";

export function StreamCarniaLogo({ size = "sm", animated = false }) {
  const sizes = {
    xs: "1.5rem",
    sm: "2rem",
    md: "2.5rem",
    lg: "3rem",
    xl: "4rem",
  };

  return (
    <motion.img
      src="/favicon.png"
      alt="StreamCarnia Logo"
      style={{
        width: sizes[size],
        height: sizes[size],
        display: "block",
        borderRadius: "50%",
      }}
      whileHover={animated ? { scale: 1.1, rotate: 5 } : undefined}
      transition={{ duration: 0.3 }}
    />
  );
}

export function StreamCarniaLogoBrand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 600 }}>
      <StreamCarniaLogo size="sm" animated />
      <span>StreamCarnia</span>
    </div>
  );
}
