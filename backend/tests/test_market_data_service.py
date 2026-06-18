from datetime import date

from app.services import market_data_service as market


def test_resolve_stock_kr_skips_full_listing(monkeypatch):
    called: list[bool] = []

    def fake_get_all_listings():
        called.append(True)
        return []

    monkeypatch.setattr(market, "get_all_listings", fake_get_all_listings)

    item = market.resolve_stock("5930")
    assert item is not None
    assert item.code == "005930"
    assert item.region == "KR"
    assert called == []


def test_resolve_stock_us_skips_full_listing(monkeypatch):
    called: list[bool] = []

    def fake_get_all_listings():
        called.append(True)
        return []

    monkeypatch.setattr(market, "get_all_listings", fake_get_all_listings)

    item = market.resolve_stock("aapl")
    assert item is not None
    assert item.code == "AAPL"
    assert item.region == "US"
    assert called == []


def test_get_daily_prices_uses_cache(monkeypatch):
    import sys
    from types import ModuleType

    market._daily_prices_cache.clear()
    calls: list[tuple] = []

    class FakeIndex:
        def strftime(self, _fmt: str) -> str:
            return "2026-06-01"

    class FakeDf:
        empty = False

        def iterrows(self):
            yield FakeIndex(), {"Open": 1.0, "High": 2.0, "Low": 0.5, "Close": 1.5, "Volume": 100}

    def fake_data_reader(code, start, end):
        calls.append((code, start, end))
        return FakeDf()

    fake_fdr = ModuleType("FinanceDataReader")
    fake_fdr.DataReader = fake_data_reader
    monkeypatch.setitem(sys.modules, "FinanceDataReader", fake_fdr)
    monkeypatch.setattr(
        market,
        "parse_stock_code",
        lambda raw: ("005930", "KR"),
    )

    day = date(2026, 6, 1)
    market.get_daily_prices("005930", day, day)
    market.get_daily_prices("005930", day, day)

    assert len(calls) == 1
