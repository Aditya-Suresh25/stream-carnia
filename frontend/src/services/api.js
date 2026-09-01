const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const WS_ORIGIN = (import.meta.env.VITE_WS_URL || "").replace(/\/$/, "");
const BASE = `${API_ORIGIN}/api`;

export function apiUrl(path) {
  return `${BASE}${path}`;
}

async function request(path, options = {}) {
  const headers = options.body
    ? { "Content-Type": "application/json", ...options.headers }
    : options.headers;
  const res = await fetch(apiUrl(path), {
    ...options,
    ...(headers ? { headers } : {}),
  });
  if (!res.ok) {
    let detail = "Request failed.";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  health: () => request("/health"),
  getLatestVersion: () => request("/admin/versions/latest"),
  getVersions: () => request("/admin/versions"),
  trackPageVisit: (payload) => request("/admin/track/page-visit", { method: "POST", body: JSON.stringify(payload) }),
  trackDownload: (payload) => request("/admin/track/download", { method: "POST", body: JSON.stringify(payload) }),
  releaseDownloadUrl: (version) => `${BASE}/admin/releases/${encodeURIComponent(version)}/download`,
  analyze: (url) => request("/analyze", { method: "POST", body: JSON.stringify({ url }) }),
  startDownload: (payload) => request("/download", { method: "POST", body: JSON.stringify(payload) }),
  listDownloads: () => request("/download"),
  getDownload: (id) => request(`/download/${id}`),
  downloadFileUrl: (id) => `${BASE}/download/${id}/file`,
  cancelDownload: (id) => request(`/download/${id}/cancel`, { method: "POST" }),
  removeDownload: (id) => request(`/download/${id}`, { method: "DELETE" }),
  getSettings: () => request("/settings"),
  updateSettings: (settings) => request("/settings", { method: "PUT", body: JSON.stringify(settings) }),
  getHistory: () => request("/history"),
  deleteHistoryEntry: (id) => request(`/history/${id}`, { method: "DELETE" }),
};

export function downloadSocketUrl(downloadId) {
  const origin = WS_ORIGIN || `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;
  return `${origin}/ws/download/${downloadId}`;
}
