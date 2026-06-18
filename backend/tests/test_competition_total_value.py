from datetime import date, datetime
from decimal import Decimal

from app.models import Account, Competition, Trade, User
from app.services.competition_service import compute_competition_scores
from app.services.portfolio_valuation import (
    cash_balance_at_date,
    cash_balance_at_date_forward,
    holdings_value_at_date,
)


def test_manual_cash_replay_forward():
    account = Account(
        user_id=1,
        name="t",
        broker="키움",
        initial_capital=Decimal("1000000"),
        cash_balance=Decimal("300000"),
        connection_mode="manual",
    )
    trades = [
        Trade(
            account_id=1,
            stock_code="005930",
            stock_name="삼성",
            trade_type="buy",
            quantity=10,
            price=Decimal("70000"),
            fee=Decimal("0"),
            tax=Decimal("0"),
            traded_at=datetime(2026, 3, 1, 10, 0),
        )
    ]
    cash = cash_balance_at_date(account, trades, [], date(2026, 4, 1))
    assert cash == Decimal("300000.00")
    hv = holdings_value_at_date(trades, date(2026, 4, 1), fx=None)
    assert hv == Decimal("700000.00")


def test_api_cash_replay_backward_not_initial_capital():
    """API 계좌는 initial_capital(총평가)을 예수금 시드로 쓰지 않는다."""
    account = Account(
        user_id=1,
        name="kis",
        broker="한국투자",
        initial_capital=Decimal("59127562"),
        cash_balance=Decimal("34927562"),
        connection_mode="api",
    )
    trades = [
        Trade(
            account_id=1,
            stock_code="233740",
            stock_name="KODEX",
            trade_type="sell",
            quantity=2404,
            price=Decimal("17000"),
            fee=Decimal("0"),
            tax=Decimal("0"),
            traded_at=datetime(2026, 5, 1, 10, 0),
        )
    ]
    forward_if_wrong = cash_balance_at_date_forward(account, trades, [], date(2026, 4, 1))
    backward = cash_balance_at_date(account, trades, [], date(2026, 4, 1))
    assert forward_if_wrong == Decimal("59127562.00")
    assert backward == Decimal("-5940438.00")
    assert backward != forward_if_wrong


def test_score_formula_manual(db_session):
    from app.models import Competition, User

    user = db_session.query(User).filter_by(email="test@gmail.com").one()
    account = Account(
        user_id=user.id,
        name="score-test",
        broker="키움",
        initial_capital=Decimal("1000000"),
        cash_balance=Decimal("1100000"),
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

    baseline, current, score, unrealized, realized = compute_competition_scores(
        db_session, account, [], [], comp, today=date(2026, 6, 7)
    )
    assert baseline == Decimal("0.00")
    assert current == Decimal("0.00")
    assert unrealized == Decimal("0.00")
    assert realized == Decimal("0.00")
    assert score == Decimal("0.00")
