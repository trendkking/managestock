from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass
class BrokerHolding:
    stock_code: str
    stock_name: str
    quantity: int
    avg_price: Decimal
    current_price: Decimal
    market_type: str = "domestic"
    exchange_code: str | None = None
    orderable_quantity: int | None = None
    purchase_amount: Decimal | None = None
    evaluation_amount: Decimal | None = None
    profit_loss: Decimal | None = None
    return_rate: Decimal | None = None
    currency: str = "KRW"


@dataclass
class BrokerTrade:
    stock_code: str
    stock_name: str
    trade_type: str
    quantity: int
    price: Decimal
    fee: Decimal
    tax: Decimal
    realized_pnl: Decimal | None
    traded_at: datetime
    external_id: str


@dataclass
class BrokerBalance:
    cash_balance: Decimal
    total_evaluation: Decimal
    holdings: list[BrokerHolding]
    usd_krw_rate: Decimal | None = None


class BrokerError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code
