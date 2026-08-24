import { useEffect, useRef, useState } from "react";
import { api, downloadSocketUrl } from "../services/api";

/**
 * Subscribes to live progress for a single download via WebSocket.
 * Falls back gracefully if the socket drops; the queue list still
 * gets periodic state from GET /api/download as a safety net elsewhere.
 */
export function useDownloadProgress(downloadId, initial) {
  const [item, setItem] = useState(initial || null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!downloadId) return undefined;

    const ws = new WebSocket(downloadSocketUrl(downloadId));
    socketRef.current = ws;
    const poll = window.setInterval(async () => {
      try {
        setItem(await api.getDownload(downloadId));
      } catch {
        /* the socket remains the primary progress channel */
      }
    }, 2000);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setItem(payload);
      } catch {
        /* ignore malformed frame */
      }
    };

    ws.onerror = () => {
      /* connection issue; UI keeps last known state */
    };

    return () => {
      ws.close();
      window.clearInterval(poll);
    };
  }, [downloadId]);

  return item;
}
