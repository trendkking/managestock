import pytest

from app.brokers.kis import KISBrokerAdapter


def test_parse_sync_config_defaults():
    domestic, us = KISBrokerAdapter.parse_sync_config(None)
    assert domestic is True
    assert us == []


def test_extra_json_roundtrip():
    raw = KISBrokerAdapter.extra_json("01", sync_domestic=True, sync_us=["NASD", "NYSE", "INVALID"])
    domestic, us = KISBrokerAdapter.parse_sync_config(raw)
    assert domestic is True
    assert us == ["NASD", "NYSE"]


def test_extra_json_stores_usd_krw_rate():
    from decimal import Decimal

    raw = KISBrokerAdapter.extra_json("01", sync_us=["NASD"], usd_krw_rate=Decimal("1350.5"))
    extra = KISBrokerAdapter.parse_extra(raw)
    assert extra["usdKrwRate"] == Decimal("1350.5")


def test_connect_request_requires_market_scope():
    from app.schemas.broker import AccountConnectRequest

    with pytest.raises(ValueError):
        AccountConnectRequest(
            name="test",
            broker_code="kis",
            account_number="12345678",
            account_product_code="01",
            app_key="key",
            app_secret="secret",
            sync_domestic=False,
            sync_us=[],
        )
