import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import LandingPage from "../pages/LandingPage";
import DownloadPage from "../pages/DownloadPage";
import VersionHistoryPage from "../pages/VersionHistoryPage";
import AdminLoginPage from "../pages/AdminLoginPage";
import AdminDashboard from "../pages/AdminDashboard";
import NotFoundPage from "../pages/NotFoundPage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/versions" element={<VersionHistoryPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
