"""Shared broker credential extra_json helpers."""

from __future__ import annotations

import json
from decimal import Decimal

from app.brokers.kis import US_EXCHANGE_CODES

DEFAULT_SYNC_CONFIG = {"domestic": True, "us": []}


def sync_memo_prefix(broker_code: str) -> str:
    return f"{broker_code}-sync|"


def extra_json(
    account_product_code: str,
    *,
    sync_domestic: bool = True,
    sync_us: list[str] | None = None,
    usd_krw_rate: Decimal | None = None,
    stats_baseline_v: int = 2,
    kiwoom_use_virtual: bool | None = None,
) -> str:
    us_codes = [code for code in (sync_us or []) if code in US_EXCHANGE_CODES]
    payload: dict = {
        "accountProductCode": account_product_code,
        "sync": {"domestic": sync_domestic, "us": us_codes},
        "statsBaselineV": stats_baseline_v,
    }
    if usd_krw_rate and usd_krw_rate > 0:
        payload["usdKrwRate"] = float(usd_krw_rate)
    if kiwoom_use_virtual is not None:
        payload["kiwoomUseVirtual"] = kiwoom_use_virtual
    return json.dumps(payload)


def parse_extra(extra_json_raw: str | None) -> dict:
    if not extra_json_raw:
        return {"accountProductCode": "01", "sync": dict(DEFAULT_SYNC_CONFIG)}
    try:
        data = json.loads(extra_json_raw)
    except json.JSONDecodeError:
        return {"accountProductCode": "01", "sync": dict(DEFAULT_SYNC_CONFIG)}
    sync = data.get("sync") or {}
    us_codes = [code for code in sync.get("us", []) if code in US_EXCHANGE_CODES]
    try:
        usd_krw_rate = Decimal(str(data.get("usdKrwRate") or 0))
    except Exception:
        usd_krw_rate = Decimal("0")
    try:
        stats_baseline_v = int(data.get("statsBaselineV", 1))
    except (TypeError, ValueError):
        stats_baseline_v = 1
    kiwoom_use_virtual = data.get("kiwoomUseVirtual")
    if kiwoom_use_virtual is not None:
        kiwoom_use_virtual = bool(kiwoom_use_virtual)
    return {
        "accountProductCode": str(data.get("accountProductCode", "01")),
        "sync": {
            "domestic": bool(sync.get("domestic", True)),
            "us": us_codes,
        },
        "usdKrwRate": usd_krw_rate if usd_krw_rate > 0 else None,
        "statsBaselineV": stats_baseline_v,
        "kiwoomUseVirtual": kiwoom_use_virtual,
    }


def parse_sync_config(extra_json_raw: str | None) -> tuple[bool, list[str]]:
    extra = parse_extra(extra_json_raw)
    sync = extra.get("sync", DEFAULT_SYNC_CONFIG)
    return bool(sync.get("domestic", True)), list(sync.get("us", []))
