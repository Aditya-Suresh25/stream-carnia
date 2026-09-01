"""Admin panel and analytics API endpoints."""
from __future__ import annotations

import logging
import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, Depends, UploadFile, File
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel

from backend.app_settings import settings_store
from backend.services.analytics_store import AnalyticsStore
from backend.services.appwrite_service import appwrite_service
from backend.services.github_release_service import GitHubReleaseError, github_release_service

logger = logging.getLogger("api.admin")

router = APIRouter(prefix="/admin")


def _github_unavailable(exc: GitHubReleaseError) -> HTTPException:
    logger.error("GitHub Releases request failed: %s", exc)
    return HTTPException(status_code=503, detail="GitHub Releases is unavailable. Check GITHUB_OWNER, GITHUB_REPOSITORY, and GITHUB_TOKEN.")

# Initialize analytics store
analytics_store = AnalyticsStore(
    db_path=os.getenv("ANALYTICS_DB_PATH", os.path.join(
        os.path.dirname(settings_store.db_path), "analytics.db"
    ))
)

# Ensure releases directory exists
RELEASES_DIR = Path(os.getenv("RELEASES_DIR", os.path.join(
    os.path.dirname(settings_store.db_path), "releases"
)))
RELEASES_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================================
# Request/Response Models
# ============================================================================

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    message: str


class VersionInput(BaseModel):
    version: str
    release_date: str
    download_url: str
    file_size: Optional[int] = None
    changelog: Optional[str] = None
    status: str = "stable"
    is_latest: bool = False


class VersionResponse(BaseModel):
    version: str
    release_date: str
    status: str
    download_url: str
    file_size: Optional[int] = None
    changelog: Optional[str] = None
    is_latest: bool
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    uploaded_at: Optional[str] = None
    is_published: bool = False
    download_count: int = 0


class AnalyticsSummary(BaseModel):
    total_visitors: int
    unique_visitors: int
    total_downloads: int
    downloads_by_version: dict
    conversion_rate: float
    latest_version: Optional[str]


class PageVisitRequest(BaseModel):
    page: str
    user_agent: Optional[str] = None
    referrer: Optional[str] = None


class DownloadEventRequest(BaseModel):
    version: Optional[str] = None
    user_agent: Optional[str] = None
    referrer: Optional[str] = None
    source: str = "direct"


class FileUploadResponse(BaseModel):
    success: bool
    message: str
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_at: Optional[str] = None


# ============================================================================
# Authentication (Simple Token-based, production should use better auth)
# ============================================================================

_ADMIN_TOKENS = {}  # In-memory token store; tokens are invalidated on backend restarts.


def _generate_token(username: str) -> str:
    """Generate a simple token."""
    import secrets
    token = secrets.token_hex(32)
    expiry = datetime.utcnow() + timedelta(hours=24)
    _ADMIN_TOKENS[token] = {"username": username, "expiry": expiry}
    return token


def _verify_token(token: Optional[str]) -> dict | None:
    """Verify token and return user info if valid."""
    if not token or token not in _ADMIN_TOKENS:
        return None
    
    token_data = _ADMIN_TOKENS[token]
    if datetime.utcnow() > token_data["expiry"]:
        del _ADMIN_TOKENS[token]
        return None
    
    return token_data


