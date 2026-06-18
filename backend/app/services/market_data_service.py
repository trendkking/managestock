"""증권사와 무관한 시장 데이터 (FinanceDataReader — KRX·ETF·미국 공개 시세)."""

from __future__ import annotations

import re
import time
from dataclasses import dataclass
from datetime import date, timedelta

_listing_cache: tuple[float, list["StockItem"]] | None = None
_LISTING_TTL_SEC = 6 * 3600

_daily_prices_cache: dict[tuple[str, str, str], tuple[float, list[dict]]] = {}
_DAILY_PRICES_TTL_SEC = 10 * 60

_US_TICKER_RE = re.compile(r"^[A-Za-z]{1,5}$")


@dataclass(frozen=True)
class StockItem:
    code: str
    name: str
    market: str
    region: str  # KR | US


def _parse_krx_row(row) -> StockItem | None:
    code = str(row["Code"]).strip().zfill(6)
    name = str(row["Name"]).strip()
    market = str(row.get("Market", "KRX")).strip()
    if code and name:
        return StockItem(code=code, name=name, market=market, region="KR")
    return None


def _parse_etf_row(row) -> StockItem | None:
    code = str(row["Symbol"]).strip().zfill(6)
    name = str(row["Name"]).strip()
    if code and name:
        return StockItem(code=code, name=name, market="ETF", region="KR")
    return None


def _parse_us_row(row, exchange: str) -> StockItem | None:
    code = str(row["Symbol"]).strip().upper()
    name = str(row["Name"]).strip()
    if code and name:
        return StockItem(code=code, name=name, market=exchange, region="US")
    return None


def _load_all_listings() -> list[StockItem]:
    import FinanceDataReader as fdr

    by_key: dict[tuple[str, str], StockItem] = {}

    def add(item: StockItem | None) -> None:
        if item is None:
            return
        key = (item.region, item.code)
        by_key[key] = item

    krx = fdr.StockListing("KRX")
    for _, row in krx.iterrows():
        add(_parse_krx_row(row))

    etf = fdr.StockListing("ETF/KR")
    for _, row in etf.iterrows():
        add(_parse_etf_row(row))

    for exchange in ("NASDAQ", "NYSE", "AMEX"):
        listing = fdr.StockListing(exchange)
        for _, row in listing.iterrows():
            add(_parse_us_row(row, exchange))

    return list(by_key.values())


def get_all_listings() -> list[StockItem]:
    global _listing_cache
    now = time.time()
    if _listing_cache is not None and now - _listing_cache[0] < _LISTING_TTL_SEC:
        return _listing_cache[1]
    items = _load_all_listings()
    _listing_cache = (now, items)
    return items


def parse_stock_code(raw: str) -> tuple[str, str]:
    """(normalized_code, region) — 숫자형은 국내 6자리, 알파벳은 미국 티커."""
    s = raw.strip()
    if not s:
        return s, "KR"
    if s.isdigit():
        return s.zfill(6), "KR"
    if _US_TICKER_RE.match(s):
        return s.upper(), "US"
    if s.isalnum() and any(c.isalpha() for c in s):
        return s.upper(), "US"
    return s.zfill(6), "KR"


def _lookup_cached_listing(code: str, region: str) -> StockItem | None:
    if _listing_cache is None:
        return None
    for item in _listing_cache[1]:
        if item.region == region and item.code == code:
            return item
    return None


def _search_score(item: StockItem, q: str) -> tuple[int, str]:
    code_l = item.code.lower()
    name_l = item.name.lower()
    if code_l == q:
        return (0, item.name)
    if name_l.startswith(q):
        return (1, item.name)
    if code_l.startswith(q):
        return (2, item.name)
    return (3, item.name)


def _probe_us_ticker(symbol: str) -> StockItem | None:
    """목록에 없는 미국 ETF/티커(SOXL 등) — 최근 시세 조회로 존재 확인."""
    import FinanceDataReader as fdr

    sym = symbol.upper()
    end = date.today()
    start = end - timedelta(days=14)
    try:
        df = fdr.DataReader(sym, start, end)
        if df is None or df.empty:
            return None
    except Exception:
        return None
    return StockItem(code=sym, name=sym, market="US", region="US")


def search_stocks(query: str, *, limit: int = 20) -> list[StockItem]:
    q = query.strip().lower()
    if len(q) < 1:
        return []

    matches = [
        item
        for item in get_all_listings()
        if q in item.code.lower() or q in item.name.lower()
    ]

    if _US_TICKER_RE.match(query.strip()):
        sym = query.strip().upper()
        if not any(m.code == sym for m in matches):
            probed = _probe_us_ticker(sym)
            if probed:
                matches.append(probed)

    matches.sort(key=lambda item: _search_score(item, q))
    return matches[:limit]


def resolve_stock(stock_code: str) -> StockItem | None:
    """차트용 종목 해석 — 전체 목록 로드 없이 코드 형식만으로 빠르게 처리."""
    code, region = parse_stock_code(stock_code)
    if not code:
        return None

    cached = _lookup_cached_listing(code, region)
    if cached is not None:
        return cached

    if region == "KR" and code.isdigit():
        return StockItem(code=code.zfill(6), name=code.zfill(6), market="KRX", region="KR")

    if region == "US":
        sym = code.upper()
        if _US_TICKER_RE.match(sym):
            return StockItem(code=sym, name=sym, market="US", region="US")

    for item in get_all_listings():
        if item.region == region and item.code == code:
            return item
    if region == "US":
        return _probe_us_ticker(code)
    return None


def get_daily_prices(stock_code: str, from_date: date, to_date: date) -> list[dict]:
    import FinanceDataReader as fdr

    code, region = parse_stock_code(stock_code)
    if from_date > to_date:
        return []

    cache_key = (code, from_date.isoformat(), to_date.isoformat())
    now = time.time()
    cached = _daily_prices_cache.get(cache_key)
    if cached is not None and now - cached[0] < _DAILY_PRICES_TTL_SEC:
        return cached[1]

    reader_code = code if region == "US" else code.zfill(6)
    df = fdr.DataReader(reader_code, from_date, to_date)
    if df is None or df.empty:
        return []

    points: list[dict] = []
    for idx, row in df.iterrows():
        day = idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx)[:10]
        vol = row["Volume"] if "Volume" in row else 0
        volume = int(vol) if vol == vol else 0
        points.append(
            {
                "date": day,
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": volume,
            }
        )

    _daily_prices_cache[cache_key] = (now, points)
    return points


def default_chart_range(months: int = 3) -> tuple[date, date]:
    to_date = date.today()
    from_date = to_date - timedelta(days=months * 31)
    return from_date, to_date
