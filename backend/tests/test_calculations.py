from decimal import Decimal

from app.models import Holding
from app.services.calculations import account_stats, holdings_unrealized_pnl_krw


class _FakeCredential:
    extra_json = '{"usdKrwRate": 1350.0, "statsBaselineV": 2}'


class _FakeAccount:
    cash_balance = Decimal("1000000")
    initial_capital = Decimal("99999999")
    credential = _FakeCredential()


def test_profit_loss_equals_sum_of_holding_pnl_times_fx():
    holdings = [
        Holding(
            id=1,
            account_id=1,
            market_type="us",
            exchange_code="AMEX",
            stock_code="GLD",
            stock_name="GLD",
            quantity=2,
            avg_price=Decimal("260"),
            current_price=Decimal("413"),
        ),
        Holding(
            id=2,
            account_id=1,
            market_type="us",
            exchange_code="AMEX",
            stock_code="SLV",
            stock_name="SLV",
            quantity=10,
            avg_price=Decimal("30"),
            current_price=Decimal("69"),
        ),
    ]
    fx = Decimal("1350")
    expected = holdings_unrealized_pnl_krw(holdings, fx)
    assert expected == Decimal((306 + 390) * 1350)  # 939600

    stats = account_stats(_FakeAccount(), holdings)
    assert stats["profit_loss"] == expected
