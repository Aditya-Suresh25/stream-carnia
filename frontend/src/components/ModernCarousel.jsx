import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";

export function ModernCarousel({ children, autoPlay = true, interval = 4000, showDots = true }) {
  const [current, setCurrent] = useState(0);
  const items = Array.isArray(children) ? children : [children];
  const count = items.length;

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % count);
    }, interval);
    return () => clearInterval(timer);
  }, [count, interval, autoPlay]);

  const next = () => setCurrent((prev) => (prev + 1) % count);
  const prev = () => setCurrent((prev) => (prev - 1 + count) % count);
  const goTo = (index) => setCurrent(index);

  return (
    <div className="modern-carousel">
      <div className="carousel-viewport">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="carousel-item"
          >
            {items[current]}
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <>
          <button className="carousel-nav carousel-prev" onClick={prev} aria-label="Previous">
            <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
          </button>
          <button className="carousel-nav carousel-next" onClick={next} aria-label="Next">
            <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
          </button>

          {showDots && (
            <div className="carousel-dots">
              {items.map((_, idx) => (
                <motion.button
                  key={idx}
                  className={`carousel-dot ${idx === current ? "active" : ""}`}
                  onClick={() => goTo(idx)}
                  whileHover={{ scale: 1.2 }}
                  aria-label={`Go to item ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function CarouselGrid({ children, cols = 3, gap = "2rem" }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const items = Array.isArray(children) ? children : [children];

  return (
    <div className="carousel-grid" style={{ gap }}>
      {items.map((item, idx) => (
        <motion.div
          key={idx}
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4, delay: idx * 0.05 }}
          className="carousel-grid-item"
          onClick={() => setActiveSlide(idx)}
        >
          {item}
        </motion.div>
      ))}
    </div>
  );
}
