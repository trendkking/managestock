from datetime import date, datetime
from decimal import Decimal
from unittest.mock import patch

from app.models import Account, Holding, Trade
from app.services.competition_evaluation import (
    competition_baseline_evaluation,
    competition_current_evaluation,
    competition_score,
    competition_unrealized_pnl,
)
from app.services.competition_service import compute_competition_scores
from app.services.calculations import realized_pnl_in_period


def _trade(trade_type: str, realized: str | None, day: int, *, code: str = "005930") -> Trade:
    return Trade(
        account_id=1,
        stock_code=code,
        stock_name="삼성전자",
        trade_type=trade_type,
        quantity=10,
        price=Decimal("70000"),
        fee=Decimal("0"),
        tax=Decimal("0"),
        realized_pnl=Decimal(realized) if realized is not None else None,
        traded_at=datetime(2026, 4, day, 12, 0),
    )


def test_realized_pnl_in_period_filters_quarter():
    trades = [
        _trade("sell", "10000", 5),
        _trade("sell", "20000", 20),
        Trade(
            account_id=1,
            stock_code="005930",
            stock_name="삼성전자",
            trade_type="sell",
            quantity=10,
            price=Decimal("70000"),
            fee=Decimal("0"),
            tax=Decimal("0"),
            realized_pnl=Decimal("5000"),
            traded_at=datetime(2026, 3, 31, 12, 0),
        ),
    ]
    assert realized_pnl_in_period(trades, date(2026, 4, 1), date(2026, 4, 30)) == Decimal("30000.00")


def test_baseline_is_zero():
    assert competition_baseline_evaluation() == Decimal("0")


@patch("app.services.competition_evaluation.get_daily_prices")
def test_open_mark_unrealized_for_start_holdings(mock_prices):
    mock_prices.return_value = [{"date": "2026-04-01", "open": 60000.0, "high": 0, "low": 0, "close": 0, "volume": 0}]
    account = Account(user_id=1, name="t", broker="키움", initial_capital=Decimal("1000000"), cash_balance=Decimal("0"))
    holdings = [
        Holding(
            account_id=1,
            stock_code="005930",
            stock_name="삼성전자",
            quantity=10,
            avg_price=Decimal("50000"),
            current_price=Decimal("70000"),
        )
    ]
    trades = [
        Trade(
            account_id=1,
            stock_code="005930",
            stock_name="삼성전자",
            trade_type="buy",
            quantity=10,
            price=Decimal("50000"),
            fee=Decimal("0"),
            tax=Decimal("0"),
            traded_at=datetime(2026, 3, 1, 10, 0),
        )
    ]
    unrealized = competition_unrealized_pnl(account, holdings, trades, date(2026, 4, 1), date(2026, 5, 1))
    assert unrealized == Decimal("100000.00")


@patch("app.services.competition_evaluation.get_daily_prices")
def test_score_is_unrealized_plus_period_realized(mock_prices):
    mock_prices.return_value = [{"date": "2026-04-01", "open": 60000.0, "high": 0, "low": 0, "close": 0, "volume": 0}]
    account = Account(user_id=1, name="t", broker="키움", initial_capital=Decimal("1000000"), cash_balance=Decimal("0"))
    holdings = [
        Holding(
            account_id=1,
            stock_code="005930",
            stock_name="삼성전자",
            quantity=10,
            avg_price=Decimal("50000"),
            current_price=Decimal("70000"),
        )
    ]
    trades = [
        Trade(
            account_id=1,
            stock_code="005930",
            stock_name="삼성전자",
            trade_type="buy",
            quantity=10,
            price=Decimal("50000"),
            fee=Decimal("0"),
            tax=Decimal("0"),
            traded_at=datetime(2026, 3, 1, 10, 0),
        ),
        _trade("sell", "30000", 15),
    ]
    total, unrealized, realized = competition_current_evaluation(
        account, holdings, trades, date(2026, 4, 1), date(2026, 5, 31)
    )
    assert unrealized == Decimal("100000.00")
    assert realized == Decimal("30000.00")
    assert total == Decimal("130000.00")
    assert competition_score(total) == Decimal("130000.00")


def test_no_start_holdings_uses_realized_only(db_session):
    from app.models import Competition, User

    user = db_session.query(User).filter_by(email="test@gmail.com").one()
    account = Account(
        user_id=user.id,
        name="score-test",
        broker="키움",
        initial_capital=Decimal("1000000"),
        cash_balance=Decimal("500000"),
        connection_mode="manual",
    )
    db_session.add(account)
    db_session.flush()

    comp = Competition(
        name="Q2 test",
        start_date=date(2026, 4, 1),
        end_date=date(2026, 6, 30),
        status="active",
    )
    db_session.add(comp)
    db_session.commit()

    trades = [_trade("sell", "45000", 20)]
    baseline, current, score, unrealized, realized = compute_competition_scores(
        db_session, account, [], trades, comp, today=date(2026, 6, 7)
    )
    assert baseline == Decimal("0.00")
    assert unrealized == Decimal("0.00")
    assert realized == Decimal("45000.00")
    assert current == Decimal("45000.00")
    assert score == Decimal("45000.00")