def _require_admin(authorization: Optional[str] = Header(None)) -> dict:
    """Dependency for protected admin routes."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.replace("Bearer ", "")

    if appwrite_service.enabled:
        user = appwrite_service.verify_session(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired Appwrite session")
        return user

    user = _verify_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user


# ============================================================================
# Public Analytics Endpoints (no auth required)
# ============================================================================

@router.post("/track/page-visit")
def track_page_visit(visit: PageVisitRequest):
    """Track a page visit."""
    analytics_store.record_page_visit(
        page=visit.page,
        user_agent=visit.user_agent,
        referrer=visit.referrer,
    )
    return {"success": True}


@router.post("/track/download")
def track_download(event: DownloadEventRequest):
    """Track a download event."""
    analytics_store.record_download_event(
        version=event.version,
        user_agent=event.user_agent,
        referrer=event.referrer,
        source=event.source,
    )
    
    # Increment download count if version specified
    if event.version:
        analytics_store.increment_download_count(event.version)
    
    return {"success": True}


@router.get("/releases/{version}/download")
def download_release(version: str):
    """Download a specific release version (public endpoint)."""
    if github_release_service.enabled:
        try:
            release = github_release_service.find_version(version)
        except GitHubReleaseError as exc:
            raise _github_unavailable(exc) from exc
        if not release or not release["download_url"]:
            raise HTTPException(status_code=404, detail="Published release asset not found")
        return RedirectResponse(release["download_url"], status_code=307)

    file_info = analytics_store.get_release_file_info(version)
    
    if not file_info or not file_info.get("file_path"):
        raise HTTPException(status_code=404, detail="Release not found")
    
    file_path = Path(file_info["file_path"])
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Release file not found")
    
    # Track download
    analytics_store.increment_download_count(version)
    
    return FileResponse(
        file_path,
        media_type="application/zip",
        filename=file_info.get("file_name", f"StreamCarnia-{version}.zip"),
    )


# ============================================================================
# Admin Authentication
# ============================================================================

@router.post("/login")
def login(request: LoginRequest) -> LoginResponse:
    """Admin login endpoint."""
    if appwrite_service.enabled:
        try:
            session = appwrite_service.authenticate(request.username, request.password)
        except Exception as exc:
            logger.warning("Appwrite login failed: %s", exc)
            raise HTTPException(status_code=401, detail="Invalid credentials") from exc
        return LoginResponse(success=True, token=session["token"], message="Login successful")

    if analytics_store.verify_admin_user(request.username, request.password):
        token = _generate_token(request.username)
        return LoginResponse(
            success=True,
            token=token,
            message="Login successful"
        )
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/logout")
def logout(user: dict = Depends(_require_admin)):
    """Admin logout endpoint."""
    # In this simple implementation, we just return success
    # In production, remove the token from the store
    return {"success": True}


# ============================================================================
# Version Management
# ============================================================================

@router.get("/versions")
def get_all_versions() -> list[VersionResponse]:
    """Get all versions (public endpoint)."""
    if github_release_service.enabled:
        try:
            return [VersionResponse(**version) for version in github_release_service.list_versions()]
        except GitHubReleaseError as exc:
            raise _github_unavailable(exc) from exc

    versions = analytics_store.get_all_versions_with_files()
    return [
        VersionResponse(
            version=v["version"],
            release_date=v["release_date"],
            status=v["status"],
            download_url=v["download_url"],
            file_size=v["file_size"],
            changelog=v["changelog"],
            is_latest=v.get("is_latest", False),
            file_path=v.get("file_path"),
            file_name=v.get("file_name"),
            uploaded_at=v.get("uploaded_at"),
            is_published=v.get("is_published", False),
            download_count=v.get("download_count", 0),
        )
        for v in versions
    ]


@router.get("/versions/latest")
def get_latest_version() -> VersionResponse | None:
    """Get the latest published/latest version for public download pages."""
    if github_release_service.enabled:
        try:
            versions = github_release_service.list_versions()
        except GitHubReleaseError as exc:
            raise _github_unavailable(exc) from exc
        if not versions:
            raise HTTPException(status_code=404, detail="No versions found")
        selected = next((item for item in versions if item["is_latest"] or item["is_published"]), versions[0])
        return VersionResponse(**selected)

    versions = analytics_store.get_all_versions_with_files()
    if not versions:
        raise HTTPException(status_code=404, detail="No versions found")

    selected = None
    for candidate in versions:
        if candidate.get("is_latest") or candidate.get("is_published"):
            selected = candidate
            break
    if selected is None:
        selected = versions[0]

    file_info = analytics_store.get_release_file_info(selected["version"])
    download_url = selected.get("download_url") or (
        f"/api/admin/releases/{selected['version']}/download" if file_info else ""
    )

    return VersionResponse(
        version=selected["version"],
        release_date=selected["release_date"],
        status=selected["status"],
        download_url=download_url,
        file_size=selected["file_size"],
        changelog=selected["changelog"],
        is_latest=bool(selected.get("is_latest")),
        file_path=file_info.get("file_path") if file_info else None,
        file_name=file_info.get("file_name") if file_info else None,
        uploaded_at=file_info.get("uploaded_at") if file_info else None,
        is_published=file_info.get("is_published", False) if file_info else bool(selected.get("is_published")),
        download_count=file_info.get("download_count", 0) if file_info else 0,
    )


@router.post("/versions")
def create_version(
    version_data: VersionInput,
    user: dict = Depends(_require_admin),
) -> VersionResponse:
    """Create a new version (admin only)."""
    if github_release_service.enabled:
        try:
            return VersionResponse(**github_release_service.create_version(version_data.model_dump()))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except GitHubReleaseError as exc:
            raise _github_unavailable(exc) from exc

    success = analytics_store.create_version(
        version=version_data.version,
        release_date=version_data.release_date,
        download_url=version_data.download_url,
        file_size=version_data.file_size,
        changelog=version_data.changelog,
        status=version_data.status,
        is_latest=version_data.is_latest,
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Version already exists")
    
    created = analytics_store.get_all_versions()
    for v in created:
        if v["version"] == version_data.version:
            return VersionResponse(
                version=v["version"],
                release_date=v["release_date"],
                status=v["status"],
                download_url=v["download_url"],
                file_size=v["file_size"],
                changelog=v["changelog"],
                is_latest=v.get("is_latest", False),
            )
    
    raise HTTPException(status_code=500, detail="Failed to create version")


@router.put("/versions/{version}")
def update_version(
    version: str,
    version_data: VersionInput,
    user: dict = Depends(_require_admin),
) -> VersionResponse:
    """Update a version (admin only)."""
    if github_release_service.enabled:
        try:
            updated = github_release_service.update_version(version, version_data.model_dump())
        except GitHubReleaseError as exc:
            raise _github_unavailable(exc) from exc
        if not updated:
            raise HTTPException(status_code=404, detail="Version not found")
        return VersionResponse(**updated)

    success = analytics_store.update_version(
        version=version,
        release_date=version_data.release_date,
        download_url=version_data.download_url,
        file_size=version_data.file_size,
        changelog=version_data.changelog,
        status=version_data.status,
        is_latest=version_data.is_latest,
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Version not found")
    
    versions = analytics_store.get_all_versions()
    for v in versions:
        if v["version"] == version:
            return VersionResponse(
                version=v["version"],
                release_date=v["release_date"],
                status=v["status"],
                download_url=v["download_url"],
                file_size=v["file_size"],
                changelog=v["changelog"],
                is_latest=v.get("is_latest", False),
            )
    
    raise HTTPException(status_code=404, detail="Version not found")


# ============================================================================
# File Upload & Release Management
# ============================================================================

@router.post("/releases/upload/{version}")
async def upload_release_file(
    version: str,
    file: UploadFile = File(...),
    user: dict = Depends(_require_admin),
) -> FileUploadResponse:
    """Upload a release ZIP file (admin only)."""
    if github_release_service.enabled:
        try:
            result = github_release_service.upload_release(version, file.filename or "release.zip", await file.read())
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except GitHubReleaseError as exc:
            raise _github_unavailable(exc) from exc
        except Exception as exc:
            logger.exception("Failed to upload release to GitHub")
            raise HTTPException(status_code=500, detail="Failed to upload file to GitHub Releases") from exc
        return FileUploadResponse(success=True, message="File uploaded successfully", **result)

    # Validate file type
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are allowed")
    
    # Create version-specific subdirectory
    version_dir = RELEASES_DIR / version
    version_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    file_path = version_dir / file.filename
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            file_size = len(content)
    except Exception as e:
        logger.error(f"Failed to save release file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file")
    
    # Update database with file information
    success = analytics_store.save_release_file(
        version=version,
        file_path=str(file_path),
        file_name=file.filename,
        file_size=file_size,
    )
    
    if not success:
        # Cleanup file if database update fails
        try:
            file_path.unlink()
        except:
            pass
        raise HTTPException(status_code=500, detail="Failed to save release info")
    
    return FileUploadResponse(
        success=True,
        message="File uploaded successfully",
        file_name=file.filename,
        file_size=file_size,
        uploaded_at=datetime.utcnow().isoformat(),
    )


@router.post("/releases/publish/{version}")
def publish_release(
    version: str,
    user: dict = Depends(_require_admin),
) -> dict:
    """Publish a release (make it available for download) (admin only)."""
    if github_release_service.enabled:
        try:
            published = github_release_service.publish(version, True)
        except GitHubReleaseError as exc:
            raise _github_unavailable(exc) from exc
        if not published:
            raise HTTPException(status_code=404, detail="Version not found")
        return {"success": True, "message": f"Version {version} published successfully"}

    # Check if version exists
    versions = analytics_store.get_all_versions()
    if not any(v["version"] == version for v in versions):
        raise HTTPException(status_code=404, detail="Version not found")
    
    success = analytics_store.publish_release(version)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to publish release")
    
    return {
        "success": True,
        "message": f"Version {version} published successfully",
    }


@router.post("/releases/unpublish/{version}")
def unpublish_release(
    version: str,
    user: dict = Depends(_require_admin),
) -> dict:
    """Unpublish a release (admin only)."""
    if github_release_service.enabled:
        try:
            unpublished = github_release_service.publish(version, False)
        except GitHubReleaseError as exc:
            raise _github_unavailable(exc) from exc
        if not unpublished:
            raise HTTPException(status_code=404, detail="Version not found")
        return {"success": True, "message": f"Version {version} unpublished successfully"}

    success = analytics_store.unpublish_release(version)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to unpublish release")
    
    return {
        "success": True,
        "message": f"Version {version} unpublished successfully",
    }


@router.delete("/releases/{version}")
def delete_release(
    version: str,
    user: dict = Depends(_require_admin),
) -> dict:
    """Delete a release and its associated files (admin only)."""
    if github_release_service.enabled:
        try:
            deleted = github_release_service.delete_version(version)
        except GitHubReleaseError as exc:
            raise _github_unavailable(exc) from exc
        if not deleted:
            raise HTTPException(status_code=404, detail="Version not found")
        return {"success": True, "message": f"Version {version} deleted successfully"}

    # Get file info before deletion
    file_info = analytics_store.get_release_file_info(version)
    
    # Delete from database
    success = analytics_store.delete_release(version)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete release")
    
    # Delete file from disk if it exists
    if file_info and file_info["file_path"]:
        try:
            file_path = Path(file_info["file_path"])
            if file_path.exists():
                file_path.unlink()
                
            # Clean up empty version directory
            version_dir = file_path.parent
            if version_dir.exists() and not any(version_dir.iterdir()):
                version_dir.rmdir()
        except Exception as e:
            logger.warning(f"Failed to delete release file: {e}")
    
    return {
        "success": True,
        "message": f"Version {version} deleted successfully",
    }


# ============================================================================
# Analytics Dashboard
# ============================================================================

@router.get("/analytics/summary")
def get_analytics_summary(user: dict = Depends(_require_admin)) -> AnalyticsSummary:
    """Get analytics summary (admin only)."""
    summary = analytics_store.get_analytics_summary()
    return AnalyticsSummary(
        total_visitors=summary["total_visitors"],
        unique_visitors=summary["unique_visitors"],
        total_downloads=summary["total_downloads"],
        downloads_by_version=summary["downloads_by_version"],
        conversion_rate=summary["conversion_rate"],
        latest_version=summary["latest_version"],
    )


@router.get("/analytics/visitor-trends")
def get_visitor_trends(
    days: int = 30,
    user: dict = Depends(_require_admin),
) -> list[dict]:
    """Get visitor trends (admin only)."""
    return analytics_store.get_visitor_trends(days=days)


@router.get("/analytics/download-trends")
def get_download_trends(
    days: int = 30,
    user: dict = Depends(_require_admin),
) -> list[dict]:
    """Get download trends (admin only)."""
    return analytics_store.get_download_trends(days=days)
