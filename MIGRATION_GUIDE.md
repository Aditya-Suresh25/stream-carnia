# StreamCarnia Website Transformation Guide

## Overview

This document describes the complete transformation of the StreamCarnia website from a web-based video downloader to an official product landing page and software distribution site for the standalone Windows desktop application.

## Key Changes

### 1. Website Purpose Transformation

**Before:**
- Web-based YouTube downloader
- Browser-based video quality selection
- In-browser download queue management
- Web-based download history

**After:**
- Product landing page showcasing StreamCarnia Desktop
- Software download distribution point
- Version history and release notes
- Private admin dashboard for analytics and version management
- Download tracking and analytics

### 2. Pages Overview

#### Public Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Landing Page | Product showcase with features and hero section |
| `/download` | Download Page | Information about latest release and download CTA |
| `/versions` | Version History | All releases with changelogs and download links |
| `/404` | Not Found | Custom 404 error page |

#### Admin Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/admin/login` | Admin Login | Secure authentication for admin panel |
| `/admin` | Admin Dashboard | Analytics, version management, and metrics |

### 3. Backend Changes

#### New Endpoints

All new endpoints use the `/api/admin` prefix.

**Public Endpoints (No Authentication Required):**
- `POST /api/admin/track/page-visit` - Track page visits
- `POST /api/admin/track/download` - Track download events
- `GET /api/admin/versions` - Get all versions
- `GET /api/admin/versions/latest` - Get latest version

**Admin Endpoints (Authentication Required with Bearer Token):**
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `POST /api/admin/versions` - Create new version
- `PUT /api/admin/versions/{version}` - Update version
- `GET /api/admin/analytics/summary` - Get analytics dashboard summary
- `GET /api/admin/analytics/visitor-trends` - Get visitor trends
- `GET /api/admin/analytics/download-trends` - Get download trends

#### Database Schema

**New SQLite Database: `analytics.db`**

Tables:
1. `admin_users` - Admin account management
2. `versions` - Software version tracking
3. `page_visits` - Analytics tracking
4. `download_events` - Download tracking

### 4. Frontend Changes

#### Removed Components/Pages
- `Home.jsx` (Web downloader interface)
- `HistoryPage.jsx` (Web download history)
- `SettingsPage.jsx` (Web downloader settings)
- `UrlInput.jsx` (Web URL input)
- `VideoInfo.jsx` (Web video information)
- `DownloadQueue.jsx` (Web download queue)
- `DownloadCard.jsx` (Web download item display)
- `QualitySelector.jsx` (Web quality selection)
- `ProgressBar.jsx` (Web progress indicator)
- `SaveFileModal.jsx` (Web save dialog)

#### New Components/Pages
- `DownloadPage.jsx` - Desktop application download page
- `VersionHistoryPage.jsx` - Version history and releases
- `AdminLoginPage.jsx` - Admin authentication
- `AdminDashboard.jsx` - Admin panel with analytics

#### Updated Components
- `LandingPage.jsx` - Updated tagline and navigation
- `NotFoundPage.jsx` - Styled with new landing page theme
- `AppRoutes.jsx` - Updated routing structure

### 5. Design System Preservation

✅ **All original StreamCarnia theming preserved:**
- Color palette: Dark ink, forest green, gold, cream
- Typography: Space Grotesk (headings), DM Sans (body)
- Zelda-inspired design language
- Mystical orb animations
- Premium, minimal aesthetic

### 6. Environment Variables

**Frontend (.env)**
```
VITE_DOWNLOAD_URL=https://your-download-url/streamcarnia-latest.zip
VITE_API_URL=http://localhost:8000 (optional, defaults to same origin)
VITE_WS_URL=ws://localhost:8000 (optional, for future WebSocket features)
```

**Backend (.env)**
```
ANALYTICS_DB_PATH=backend/downloads/analytics.db
```

All other backend variables remain unchanged.

## Setup Instructions

### Initial Setup

1. **Backend Configuration**
   ```bash
   # Create admin user (run once)
   python -c "from backend.services.analytics_store import AnalyticsStore; \
   store = AnalyticsStore('backend/downloads/analytics.db'); \
   store.create_admin_user('admin', 'your_secure_password')"
   ```

2. **Environment Variables**
   - Copy `.env.example` to `.env` in both frontend and backend
   - Set `VITE_DOWNLOAD_URL` to your ZIP file location
   - Set admin credentials

3. **Start Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

4. **Start Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Adding Your First Version

1. Navigate to `/admin/login`
2. Login with your admin credentials
3. Go to the **Versions** tab
4. Fill in version details:
   - Version: `1.0.0`
   - Release Date: `2026-01-01`
   - Download URL: Your ZIP file URL
   - File Size: Size in bytes
   - Changelog: Release notes
   - Mark as Latest: Check if this is the current release
5. Click "Add Version"

### Changing the Latest Version

