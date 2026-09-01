"""Appwrite authentication, release metadata, and file storage adapter."""
from __future__ import annotations

import os
import re
from datetime import datetime
from typing import Any

from appwrite.client import Client
from appwrite.exception import AppwriteException
from appwrite.id import ID
from appwrite.input_file import InputFile
from appwrite.query import Query
from appwrite.services.account import Account
from appwrite.services.databases import Databases
from appwrite.services.storage import Storage


class AppwriteService:
    def __init__(self) -> None:
        self.endpoint = os.getenv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
        self.project_id = os.getenv("APPWRITE_PROJECT_ID", "")
        self.api_key = os.getenv("APPWRITE_API_KEY", "")
        self.database_id = os.getenv("APPWRITE_DATABASE_ID", "")
        self.collection_id = os.getenv("APPWRITE_RELEASES_COLLECTION_ID", "")
        self.bucket_id = os.getenv("APPWRITE_BUCKET_ID", "")

    @property
    def enabled(self) -> bool:
        return all((self.project_id, self.api_key, self.database_id, self.collection_id, self.bucket_id))

    def _client(self, *, session: str | None = None, server: bool = True) -> Client:
        client = Client().set_endpoint(self.endpoint).set_project(self.project_id)
        if session:
            client.set_session(session)
        elif server:
            client.set_key(self.api_key)
        return client

    def authenticate(self, email: str, password: str) -> dict[str, Any]:
        account = Account(self._client(server=False))
        session = account.create_email_password_session(email=email, password=password)
        return {"token": session["secret"], "user_id": session["userId"], "email": email}

    def verify_session(self, secret: str) -> dict[str, Any] | None:
        try:
            user = Account(self._client(session=secret)).get()
            return {"user_id": user["$id"], "email": user.get("email")}
        except AppwriteException:
            return None

    @staticmethod
    def _document_to_version(document: dict[str, Any]) -> dict[str, Any]:
        data = document.get("data", document)
        return {
            "version": data.get("version", ""),
            "release_date": data.get("release_date", ""),
            "status": data.get("status", "stable"),
            "download_url": data.get("download_url", ""),
            "file_size": data.get("file_size"),
            "changelog": data.get("changelog"),
            "is_latest": bool(data.get("is_latest", False)),
            "file_path": data.get("file_path"),
            "file_name": data.get("file_name"),
            "uploaded_at": data.get("uploaded_at"),
            "is_published": bool(data.get("is_published", False)),
            "download_count": int(data.get("download_count", 0) or 0),
            "file_id": data.get("file_id"),
            "document_id": document.get("$id"),
        }

    def list_versions(self) -> list[dict[str, Any]]:
        documents = Databases(self._client()).list_documents(
            database_id=self.database_id,
            collection_id=self.collection_id,
            queries=[Query.order_desc("release_date"), Query.limit(100)],
        )
        return [self._document_to_version(document) for document in documents.get("documents", [])]

    def find_version(self, version: str) -> dict[str, Any] | None:
        return next((item for item in self.list_versions() if item["version"] == version), None)

    def create_version(self, data: dict[str, Any]) -> dict[str, Any]:
        if self.find_version(data["version"]):
            raise ValueError("Version already exists")
        if data.get("is_latest"):
            for version in self.list_versions():
                self._update_document(version["document_id"], {"is_latest": False})
        document = Databases(self._client()).create_document(
            database_id=self.database_id,
            collection_id=self.collection_id,
            document_id=ID.unique(),
            data={
                **data,
                "download_url": data.get("download_url", ""),
                "file_size": data.get("file_size"),
                "changelog": data.get("changelog") or "",
                "is_latest": bool(data.get("is_latest", False)),
                "is_published": False,
                "download_count": 0,
                "file_id": "",
                "file_name": "",
                "uploaded_at": "",
            },
        )
        return self._document_to_version(document)

    def _update_document(self, document_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return Databases(self._client()).update_document(
            database_id=self.database_id,
            collection_id=self.collection_id,
            document_id=document_id,
            data=data,
        )

    def update_version(self, version: str, data: dict[str, Any]) -> dict[str, Any] | None:
        current = self.find_version(version)
        if not current:
            return None
        if data.get("is_latest"):
            for item in self.list_versions():
                if item["document_id"] != current["document_id"]:
                    self._update_document(item["document_id"], {"is_latest": False})
        self._update_document(current["document_id"], data)
        return self.find_version(version)

    def upload_release(self, version: str, filename: str, content: bytes) -> dict[str, Any]:
        if not filename.lower().endswith(".zip"):
            raise ValueError("Only .zip files are allowed")
        current = self.find_version(version)
        if not current:
            raise ValueError("Version not found")
        safe_name = re.sub(r"[^A-Za-z0-9._-]", "-", filename)
        file_id = re.sub(r"[^A-Za-z0-9._-]", "-", f"{version}-{safe_name}")[:36]
        storage = Storage(self._client())
        try:
            storage.delete_file(bucket_id=self.bucket_id, file_id=file_id)
        except AppwriteException:
            pass
        storage.create_file(
            bucket_id=self.bucket_id,
            file_id=file_id,
            file=InputFile.from_bytes(content, filename=safe_name),
        )
        now = datetime.utcnow().isoformat()
        self._update_document(current["document_id"], {
            "file_id": file_id,
            "file_name": filename,
            "file_size": len(content),
            "uploaded_at": now,
            "download_url": "",
        })
        return {"file_name": filename, "file_size": len(content), "uploaded_at": now}

    def publish(self, version: str, published: bool) -> bool:
        current = self.find_version(version)
        if not current:
            return False
        self._update_document(current["document_id"], {"is_published": published})
        return True

    def get_download(self, version: str) -> tuple[bytes, str] | None:
        current = self.find_version(version)
        if not current or not current.get("file_id") or not current.get("is_published"):
            return None
        content = Storage(self._client()).get_file_download(
            bucket_id=self.bucket_id,
            file_id=current["file_id"],
        )
        self._update_document(current["document_id"], {"download_count": current["download_count"] + 1})
        return content, current.get("file_name") or f"StreamCarnia-{version}.zip"

    def delete_version(self, version: str) -> bool:
        current = self.find_version(version)
        if not current:
            return False
        if current.get("file_id"):
            try:
                Storage(self._client()).delete_file(bucket_id=self.bucket_id, file_id=current["file_id"])
            except AppwriteException:
                pass
        Databases(self._client()).delete_document(
            database_id=self.database_id,
            collection_id=self.collection_id,
            document_id=current["document_id"],
        )
        return True


appwrite_service = AppwriteService()
