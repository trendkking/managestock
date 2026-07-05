"""backend.md 23개 엔드포인트 통합 테스트"""

import uuid

import pytest
from fastapi.testclient import TestClient


def test_health(client: TestClient):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_register_login_me_flow(client: TestClient):
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    nickname = f"nick_{uuid.uuid4().hex[:6]}"

    r = client.post(
        "/api/auth/register",
        json={"nickname": nickname, "email": email, "password": "password123"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["email"] == email
    assert body["nickname"] == nickname
    assert body["role"] == "user"
    assert "showNicknamePublic" in body
    assert "createdAt" in body

    r = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert r.status_code == 200
    assert "accessToken" in r.json()
    token = r.json()["accessToken"]

    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == email

    r = client.patch(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"nickname": f"{nickname}_v2", "showNicknamePublic": False},
    )
    assert r.status_code == 200
    assert r.json()["nickname"] == f"{nickname}_v2"
    assert r.json()["showNicknamePublic"] is False


def test_register_duplicate_email(client: TestClient):
    email = f"dup_{uuid.uuid4().hex[:8]}@example.com"
    payload = {"nickname": "nick1", "email": email, "password": "password123"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    r = client.post("/api/auth/register", json={**payload, "nickname": "nick2"})
    assert r.status_code == 409


def test_register_duplicate_email_mixed_case(client: TestClient):
    local = uuid.uuid4().hex[:8]
    email_lower = f"{local}@example.com"
    email_mixed = f"{local.upper()}@example.com"
    assert (
        client.post(
            "/api/auth/register",
            json={"nickname": "nick_a", "email": email_lower, "password": "password123"},
        ).status_code
        == 201
    )
    r = client.post(
        "/api/auth/register",
        json={"nickname": "nick_b", "email": email_mixed, "password": "password123"},
    )
    assert r.status_code == 409
    assert "이메일" in r.json()["detail"]


def test_register_seed_email_blocked(client: TestClient):
    r = client.post(
        "/api/auth/register",
        json={"nickname": "hacker", "email": "test@gmail.com", "password": "password123"},
    )
    assert r.status_code == 409


def test_login_invalid(client: TestClient):
    r = client.post("/api/auth/login", json={"email": "test@gmail.com", "password": "wrong"})
    assert r.status_code == 401


def test_unauthorized(client: TestClient):
    r = client.get("/api/accounts")
    assert r.status_code == 401


def test_accounts_crud_and_holdings_trades(client: TestClient, auth_headers: dict):
    r = client.post(
        "/api/accounts",
        headers=auth_headers,
        json={
            "name": "통합테스트 계좌",
            "broker": "키움증권",
            "initialCapital": 10000000,
            "description": "pytest",
        },
    )
    assert r.status_code == 201, r.text
    account = r.json()
    account_id = account["id"]
    assert account["cashBalance"] == 10000000
    assert account["currentValue"] == 10000000

    r = client.get("/api/accounts", headers=auth_headers)
    assert r.status_code == 200
    assert any(a["id"] == account_id for a in r.json()["items"])

    r = client.get(f"/api/accounts/{account_id}", headers=auth_headers)
    assert r.status_code == 200
    detail = r.json()
    assert detail["holdings"] == []
    assert detail["trades"] == []
    assert isinstance(detail["performance"], list)
    assert len(detail["performance"]) >= 1

    r = client.patch(
        f"/api/accounts/{account_id}",
        headers=auth_headers,
        json={"name": "수정된 계좌명"},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "수정된 계좌명"

    r = client.post(
        f"/api/accounts/{account_id}/holdings",
        headers=auth_headers,
        json={
            "stockCode": "005930",
            "stockName": "삼성전자",
            "quantity": 10,
            "avgPrice": 70000,
            "currentPrice": 72000,
        },
    )
    assert r.status_code == 200, r.text

    r = client.post(
        f"/api/accounts/{account_id}/trades",
        headers=auth_headers,
        json={
            "stockCode": "005930",
            "stockName": "삼성전자",
            "tradeType": "buy",
            "quantity": 5,
            "price": 71000,
            "fee": 100,
            "tax": 0,
            "tradedAt": "2026-06-01T10:00:00.000Z",
            "memo": "pytest buy",
        },
    )
    assert r.status_code == 201, r.text

    r = client.get(f"/api/accounts/{account_id}", headers=auth_headers)
    detail = r.json()
    assert len(detail["holdings"]) >= 1
    assert len(detail["trades"]) >= 1
    assert detail["cashBalance"] < 10000000

    r = client.post(
        f"/api/accounts/{account_id}/trades",
        headers=auth_headers,
        json={
            "stockCode": "005930",
            "stockName": "삼성전자",
            "tradeType": "sell",
            "quantity": 100,
            "price": 72000,
            "fee": 0,
            "tax": 0,
            "tradedAt": "2026-06-01T11:00:00.000Z",
        },
    )
    assert r.status_code == 400


def test_journal_entries_crud(client: TestClient, auth_headers: dict):
    r = client.post(
        "/api/journal-entries",
        headers=auth_headers,
        json={
            "journalDate": "2026-06-01",
            "stockCode": "005930",
            "stockName": "삼성전자",
            "side": "buy",
            "reason": "20일선 지지 확인",
        },
    )
    assert r.status_code == 201, r.text
    entry_id = r.json()["id"]
    assert r.json()["reason"] == "20일선 지지 확인"
    assert r.json()["side"] == "buy"

    r = client.get("/api/journal-entries", headers=auth_headers, params={"stockCode": "005930"})
    assert r.status_code == 200
    assert any(e["id"] == entry_id for e in r.json()["items"])

    r = client.patch(
        f"/api/journal-entries/{entry_id}",
        headers=auth_headers,
        json={
            "journalDate": "2026-06-02",
            "stockCode": "005930",
            "stockName": "삼성전자",
            "side": "sell",
            "reason": "수정된 사유",
        },
    )
    assert r.status_code == 200
    assert r.json()["reason"] == "수정된 사유"
    assert r.json()["side"] == "sell"

    r = client.delete(f"/api/journal-entries/{entry_id}", headers=auth_headers)
    assert r.status_code == 204


def test_journal_rule_memo_get_and_save(client: TestClient, auth_headers: dict):
    r = client.get("/api/journal-rule-memo", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["content"] == ""

    r = client.put(
        "/api/journal-rule-memo",
        headers=auth_headers,
        json={"content": "- 손절 -3%\n- 추격 매수 금지"},
    )
    assert r.status_code == 200
    assert "손절" in r.json()["content"]
    assert r.json()["updatedAt"]

    r = client.get("/api/journal-rule-memo", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["content"] == "- 손절 -3%\n- 추격 매수 금지"


def test_market_stock_search_and_daily(client: TestClient, auth_headers: dict, monkeypatch):
    from app.services.market_data_service import StockItem

    monkeypatch.setattr(
        "app.services.market_data_service.search_stocks",
        lambda q, limit=20: [StockItem("005930", "삼성전자", "KOSPI", "KR")] if "삼성" in q else [],
    )
    monkeypatch.setattr(
        "app.services.market_data_service.resolve_stock",
        lambda code: StockItem("005930", "삼성전자", "KOSPI", "KR") if code.zfill(6) == "005930" else None,
    )
    monkeypatch.setattr(
        "app.services.market_data_service.get_daily_prices",
        lambda code, from_date, to_date: [
            {"date": "2026-05-01", "open": 70000, "high": 71000, "low": 69000, "close": 70500, "volume": 1000},
        ],
    )

    r = client.get("/api/market/stocks/search", headers=auth_headers, params={"q": "삼성"})
    assert r.status_code == 200
    assert r.json()["items"][0]["code"] == "005930"

    r = client.get("/api/market/stocks/005930/daily", headers=auth_headers, params={"months": 3})
    assert r.status_code == 200
    assert r.json()["stockName"] == "삼성전자"
    assert len(r.json()["items"]) == 1


def test_journals_crud(client: TestClient, auth_headers: dict):
    r = client.post(
        "/api/accounts",
        headers=auth_headers,
        json={"name": "일지용", "broker": "KB증권", "initialCapital": 5000000},
    )
    account_id = r.json()["id"]

    r = client.post(
        "/api/journals",
        headers=auth_headers,
        json={
            "title": "테스트 일지",
            "journalDate": "2026-06-01",
            "accountId": account_id,
            "content": "본문 내용",
            "reflection": "반성",
            "emotion": "calm",
            "tags": ["태그1", "반도체"],
            "stockCodes": ["005930"],
            "tradeIds": [],
        },
    )
    assert r.status_code == 201, r.text
    journal_id = r.json()["id"]
    assert r.json()["tags"] == ["태그1", "반도체"]

    r = client.get("/api/journals", headers=auth_headers, params={"q": "테스트"})
    assert r.status_code == 200
    assert any(j["id"] == journal_id for j in r.json()["items"])

    r = client.get(f"/api/journals/{journal_id}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["title"] == "테스트 일지"
    assert "linkedTrades" in r.json()

    r = client.patch(
        f"/api/journals/{journal_id}",
        headers=auth_headers,
        json={
            "title": "수정 일지",
            "journalDate": "2026-06-02",
            "accountId": account_id,
            "content": "수정 본문",
            "tags": ["수정"],
            "stockCodes": [],
            "tradeIds": [],
        },
    )
    assert r.status_code == 200
    assert r.json()["title"] == "수정 일지"

    r = client.delete(f"/api/journals/{journal_id}", headers=auth_headers)
    assert r.status_code == 204
    assert client.get(f"/api/journals/{journal_id}", headers=auth_headers).status_code == 404


def test_dashboard_summary(client: TestClient, auth_headers: dict):
    r = client.get("/api/dashboard/summary", headers=auth_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    for key in (
        "totalValue",
        "totalProfitLoss",
        "totalReturnRate",
        "accountsCount",
        "accountSummaries",
        "recentTrades",
        "activeCompetitions",
        "recentJournals",
    ):
        assert key in data


def test_competitions_flow(client: TestClient, auth_headers: dict):
    r = client.get("/api/competitions", headers=auth_headers)
    assert r.status_code == 200
    comp_id = r.json()["items"][0]["id"]

    r = client.get(f"/api/competitions/{comp_id}", headers=auth_headers)
    assert r.status_code == 200

    r = client.post(
        "/api/accounts",
        headers=auth_headers,
        json={"name": "대회용", "broker": "키움증권", "initialCapital": 5000000},
    )
    account_id = r.json()["id"]

    r = client.post(
        f"/api/accounts/{account_id}/holdings",
        headers=auth_headers,
        json={
            "stockCode": "035420",
            "stockName": "NAVER",
            "quantity": 5,
            "avgPrice": 200000,
            "currentPrice": 210000,
        },
    )
    assert r.status_code == 200

    r = client.post(
        f"/api/competitions/{comp_id}/join",
        headers=auth_headers,
        json={"accountId": account_id},
    )
    assert r.status_code == 201, r.text
    assert r.json()["isJoined"] is True

    r = client.post(
        f"/api/competitions/{comp_id}/join",
        headers=auth_headers,
        json={"accountId": account_id},
    )
    assert r.status_code == 409

    r = client.get(f"/api/competitions/{comp_id}/leaderboard", headers=auth_headers)
    assert r.status_code == 200
    lb = r.json()
    assert "items" in lb
    assert "myRank" in lb
    assert len(lb["items"]) >= 1

    r = client.get(f"/api/competitions/{comp_id}/chart", headers=auth_headers)
    assert r.status_code == 200
    assert "series" in r.json()


def test_delete_account_with_competition_entry_fails(client: TestClient, auth_headers: dict):
    r = client.get("/api/competitions", headers=auth_headers)
    comp_id = r.json()["items"][0]["id"]

    r = client.post(
        "/api/accounts",
        headers=auth_headers,
        json={"name": "삭제불가", "broker": "키움증권", "initialCapital": 5000000},
    )
    account_id = r.json()["id"]

    client.post(
        f"/api/competitions/{comp_id}/join",
        headers=auth_headers,
        json={"accountId": account_id},
    )

    r = client.delete(f"/api/accounts/{account_id}", headers=auth_headers)
    assert r.status_code == 400


def test_leave_competition_then_delete_account(client: TestClient, auth_headers: dict):
    r = client.get("/api/competitions", headers=auth_headers)
    comp_id = r.json()["items"][0]["id"]

    r = client.post(
        "/api/accounts",
        headers=auth_headers,
        json={"name": "삭제가능", "broker": "키움증권", "initialCapital": 5000000},
    )
    account_id = r.json()["id"]

    client.post(
        f"/api/competitions/{comp_id}/join",
        headers=auth_headers,
        json={"accountId": account_id},
    )

    r = client.delete(f"/api/competitions/{comp_id}/leave", headers=auth_headers)
    assert r.status_code == 204

    r = client.delete(f"/api/accounts/{account_id}", headers=auth_headers)
    assert r.status_code == 204


def test_my_competition_entries_and_switch_account(client: TestClient, auth_headers: dict):
    r = client.get("/api/competitions", headers=auth_headers)
    comp_id = r.json()["items"][0]["id"]

    r1 = client.post(
        "/api/accounts",
        headers=auth_headers,
        json={"name": "대회A", "broker": "키움증권", "initialCapital": 5000000},
    )
    r2 = client.post(
        "/api/accounts",
        headers=auth_headers,
        json={"name": "대회B", "broker": "키움증권", "initialCapital": 6000000},
    )
    acc_a, acc_b = r1.json()["id"], r2.json()["id"]

    client.post(f"/api/competitions/{comp_id}/join", headers=auth_headers, json={"accountId": acc_a})
    r = client.post(f"/api/competitions/{comp_id}/join", headers=auth_headers, json={"accountId": acc_b})
    assert r.status_code == 201

    r = client.get("/api/competitions/entries/me", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()["items"]) == 2
    account_ids = {item["accountId"] for item in r.json()["items"]}
    assert account_ids == {acc_a, acc_b}
