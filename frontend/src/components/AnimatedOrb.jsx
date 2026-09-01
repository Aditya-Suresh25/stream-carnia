import { motion } from "framer-motion";
import { useMotionValue, useSpring } from "framer-motion";

export function AnimatedOrb() {
  const rotateX = useSpring(useMotionValue(0), { stiffness: 180, damping: 22 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 180, damping: 22 });

  const handlePointerMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    rotateY.set(x * 18);
    rotateX.set(y * -18);
  };

  const handlePointerLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <div
      className="animated-orb-container favicon-3d-stage"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <motion.div
        className="favicon-3d-object"
        style={{ rotateX, rotateY }}
        animate={{ y: [0, -12, 0], rotateZ: [-1, 1, -1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="favicon-3d-depth" aria-hidden="true" />
        <img className="favicon-3d-image" src="/favicon.png" alt="StreamCarnia" draggable="false" />
        <div className="favicon-3d-glint" aria-hidden="true" />
      </motion.div>
      <div className="favicon-3d-shadow" aria-hidden="true" />
    </div>
  );
}
