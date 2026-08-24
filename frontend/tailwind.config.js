/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0a0b0f",
          900: "#111319",
          850: "#161821",
          800: "#1c1f2a",
          700: "#272b3a",
          600: "#383d52",
        },
        accent: {
          400: "#8b93ff",
          500: "#6c73f0",
          600: "#565dd6",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.05), 0 8px 30px rgba(0,0,0,0.4)",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        pulseSoft: { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.6 } },
      },
      animation: {
        fadeIn: "fadeIn 0.25s ease-out",
        pulseSoft: "pulseSoft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
