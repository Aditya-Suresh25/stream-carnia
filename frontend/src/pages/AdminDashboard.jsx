import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen, faCalendarDays, faChartBar, faDownload, faHardDrive, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";

function formatFileSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tab, setTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadingVersion, setUploadingVersion] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newRelease, setNewRelease] = useState({
    version: "",
    release_date: new Date().toISOString().split("T")[0],
    changelog: "",
    status: "stable",
    is_latest: false,
  });
  const [uploadedFile, setUploadedFile] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("admin_token");

  const handleExpiredSession = (message = "Your session expired. Please sign in again.") => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
    setError(message);
    return false;
  };

  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }
    fetchData();
  }, [token, navigate]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [analyticsRes, versionsRes] = await Promise.all([
        fetch("/api/admin/analytics/summary", { headers }),
        fetch("/api/admin/versions", { headers }),
      ]);

      if (analyticsRes.status === 401 || versionsRes.status === 401) {
        handleExpiredSession();
        return;
      }

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (versionsRes.ok) setVersions(await versionsRes.json());
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(() => {
      fetchData();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  const handleFileSelect = (file) => {
    if (!file.name.endsWith(".zip")) {
      setError("Only .zip files are allowed");
      return;
    }
    setUploadedFile(file);
    setError(null);
  };

  const handleCreateRelease = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newRelease.version) {
      setError("Version is required");
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      
      const res = await fetch("/api/admin/versions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...newRelease,
          download_url: "",
          file_size: uploadedFile?.size || null,
        }),
      });

      if (res.status === 401) {
        handleExpiredSession();
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to create release");
      }

      if (uploadedFile) {
        setUploadingVersion(newRelease.version);
        const formData = new FormData();
        formData.append("file", uploadedFile);

        const uploadRes = await fetch(`/api/admin/releases/upload/${newRelease.version}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (uploadRes.status === 401) {
          handleExpiredSession();
          return;
        }

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file");
        }

        const publishRes = await fetch(`/api/admin/releases/publish/${newRelease.version}`, {
          method: "POST",
          headers,
        });

        if (publishRes.status === 401) {
          handleExpiredSession();
          return;
        }

        if (!publishRes.ok) {
          throw new Error("Failed to publish release");
        }

        setUploadingVersion(null);
      }

      setSuccess("Release created successfully!");
      setNewRelease({
        version: "",
        release_date: new Date().toISOString().split("T")[0],
        changelog: "",
        status: "stable",
        is_latest: false,
      });
      setUploadedFile(null);
      setShowUploadModal(false);
      
      setTimeout(() => {
        setSuccess(null);
        fetchData();
      }, 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteRelease = async (version) => {
    if (!confirm(`Are you sure you want to delete version ${version}?`)) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`/api/admin/releases/${version}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) throw new Error("Failed to delete release");
      
      setSuccess("Release deleted!");
      setTimeout(() => {
        setSuccess(null);
        fetchData();
      }, 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!token) return null;

  return (
    <div className="admin-dashboard">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="admin-sidebar-header">
          <Link to="/" className="admin-brand">
            <div className="admin-brand-symbol"><i/><i/><i/></div>
            <span>StreamCarnia</span>
          </Link>
        </div>
        <nav className="admin-nav">
          {[
            { id: "overview", label: "Overview", icon: faChartBar },
            { id: "releases", label: "Releases", icon: faBoxOpen },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => setTab(item.id)} 
              className={`admin-nav-item ${tab === item.id ? "active" : ""}`}
            >
              <span className="admin-nav-icon"><FontAwesomeIcon icon={item.icon} aria-hidden="true" /></span>
              <span className="admin-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button onClick={handleLogout} className="admin-logout-btn"><FontAwesomeIcon icon={faRightFromBracket} aria-hidden="true" /> Logout</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1 className="admin-title">Dashboard</h1>
          <p className="admin-subtitle">Manage releases and analytics</p>
        </header>

        <div className="admin-content">
          {error && (
            <div className="admin-alert admin-alert-error">
              <span>⚠️</span>
              <span>{error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {success && (
            <div className="admin-alert admin-alert-success">
              <span>✓</span>
              <span>{success}</span>
            </div>
          )}

          {loading ? (
            <div className="admin-loading">
              <div className="admin-spinner" />
              <p>Loading...</p>
            </div>
          ) : (
            <>
              {tab === "overview" && analytics && (
                <div className="admin-tab-content">
                  <div className="admin-metrics-grid">
                    <div className="admin-metric-card">
                      <div className="admin-metric-label">Visitors</div>
                      <div className="admin-metric-value">{analytics.total_visitors}</div>
                      <div className="admin-metric-sub">Total visits</div>
                    </div>
                    <div className="admin-metric-card">
                      <div className="admin-metric-label">Unique Visitors</div>
                      <div className="admin-metric-value">{analytics.unique_visitors}</div>
                      <div className="admin-metric-sub">Distinct user agents</div>
                    </div>
                    <div className="admin-metric-card">
                      <div className="admin-metric-label">Downloads</div>
                      <div className="admin-metric-value">{analytics.total_downloads}</div>
                      <div className="admin-metric-sub">Total downloads</div>
                    </div>
                    <div className="admin-metric-card">
                      <div className="admin-metric-label">Conversion</div>
                      <div className="admin-metric-value">{analytics.conversion_rate.toFixed(1)}%</div>
                      <div className="admin-metric-sub">Downloads ÷ visits</div>
                    </div>
                    <div className="admin-metric-card">
                      <div className="admin-metric-label">Latest</div>
                      <div className="admin-metric-value">{analytics.latest_version || "—"}</div>
                      <div className="admin-metric-sub">Current version</div>
                    </div>
                  </div>

                  <div className="admin-card">
                    <h3 className="admin-card-title">Downloads by version</h3>
                    <div className="admin-version-chart">
                      {Object.entries(analytics.downloads_by_version || {}).length > 0 ? (
                        Object.entries(analytics.downloads_by_version).map(([version, count]) => {
                          const max = Math.max(...Object.values(analytics.downloads_by_version || { 0: 1 }));
                          const width = Math.max((count / Math.max(max, 1)) * 100, 10);

                          return (
                            <div key={version} className="admin-version-row">
                              <div className="admin-version-label">{version}</div>
                              <div className="admin-version-bar-wrap">
                                <div className="admin-version-bar" style={{ width: `${width}%` }} />
                              </div>
                              <div className="admin-version-count">{count}</div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="admin-empty-state">No download events yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {tab === "releases" && (
                <div className="admin-tab-content">
                  <div className="admin-releases-header">
                    <h2 className="admin-section-title">Release Management</h2>
                    <button 
                      onClick={() => setShowUploadModal(true)} 
                      className="admin-button admin-button-primary"
                    >
                      + New Release
                    </button>
                  </div>

                  {showUploadModal && (
                    <div className="admin-modal-overlay" onClick={() => setShowUploadModal(false)}>
                      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                          <h3>Create New Release</h3>
                          <button onClick={() => setShowUploadModal(false)} className="admin-modal-close">✕</button>
                        </div>
                        <form onSubmit={handleCreateRelease} className="admin-release-form">
                          <div className="admin-form-group">
                            <label className="admin-form-label">Version</label>
                            <input 
                              type="text" 
                              placeholder="e.g., 1.2.0" 
                              value={newRelease.version} 
                              onChange={(e) => setNewRelease({ ...newRelease, version: e.target.value })} 
                              className="admin-form-input" 
                              required 
                            />
                          </div>
                          <div className="admin-form-row">
                            <div className="admin-form-group">
                              <label className="admin-form-label">Release Date</label>
                              <input 
                                type="date" 
                                value={newRelease.release_date} 
                                onChange={(e) => setNewRelease({ ...newRelease, release_date: e.target.value })} 
                                className="admin-form-input" 
                                required 
                              />
                            </div>
                            <div className="admin-form-group">
                              <label className="admin-form-label">Status</label>
                              <select 
                                value={newRelease.status} 
                                onChange={(e) => setNewRelease({ ...newRelease, status: e.target.value })} 
                                className="admin-form-input"
                              >
                                <option value="stable">Stable</option>
                                <option value="beta">Beta</option>
                              </select>
                            </div>
                          </div>
                          <div className="admin-form-group">
                            <label className="admin-form-label">ZIP File</label>
                            <div 
                              className="admin-file-upload" 
                              onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]); }} 
                              onDragOver={(e) => e.preventDefault()}
                            >
                              <input 
                                type="file" 
                                accept=".zip" 
                                onChange={(e) => handleFileSelect(e.target.files?.[0])} 
                                className="admin-file-input" 
                                id="file-input" 
                              />
                              <label htmlFor="file-input" className="admin-file-label">
                                {uploadedFile ? (
                                  <>
                                    <span className="admin-file-icon">✓</span>
                                    <span className="admin-file-name">{uploadedFile.name}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="admin-file-icon">📎</span>
                                    <span>Drag & drop or click to upload</span>
                                  </>
                                )}
                              </label>
                            </div>
                          </div>
                          <div className="admin-form-group">
                            <label className="admin-form-label">Changelog</label>
                            <textarea 
                              placeholder="Describe what's new in this release..." 
                              value={newRelease.changelog} 
                              onChange={(e) => setNewRelease({ ...newRelease, changelog: e.target.value })} 
                              className="admin-form-textarea" 
                            />
                          </div>
                          <label className="admin-form-checkbox">
                            <input
                              type="checkbox"
                              checked={newRelease.is_latest}
                              onChange={(e) => setNewRelease({ ...newRelease, is_latest: e.target.checked })}
                            />
                            Mark as latest release
                          </label>
                          <div className="admin-modal-footer">
                            <button type="button" onClick={() => setShowUploadModal(false)} className="admin-button admin-button-secondary">Cancel</button>
                            <button type="submit" disabled={uploadingVersion} className="admin-button admin-button-primary">
                              {uploadingVersion ? "Uploading..." : "Create Release"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  <div className="admin-card">
                    <div className="admin-releases-list">
                      {versions.length === 0 ? (
                        <div className="admin-empty-state">
                          <p>No releases yet. Create one to get started!</p>
                        </div>
                      ) : (
                        versions.map((version) => (
                          <div key={version.version} className="admin-release-item">
                            <div className="admin-release-main">
                              <div className="admin-release-header">
                                <h4 className="admin-release-version">{version.version}</h4>
                                <div className="admin-release-badges">
                                  {version.is_latest && <span className="admin-badge admin-badge-latest">Latest</span>}
                                  <span className={`admin-badge admin-badge-${version.status}`}>{version.status}</span>
                                </div>
                              </div>
                              <div className="admin-release-meta">
                                <span><FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" /> {new Date(version.release_date).toLocaleDateString()}</span>
                                <span><FontAwesomeIcon icon={faHardDrive} aria-hidden="true" /> {formatFileSize(version.file_size)}</span>
                                <span><FontAwesomeIcon icon={faDownload} aria-hidden="true" /> {version.download_count} downloads</span>
                              </div>
                            </div>
                            <div className="admin-release-actions">
                              <button 
                                onClick={() => handleDeleteRelease(version.version)}
                                className="admin-button admin-button-small admin-button-danger"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
