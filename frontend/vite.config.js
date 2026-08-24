import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendUrl = process.env.VITE_API_URL || "http://127.0.0.1:8000";
const backendWsUrl = process.env.VITE_WS_URL || "ws://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": backendUrl,
      "/ws": {
        target: backendWsUrl,
        ws: true,
      },
    },
  },
});
