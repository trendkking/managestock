from datetime import date, datetime
from decimal import Decimal

from app.brokers.base import BrokerTrade
from app.brokers.kis import KIS_SYNC_MEMO_PREFIX
from app.models import Account, Trade, User
from app.services.account_sync_service import _apply_domestic_trades_import, _dedupe_sync_trades_by_memo


def _broker_trade(external_id: str) -> BrokerTrade:
    return BrokerTrade(
        stock_code="233740",
        stock_name="KODEX 코스닥150레버리지",
        trade_type="sell",
        quantity=500,
        price=Decimal("15630"),
        fee=Decimal("0"),
        tax=Decimal("0"),
        realized_pnl=Decimal("-140328"),
        traded_at=datetime(2026, 5, 27, 15, 0, 0),
        external_id=external_id,
    )


def test_apply_domestic_trades_import_is_idempotent(db_session):
    user = db_session.query(User).filter_by(email="test@gmail.com").one()
    account = Account(
        user_id=user.id,
        name="dedupe-test",
        broker="한국투자",
        broker_code="kis",
        connection_mode="api",
        initial_capital=Decimal("1000000"),
        cash_balance=Decimal("1000000"),
    )
    db_session.add(account)
    db_session.flush()

    item = _broker_trade("profit:20260527:233740:500:15630:7815000")
    from_date = date(2026, 5, 1)
    to_date = date(2026, 5, 31)

    _apply_domestic_trades_import(db_session, account, [item], from_date=from_date, to_date=to_date)
    _apply_domestic_trades_import(db_session, account, [item], from_date=from_date, to_date=to_date)

    trades = db_session.query(Trade).filter_by(account_id=account.id).all()
    assert len(trades) == 1
    assert trades[0].memo == f"{KIS_SYNC_MEMO_PREFIX}{item.external_id}"


def test_dedupe_kis_sync_trades_by_memo(db_session):
    user = db_session.query(User).filter_by(email="test@gmail.com").one()
    account = Account(
        user_id=user.id,
        name="dedupe-test-2",
        broker="한국투자",
        broker_code="kis",
        connection_mode="api",
        initial_capital=Decimal("1000000"),
        cash_balance=Decimal("1000000"),
    )
    db_session.add(account)
    db_session.flush()

    memo = f"{KIS_SYNC_MEMO_PREFIX}profit:20260527:233740:500:15630:7815000"
    for _ in range(2):
        db_session.add(
            Trade(
                account_id=account.id,
                stock_code="233740",
                stock_name="KODEX 코스닥150레버리지",
                trade_type="sell",
                quantity=500,
                price=Decimal("15630"),
                fee=Decimal("0"),
                tax=Decimal("0"),
                realized_pnl=Decimal("-140328"),
                traded_at=datetime(2026, 5, 27, 15, 0, 0),
                memo=memo,
            )
        )
    db_session.flush()

    removed = _dedupe_sync_trades_by_memo(db_session, account)
    trades = db_session.query(Trade).filter_by(account_id=account.id).all()

    assert removed == 1
    assert len(trades) == 1
