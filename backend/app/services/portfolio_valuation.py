"""계좌 총평가(예수금+보유종목) 및 기준일 역산."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Account, AccountCashFlow, AccountSnapshot, Holding, Trade
from app.services.calculations import _usd_krw_rate_for_account, account_stats


@dataclass(frozen=True)
class PeriodCashFlowTotals:
    deposits: Decimal
    withdrawals: Decimal

    @property
    def net(self) -> Decimal:
        return (self.deposits - self.withdrawals).quantize(Decimal("0.01"))


def load_account_cash_flows(db: Session, account_id: int) -> list[AccountCashFlow]:
    return list(
        db.scalars(
            select(AccountCashFlow)
            .where(AccountCashFlow.account_id == account_id)
            .order_by(AccountCashFlow.flow_date, AccountCashFlow.id)
        ).all()
    )


def period_cash_flow_totals(
    db: Session,
    account_id: int,
    start_date: date,
    end_date: date,
) -> PeriodCashFlowTotals:
    flows = list(
        db.scalars(
            select(AccountCashFlow).where(
                AccountCashFlow.account_id == account_id,
                AccountCashFlow.flow_date >= start_date,
                AccountCashFlow.flow_date <= end_date,
            )
        ).all()
    )
    deposits = Decimal("0")
    withdrawals = Decimal("0")
    for flow in flows:
        if flow.flow_type == "deposit":
            deposits += Decimal(flow.amount)
        elif flow.flow_type == "withdraw":
            withdrawals += Decimal(flow.amount)
    return PeriodCashFlowTotals(
        deposits=deposits.quantize(Decimal("0.01")),
        withdrawals=withdrawals.quantize(Decimal("0.01")),
    )


def account_total_value_now(account: Account, holdings: list[Holding]) -> Decimal:
    return account_stats(account, holdings)["current_value"]


def _uses_api_cash_replay(account: Account) -> bool:
    return account.connection_mode == "api"


def _replay_positions(trades: list[Trade], through_date: date) -> dict[str, dict]:
    positions: dict[str, dict] = defaultdict(lambda: {"qty": 0, "cost": Decimal("0"), "name": ""})
    for trade in sorted(trades, key=lambda t: t.traded_at):
        if trade.traded_at.date() > through_date:
            continue
        code = trade.stock_code
        positions[code]["name"] = trade.stock_name
        qty = int(trade.quantity)
        if trade.trade_type == "buy":
            positions[code]["qty"] += qty
            positions[code]["cost"] += Decimal(trade.quantity) * trade.price + trade.fee + trade.tax
        elif trade.trade_type == "sell":
            pos = positions[code]
            if pos["qty"] > 0:
                avg = pos["cost"] / pos["qty"]
                pos["qty"] -= qty
                pos["cost"] -= avg * qty
            else:
                pos["qty"] -= qty
    return positions


def _last_trade_price_on_or_before(trades: list[Trade], stock_code: str, as_of: date) -> Decimal | None:
    price: Decimal | None = None
    for trade in sorted(trades, key=lambda t: t.traded_at):
        if trade.stock_code != stock_code:
            continue
        if trade.traded_at.date() > as_of:
            break
        price = trade.price
    return price


def _apply_trade_to_cash(cash: Decimal, trade: Trade, *, reverse: bool) -> Decimal:
    gross = Decimal(trade.quantity) * trade.price
    if trade.trade_type == "buy":
        delta = gross + trade.fee + trade.tax
        return cash + delta if reverse else cash - delta
    if trade.trade_type == "sell":
        delta = gross - trade.fee - trade.tax
        return cash - delta if reverse else cash + delta
    return cash


def cash_balance_at_date_forward(
    account: Account,
    trades: list[Trade],
    cash_flows: list[AccountCashFlow],
    as_of: date,
) -> Decimal:
    """수동 계좌: 초기자본(예수금)에서 거래·입출금을 순방향 재생."""
    cash = Decimal(account.initial_capital)
    for flow in cash_flows:
        if flow.flow_date > as_of:
            continue
        amount = Decimal(flow.amount)
        if flow.flow_type == "deposit":
            cash += amount
        elif flow.flow_type == "withdraw":
            cash -= amount
    for trade in sorted(trades, key=lambda t: t.traded_at):
        if trade.traded_at.date() > as_of:
            continue
        cash = _apply_trade_to_cash(cash, trade, reverse=False)
    return cash.quantize(Decimal("0.01"))


def cash_balance_at_date_backward(
    account: Account,
    trades: list[Trade],
    cash_flows: list[AccountCashFlow],
    as_of: date,
    *,
    anchor_date: date | None = None,
    anchor_cash: Decimal | None = None,
) -> Decimal:
    """API 계좌: 동기화된 현재 예수금에서 거래·입출금을 역방향 재생."""
    anchor_date = anchor_date or date.today()
    cash = anchor_cash if anchor_cash is not None else Decimal(account.cash_balance)
    if as_of >= anchor_date:
        return cash.quantize(Decimal("0.01"))

    for trade in sorted(trades, key=lambda t: t.traded_at, reverse=True):
        trade_date = trade.traded_at.date()
        if trade_date <= as_of or trade_date > anchor_date:
            continue
        cash = _apply_trade_to_cash(cash, trade, reverse=True)

    for flow in sorted(cash_flows, key=lambda f: (f.flow_date, f.id), reverse=True):
        if flow.flow_date <= as_of or flow.flow_date > anchor_date:
            continue
        amount = Decimal(flow.amount)
        if flow.flow_type == "deposit":
            cash -= amount
        elif flow.flow_type == "withdraw":
            cash += amount

    return cash.quantize(Decimal("0.01"))


def cash_balance_at_date(
    account: Account,
    trades: list[Trade],
    cash_flows: list[AccountCashFlow],
    as_of: date,
) -> Decimal:
    if _uses_api_cash_replay(account):
        return cash_balance_at_date_backward(account, trades, cash_flows, as_of)
    return cash_balance_at_date_forward(account, trades, cash_flows, as_of)


def holdings_value_at_date(
    trades: list[Trade],
    as_of: date,
    *,
    fx: Decimal | None,
) -> Decimal:
    positions = _replay_positions(trades, as_of)
    total = Decimal("0")
    for code, pos in positions.items():
        qty = pos["qty"]
        if qty <= 0:
            continue
        price = _last_trade_price_on_or_before(trades, code, as_of)
        if price is None:
            continue
        # 역산 시 시장 구분 정보가 없으면 국내 원화로 처리
        total += Decimal(qty) * price
    return total.quantize(Decimal("0.01"))


def _api_cash_for_total(cash: Decimal) -> Decimal:
    """마진·동기화 누락 시 역산 예수금이 음수면 보수적으로 0으로 처리."""
    if cash < 0:
        return Decimal("0")
    return cash


def account_total_value_at_date(
    db: Session,
    account: Account,
    holdings: list[Holding],
    trades: list[Trade],
    cash_flows: list[AccountCashFlow],
    as_of: date,
) -> Decimal:
    if as_of == date.today():
        return account_total_value_now(account, holdings)

    snap = db.scalar(
        select(AccountSnapshot).where(
            AccountSnapshot.account_id == account.id,
            AccountSnapshot.snapshot_date == as_of,
        )
    )
    if snap is not None:
        return Decimal(snap.total_value).quantize(Decimal("0.01"))

    fx = _usd_krw_rate_for_account(account)
    cash = cash_balance_at_date(account, trades, cash_flows, as_of)
    if _uses_api_cash_replay(account):
        cash = _api_cash_for_total(cash)
    hv = holdings_value_at_date(trades, as_of, fx=fx)
    return (cash + hv).quantize(Decimal("0.01"))


def ensure_baseline_snapshot(
    db: Session,
    account: Account,
    holdings: list[Holding],
    trades: list[Trade],
    cash_flows: list[AccountCashFlow],
    baseline_date: date,
) -> None:
    """대회 기준일 스냅샷이 없으면 한 번 저장해 기초 총평가를 고정."""
    if baseline_date >= date.today():
        return

    existing = db.scalar(
        select(AccountSnapshot).where(
            AccountSnapshot.account_id == account.id,
            AccountSnapshot.snapshot_date == baseline_date,
        )
    )
    if existing is not None:
        return

    total = account_total_value_at_date(db, account, holdings, trades, cash_flows, baseline_date)
    cash = cash_balance_at_date(account, trades, cash_flows, baseline_date)
    if _uses_api_cash_replay(account):
        cash = _api_cash_for_total(cash)

    from app.utils.time import utc_now

    db.add(
        AccountSnapshot(
            account_id=account.id,
            snapshot_date=baseline_date,
            total_value=total,
            return_rate=Decimal("0"),
            cash_balance=cash,
            evaluation_amount=None,
            created_at=utc_now(),
        )
    )
    db.flush()
