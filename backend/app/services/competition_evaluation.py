"""대회 평가금액: 시가 마킹 미실현(A) + 기간 실현손익(B)."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from app.models import Account, Holding, Trade
from app.services.calculations import _usd_krw_rate_for_account, realized_pnl_in_period
from app.services.market_data_service import get_daily_prices
from app.services.portfolio_valuation import _last_trade_price_on_or_before, _replay_positions


def _opening_price_on_or_before(stock_code: str, as_of: date, trades: list[Trade]) -> Decimal | None:
    for offset in range(0, 10):
        day = as_of - timedelta(days=offset)
        points = get_daily_prices(stock_code, day, day)
        if points:
            return Decimal(str(points[0]["open"])).quantize(Decimal("0.01"))
    fallback = _last_trade_price_on_or_before(trades, stock_code, as_of)
    if fallback is not None:
        return fallback.quantize(Decimal("0.01"))
    return None


def _start_day_long_positions(trades: list[Trade], start_date: date) -> dict[str, int]:
    positions = _replay_positions(trades, start_date)
    return {code: int(pos["qty"]) for code, pos in positions.items() if pos["qty"] > 0}


def _holding_market(h: Holding) -> str:
    return getattr(h, "market_type", "domestic") or "domestic"


def _pnl_krw(
    qty: int,
    current_price: Decimal,
    mark_price: Decimal,
    *,
    market_type: str,
    fx: Decimal | None,
) -> Decimal:
    if qty <= 0:
        return Decimal("0")
    pnl = Decimal(qty) * (current_price - mark_price)
    if market_type == "us" and fx and fx > 0:
        return (pnl * fx).quantize(Decimal("0.01"))
    return pnl.quantize(Decimal("0.01"))


def competition_unrealized_pnl(
    account: Account,
    holdings: list[Holding],
    trades: list[Trade],
    start_date: date,
    period_end: date,
) -> Decimal:
    """A: 시작일 보유분은 시가 마킹, 기간 중 매수분은 매입가 마킹."""
    start_pos = _start_day_long_positions(trades, start_date)
    if not start_pos and not holdings:
        return Decimal("0")

    fx = _usd_krw_rate_for_account(account)
    holding_by_code = {h.stock_code: h for h in holdings if h.quantity > 0}
    total = Decimal("0")

    for code, start_qty in start_pos.items():
        holding = holding_by_code.get(code)
        if holding is None:
            continue
        qty = min(int(holding.quantity), start_qty)
        if qty <= 0:
            continue
        open_price = _opening_price_on_or_before(code, start_date, trades)
        if open_price is None:
            continue
        total += _pnl_krw(
            qty,
            holding.current_price,
            open_price,
            market_type=_holding_market(holding),
            fx=fx,
        )

    for holding in holdings:
        if holding.quantity <= 0:
            continue
        start_qty = start_pos.get(holding.stock_code, 0)
        new_qty = int(holding.quantity) - start_qty
        if new_qty <= 0:
            continue
        total += _pnl_krw(
            new_qty,
            holding.current_price,
            holding.avg_price,
            market_type=_holding_market(holding),
            fx=fx,
        )

    return total.quantize(Decimal("0.01"))


def competition_baseline_evaluation() -> Decimal:
    """대회 시작일 평가금액 — 시가 마킹 기준 0."""
    return Decimal("0")


def competition_current_evaluation(
    account: Account,
    holdings: list[Holding],
    trades: list[Trade],
    start_date: date,
    period_end: date,
) -> tuple[Decimal, Decimal, Decimal]:
    """(total, unrealized_A, realized_B)"""
    unrealized = competition_unrealized_pnl(account, holdings, trades, start_date, period_end)
    realized = realized_pnl_in_period(trades, start_date, period_end)
    total = (unrealized + realized).quantize(Decimal("0.01"))
    return total, unrealized, realized


def competition_score(total: Decimal, baseline: Decimal | None = None) -> Decimal:
    base = baseline if baseline is not None else competition_baseline_evaluation()
    return (total - base).quantize(Decimal("0.01"))
