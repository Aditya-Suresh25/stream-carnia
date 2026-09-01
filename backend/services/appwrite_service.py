"""Appwrite authentication adapter."""
from __future__ import annotations

import os
from typing import Any

from appwrite.client import Client
from appwrite.exception import AppwriteException
from appwrite.services.account import Account


class AppwriteService:
    def __init__(self) -> None:
        self.endpoint = os.getenv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
        self.project_id = os.getenv("APPWRITE_PROJECT_ID", "")

    @property
    def enabled(self) -> bool:
        return bool(self.project_id)

    def _client(self, *, session: str | None = None) -> Client:
        client = Client().set_endpoint(self.endpoint).set_project(self.project_id)
        if session:
            client.set_session(session)
        return client

    def authenticate(self, email: str, password: str) -> dict[str, Any]:
        account = Account(self._client())
        session = account.create_email_password_session(email=email, password=password)
        return {"token": session["secret"], "user_id": session["userId"], "email": email}

    def verify_session(self, secret: str) -> dict[str, Any] | None:
        try:
            user = Account(self._client(session=secret)).get()
            return {"user_id": user["$id"], "email": user.get("email")}
        except AppwriteException:
            return None

appwrite_service = AppwriteService()