1. In Admin Dashboard → Versions tab
2. Click "Edit" on the version you want to promote
3. Check "Mark as Latest Version"
4. Save

The public download page will automatically show the latest version.

## File Structure

```
frontend/
  src/
    pages/
      LandingPage.jsx          (Product showcase - UPDATED)
      DownloadPage.jsx         (Software download - NEW)
      VersionHistoryPage.jsx   (Release history - NEW)
      AdminLoginPage.jsx       (Admin login - NEW)
      AdminDashboard.jsx       (Admin dashboard - NEW)
      NotFoundPage.jsx         (404 page - UPDATED)

backend/
  api/
    admin_routes.py            (Admin endpoints - NEW)
  services/
    analytics_store.py         (Analytics database - NEW)
```

## Analytics & Tracking

### What Gets Tracked

**Page Visits:**
- Page name
- Timestamp
- Referrer (if available)
- User agent (for anonymous analytics)

**Download Events:**
- Version number
- Timestamp
- Source (e.g., "download-page", "version-history")
- Referrer (if available)
- User agent (for anonymous analytics)

### Admin Dashboard Metrics

- **Total Visitors:** Count of unique user agents
- **Unique Visitors:** Count of distinct sessions
- **Total Downloads:** Count of download events
- **Conversion Rate:** Downloads ÷ Visitors %
- **Downloads by Version:** Breakdown by version
- **Visitor Trends:** 30-day rolling chart
- **Download Trends:** 30-day rolling chart

## Deployment

### Environment Setup

**Production Frontend:**
```
VITE_DOWNLOAD_URL=https://your-cdn.com/streamcarnia-1.0.0.zip
VITE_API_URL=https://api.streamcarnia.com
```

**Production Backend:**
```
CORS_ORIGINS=https://streamcarnia.com,https://www.streamcarnia.com
ANALYTICS_DB_PATH=/var/lib/streamcarnia/analytics.db
```

### Database Backup

Regular backups of `analytics.db` are recommended:
```bash
# Backup analytics database
cp backend/downloads/analytics.db backups/analytics-$(date +%Y%m%d).db
```

### Download URL Configuration

The download URL can be changed without code modifications:

1. **GitHub Releases:** Upload ZIP to GitHub, use release download URL
2. **CDN:** Upload to CDN, use CDN URL
3. **Cloud Storage:** Upload to S3/GCS, use presigned URL
4. **Direct Server:** Host ZIP on your server

Simply update `VITE_DOWNLOAD_URL` environment variable and redeploy frontend.

## Security Considerations

⚠️ **Important Security Notes:**

1. **Admin Credentials:** Change default admin password immediately
2. **CORS Configuration:** Set appropriate CORS origins in production
3. **HTTPS Required:** Always use HTTPS in production
4. **Token Expiry:** Admin tokens expire after 24 hours (configurable)
5. **Database:** SQLite analytics database should be backed up regularly
6. **No Passwords in Code:** Never commit credentials or secrets

### Future Improvements for Production

- [ ] Use proper authentication library (OAuth2, JWT)
- [ ] Implement Redis for token storage instead of in-memory
- [ ] Add rate limiting for API endpoints
- [ ] Implement audit logging for admin actions
- [ ] Add two-factor authentication for admin panel
- [ ] Use HSTS headers for HTTPS enforcement
- [ ] Implement IP whitelisting for admin panel

## Migration Checklist

- [x] Remove web downloader components
- [x] Create download page for desktop app
- [x] Create version history page
- [x] Implement admin authentication
- [x] Build admin dashboard with analytics
- [x] Setup version management system
- [x] Configure environment variables
- [x] Preserve original color scheme and design
- [x] Update navigation structure
- [x] Create tracking system
- [ ] Set admin credentials
- [ ] Configure download URL
- [ ] Test all pages in production environment
- [ ] Deploy to production
- [ ] Set up monitoring and alerts
- [ ] Configure CDN/download distribution

## Troubleshooting

### Admin login not working
- Verify admin user exists in database
- Check that credentials are correct
- Ensure `ANALYTICS_DB_PATH` is set correctly

### Download tracking not showing
- Check that `/api/admin/track/download` endpoint is being called
- Verify analytics database exists and is writable
- Check browser console for network errors

### Latest version not updating
- Verify version marked as "Latest" in admin dashboard
- Clear browser cache
- Reload `/download` page
- Check API returns correct latest version: GET `/api/admin/versions/latest`

### Environment variables not working
- Verify `.env` file exists in correct directory
- Restart frontend dev server after changing `.env`
- Check that variable is prefixed with `VITE_` for frontend

## Support

For issues or questions about the transformation, review:
1. This guide's troubleshooting section
2. API documentation in admin_routes.py
3. Component documentation in frontend pages
4. Backend logging output

---

**Last Updated:** 2026-09-01  
**StreamCarnia Version:** 1.0.0 (Desktop)
