from datetime import date
from decimal import Decimal

from app.brokers.sync_config import parse_extra, parse_sync_config
from app.models import Account, Holding, Trade


def _usd_krw_rate_for_account(account: Account) -> Decimal | None:
    credential = getattr(account, "credential", None)
    if credential is None or not credential.extra_json:
        return None
    extra = parse_extra(credential.extra_json)
    rate = extra.get("usdKrwRate")
    if rate and rate > 0:
        return Decimal(rate)
    return None


def holding_value_krw(h: Holding, usd_krw_rate: Decimal | None) -> Decimal:
    value = Decimal(h.quantity) * h.current_price
    market = getattr(h, "market_type", "domestic") or "domestic"
    if market == "us" and usd_krw_rate and usd_krw_rate > 0:
        return (value * usd_krw_rate).quantize(Decimal("0.01"))
    return value


def holdings_value(holdings: list[Holding], *, usd_krw_rate: Decimal | None = None) -> Decimal:
    total = Decimal("0")
    for h in holdings:
        total += holding_value_krw(h, usd_krw_rate)
    return total


def holdings_unrealized_pnl_krw(holdings: list[Holding], usd_krw_rate: Decimal | None) -> Decimal:
    from app.services.holdings_portfolio import holdings_unrealized_pnl_krw as _sum_pnl

    return _sum_pnl(holdings, usd_krw_rate)


def holdings_cost_basis_krw(holdings: list[Holding], usd_krw_rate: Decimal | None) -> Decimal:
    """보유종목 매입원가 합계(원화)."""
    hv = holdings_value(holdings, usd_krw_rate=usd_krw_rate)
    unrealized = holdings_unrealized_pnl_krw(holdings, usd_krw_rate)
    return (hv - unrealized).quantize(Decimal("0.01"))


def account_stats(account: Account, holdings: list[Holding]) -> dict[str, Decimal]:
    fx = _usd_krw_rate_for_account(account)
    hv = holdings_value(holdings, usd_krw_rate=fx)
    current_value = account.cash_balance + hv
    # 상단 손익 = 표의 평가손익 합(미국 종목은 USD 손익 × 동기화 환율)
    profit_loss = holdings_unrealized_pnl_krw(holdings, fx)
    cost_basis = holdings_cost_basis_krw(holdings, fx)
    if cost_basis > 0:
        return_rate = (profit_loss / cost_basis) * Decimal("100")
    elif account.initial_capital > 0:
        return_rate = (profit_loss / account.initial_capital) * Decimal("100")
    else:
        return_rate = Decimal("0")
    return {
        "holdings_value": hv,
        "current_value": current_value,
        "profit_loss": profit_loss,
        "return_rate": return_rate.quantize(Decimal("0.0001")),
    }


def realized_pnl_through_date(trades: list[Trade], through_date: date) -> Decimal:
    """기준일(포함)까지 매도 실현손익 합."""
    total = Decimal("0")
    for trade in trades:
        if trade.trade_type != "sell" or trade.realized_pnl is None:
            continue
        if trade.traded_at.date() <= through_date:
            total += Decimal(trade.realized_pnl)
    return total.quantize(Decimal("0.01"))


def realized_pnl_in_period(trades: list[Trade], start_date: date, end_date: date) -> Decimal:
    """분기 구간 [start_date, end_date] 매도 실현손익 합."""
    total = Decimal("0")
    for trade in trades:
        if trade.trade_type != "sell" or trade.realized_pnl is None:
            continue
        traded_on = trade.traded_at.date()
        if start_date <= traded_on <= end_date:
            total += Decimal(trade.realized_pnl)
    return total.quantize(Decimal("0.01"))


def realized_pnl_total_krw(trades: list[Trade]) -> Decimal:
    """매도 체결의 실현손익 합(원화 저장값 기준)."""
    return realized_pnl_through_date(trades, date.max)


def competition_baseline_evaluation(
    account: Account,
    holdings: list[Holding],
    trades: list[Trade],
    baseline_date: date,
    *,
    snapshot_evaluation: Decimal | None = None,
) -> Decimal:
    """분기 시작일 평가금액 = 그날 보유 미실현손익 + 그날까지 실현 매매손익."""
    if snapshot_evaluation is not None:
        return snapshot_evaluation.quantize(Decimal("0.01"))
    fx = _usd_krw_rate_for_account(account)
    unrealized = holdings_unrealized_pnl_krw(holdings, fx) if baseline_date == date.today() else Decimal("0")
    realized = realized_pnl_through_date(trades, baseline_date)
    return (unrealized + realized).quantize(Decimal("0.01"))


def competition_period_evaluation(
    account: Account,
    holdings: list[Holding],
    trades: list[Trade],
    period_start: date,
    period_end: date,
) -> Decimal:
    """대회 '현재' 평가금액 = 오늘 보유 미실현 + period_end까지 누적 실현 (현금·원금 제외)."""
    _ = period_start
    fx = _usd_krw_rate_for_account(account)
    unrealized = holdings_unrealized_pnl_krw(holdings, fx)
    realized = realized_pnl_through_date(trades, period_end)
    return (unrealized + realized).quantize(Decimal("0.01"))


def account_evaluation_amount_at_date(
    account: Account,
    holdings: list[Holding],
    trades: list[Trade],
    as_of_date: date,
) -> Decimal:
    """특정일 기준 평가금액(스냅샷 저장용): 미실현 + 그날까지 실현."""
    return competition_baseline_evaluation(account, holdings, trades, as_of_date)


def account_evaluation_amount(
    account: Account,
    holdings: list[Holding],
    trades: list[Trade],
) -> Decimal:
    """현재 평가금액 = 보유 미실현손익 + 누적 실현 매매손익 (예수금·원금 제외)."""
    return account_evaluation_amount_at_date(account, holdings, trades, date.today())


def competition_evaluation_delta(entry_amount: Decimal, current_amount: Decimal) -> Decimal:
    """대회 성적 = 현재 평가금액 − 시작 평가금액 (분기 순손익, % 아님)."""
    return (current_amount - entry_amount).quantize(Decimal("0.01"))
