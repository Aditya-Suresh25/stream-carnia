"""GitHub Releases integration for publishing and serving StreamCarnia builds."""
from __future__ import annotations

import os
from typing import Any

import requests


class GitHubReleaseError(RuntimeError):
    pass


class GitHubReleaseService:
    def __init__(self) -> None:
        self.owner = os.getenv("GITHUB_OWNER", "")
        self.repository = os.getenv("GITHUB_REPOSITORY", "")
        self.token = os.getenv("GITHUB_TOKEN", "")
        self.api_base = "https://api.github.com"

    @property
    def enabled(self) -> bool:
        return all((self.owner, self.repository, self.token))

    def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any] | list[dict[str, Any]]:
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.token}",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        response = requests.request(method, f"{self.api_base}{path}", headers=headers, timeout=60, **kwargs)
        if not response.ok:
            try:
                detail = response.json().get("message", response.text)
            except ValueError:
                detail = response.text
            raise GitHubReleaseError(f"GitHub API {response.status_code}: {detail}")
        return response.json() if response.content else {}

    def _release_to_version(self, release: dict[str, Any], *, is_latest: bool = False) -> dict[str, Any]:
        assets = release.get("assets", [])
        asset = next((item for item in assets if item.get("name", "").lower().endswith(".zip")), None)
        tag = release.get("tag_name", "").removeprefix("v")
        return {
            "version": tag,
            "release_date": (release.get("published_at") or release.get("created_at") or "")[:10],
            "status": "stable" if not release.get("prerelease") else "beta",
            "download_url": asset.get("browser_download_url", "") if asset else "",
            "file_size": asset.get("size") if asset else None,
            "changelog": release.get("body") or "",
            "is_latest": is_latest,
            "file_path": None,
            "file_name": asset.get("name") if asset else None,
            "uploaded_at": asset.get("updated_at") if asset else None,
            "is_published": not release.get("draft", False),
            "download_count": 0,
            "release_id": release.get("id"),
            "upload_url": release.get("upload_url", "").split("{")[0],
        }

    def list_versions(self) -> list[dict[str, Any]]:
        releases = self._request("GET", f"/repos/{self.owner}/{self.repository}/releases", params={"per_page": 100})
        published = [release for release in releases if not release.get("draft")]
        return [self._release_to_version(release, is_latest=index == 0) for index, release in enumerate(published)]

    def find_version(self, version: str) -> dict[str, Any] | None:
        tag = version if version.startswith("v") else f"v{version}"
        try:
            release = self._request("GET", f"/repos/{self.owner}/{self.repository}/releases/tags/{tag}")
        except GitHubReleaseError as exc:
            if "404" in str(exc):
                return None
            raise
        return self._release_to_version(release)

    def create_version(self, data: dict[str, Any]) -> dict[str, Any]:
        if self.find_version(data["version"]):
            raise ValueError("Version already exists")
        tag = data["version"] if data["version"].startswith("v") else f"v{data['version']}"
        release = self._request(
            "POST",
            f"/repos/{self.owner}/{self.repository}/releases",
            json={
                "tag_name": tag,
                "name": f"StreamCarnia {data['version']}",
                "body": data.get("changelog") or "",
                "draft": True,
                "prerelease": data.get("status") == "beta",
                "target_commitish": os.getenv("GITHUB_TARGET_BRANCH", "main"),
            },
        )
        return self._release_to_version(release)

    def update_version(self, version: str, data: dict[str, Any]) -> dict[str, Any] | None:
        current = self.find_version(version)
        if not current:
            return None
        tag = version if version.startswith("v") else f"v{version}"
        release = self._request(
            "PATCH",
            f"/repos/{self.owner}/{self.repository}/releases/{current['release_id']}",
            json={
                "tag_name": tag,
                "name": f"StreamCarnia {version}",
                "body": data.get("changelog") or "",
                "prerelease": data.get("status") == "beta",
            },
        )
        return self._release_to_version(release)

    def upload_release(self, version: str, filename: str, content: bytes) -> dict[str, Any]:
        if not filename.lower().endswith(".zip"):
            raise ValueError("Only .zip files are allowed")
        current = self.find_version(version)
        if not current:
            raise ValueError("Version not found")
        upload_url = current["upload_url"]
        response = requests.post(
            upload_url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "X-GitHub-Api-Version": "2022-11-28",
                "Content-Type": "application/zip",
            },
            params={"name": filename},
            data=content,
            timeout=300,
        )
        if not response.ok:
            raise GitHubReleaseError(f"GitHub upload {response.status_code}: {response.text}")
        asset = response.json()
        return {"file_name": asset["name"], "file_size": asset["size"], "uploaded_at": asset.get("updated_at")}

    def publish(self, version: str, published: bool) -> bool:
        current = self.find_version(version)
        if not current:
            return False
        self._request(
            "PATCH",
            f"/repos/{self.owner}/{self.repository}/releases/{current['release_id']}",
            json={"draft": not published},
        )
        return True

    def delete_version(self, version: str) -> bool:
        current = self.find_version(version)
        if not current:
            return False
        self._request("DELETE", f"/repos/{self.owner}/{self.repository}/releases/{current['release_id']}")
        return True


github_release_service = GitHubReleaseService()
