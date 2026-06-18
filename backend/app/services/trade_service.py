from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Account, Holding, Trade
from app.services.snapshot_service import refresh_competition_entries_for_account, upsert_account_snapshot
from app.utils.time import utc_now


def _trade_day(traded_at: datetime) -> datetime:
    return traded_at


def execute_trade(
    db: Session,
    account: Account,
    *,
    stock_code: str,
    stock_name: str,
    trade_type: str,
    quantity: int,
    price: Decimal,
    fee: Decimal,
    tax: Decimal,
    traded_at: datetime,
    memo: str | None,
) -> Trade:
    if quantity <= 0 or price <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="수량과 단가는 0보다 커야 합니다")
    if trade_type not in ("buy", "sell"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tradeType은 buy 또는 sell 이어야 합니다")

    holdings = list(
        db.scalars(select(Holding).where(Holding.account_id == account.id)).all()
    )
    holding = next((h for h in holdings if h.stock_code == stock_code), None)
    total_cost = price * Decimal(quantity) + fee + tax
    realized_pnl: Decimal | None = None

    if trade_type == "buy":
        account.cash_balance -= total_cost
        if account.cash_balance < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="현금 잔고가 부족합니다")
        if holding:
            new_qty = holding.quantity + quantity
            new_avg = (
                Decimal(holding.quantity) * holding.avg_price + Decimal(quantity) * price + fee
            ) / Decimal(new_qty)
            holding.quantity = new_qty
            holding.avg_price = new_avg.quantize(Decimal("0.01"))
            holding.stock_name = stock_name
            holding.updated_at = utc_now()
        else:
            holding = Holding(
                account_id=account.id,
                stock_code=stock_code,
                stock_name=stock_name,
                quantity=quantity,
                avg_price=price,
                current_price=price,
                updated_at=utc_now(),
            )
            db.add(holding)
            holdings.append(holding)
    else:
        if holding is None or holding.quantity < quantity:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="보유 수량이 부족합니다")
        proceeds = price * Decimal(quantity) - fee - tax
        account.cash_balance += proceeds
        realized_pnl = (price - holding.avg_price) * Decimal(quantity) - fee - tax
        new_qty = holding.quantity - quantity
        if new_qty == 0:
            db.delete(holding)
            holdings = [h for h in holdings if h.id != holding.id]
        else:
            holding.quantity = new_qty
            holding.updated_at = utc_now()

    account.updated_at = utc_now()
    trade = Trade(
        account_id=account.id,
        stock_code=stock_code,
        stock_name=stock_name,
        trade_type=trade_type,
        quantity=quantity,
        price=price,
        fee=fee,
        tax=tax,
        realized_pnl=realized_pnl,
        traded_at=traded_at,
        memo=memo,
        created_at=utc_now(),
    )
    db.add(trade)
    db.flush()

    holdings = list(db.scalars(select(Holding).where(Holding.account_id == account.id)).all())
    snap_date = traded_at.date()
    upsert_account_snapshot(db, account, holdings, snap_date)
    refresh_competition_entries_for_account(db, account, holdings)
    return trade


def upsert_holding(
    db: Session,
    account: Account,
    *,
    stock_code: str,
    stock_name: str,
    quantity: int,
    avg_price: Decimal,
    current_price: Decimal,
) -> Holding:
    holding = db.scalar(
        select(Holding).where(Holding.account_id == account.id, Holding.stock_code == stock_code)
    )
    if holding:
        holding.stock_name = stock_name
        holding.quantity = quantity
        holding.orderable_quantity = quantity
        holding.avg_price = avg_price
        holding.current_price = current_price
        holding.purchase_amount = avg_price * quantity
        holding.evaluation_amount = current_price * quantity
        holding.currency = holding.currency or "KRW"
        holding.updated_at = utc_now()
    else:
        purchase = avg_price * quantity
        evaluation = current_price * quantity
        holding = Holding(
            account_id=account.id,
            stock_code=stock_code,
            stock_name=stock_name,
            quantity=quantity,
            orderable_quantity=quantity,
            avg_price=avg_price,
            current_price=current_price,
            purchase_amount=purchase,
            evaluation_amount=evaluation,
            currency="KRW",
            updated_at=utc_now(),
        )
        db.add(holding)
    db.flush()
    holdings = list(db.scalars(select(Holding).where(Holding.account_id == account.id)).all())
    upsert_account_snapshot(db, account, holdings)
    refresh_competition_entries_for_account(db, account, holdings)
    return holding
