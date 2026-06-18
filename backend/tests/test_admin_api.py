"""관리자 API 테스트"""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.utils.auth_email import ADMIN_EMAIL


def _admin_token(client: TestClient) -> str:
    r = client.post("/api/auth/login", json={"email": "admin", "password": "123"})
    assert r.status_code == 200, r.text
    return r.json()["accessToken"]


def test_admin_login_and_stats(client: TestClient):
    token = _admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    r = client.get("/api/admin/stats", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert "totalUsers" in body
    assert "signupTrend" in body


def test_admin_users_list_and_forbidden_for_user(client: TestClient):
    admin_headers = {"Authorization": f"Bearer {_admin_token(client)}"}
    r = client.get("/api/admin/users", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["total"] >= 1

    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/auth/register",
        json={"nickname": f"n_{uuid.uuid4().hex[:6]}", "email": email, "password": "password123"},
    )
    login = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    user_headers = {"Authorization": f"Bearer {login.json()['accessToken']}"}
    denied = client.get("/api/admin/users", headers=user_headers)
    assert denied.status_code == 403


def test_admin_journals_list_and_delete(client: TestClient):
    token = _admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    r = client.get("/api/admin/journals", headers=headers)
    assert r.status_code == 200
    assert "items" in r.json()
