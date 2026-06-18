from fastapi.testclient import TestClient


def test_list_brokers_includes_market_support(client: TestClient, auth_headers: dict):
    r = client.get("/api/brokers", headers=auth_headers)
    assert r.status_code == 200
    items = {item["code"]: item for item in r.json()["items"]}
    assert items["kis"]["supportedMarkets"]["domestic"] is True
    assert "NASD" in items["kis"]["supportedMarkets"]["us"]
    assert items["kiwoom"]["supportedMarkets"]["us"] == []
    assert items["kiwoom"]["apiConnectAvailable"] is False
    assert items["ls"]["supportedMarkets"]["us"] == []
    assert items["ls"]["apiConnectAvailable"] is False
