from datetime import datetime
from decimal import Decimal

from pydantic import Field

from app.brokers.kis import KISBrokerAdapter
from app.schemas.base import CamelModel, date_iso, dt_iso, to_float
from app.services.calculations import account_stats
from app.services.holdings_portfolio import holding_detail_dict, portfolio_summary_dict


def _fx_for_account(account) -> Decimal | None:
    credential = getattr(account, "credential", None)
    if credential is None or not credential.extra_json:
        return None
    extra = KISBrokerAdapter.parse_extra(credential.extra_json)
    rate = extra.get("usdKrwRate")
    if rate and rate > 0:
        return Decimal(rate)
    return None


class AccountCreateRequest(CamelModel):
    name: str = Field(min_length=1, max_length=50)
    broker: str = Field(min_length=1, max_length=50)
    initial_capital: Decimal = Field(gt=0)
    description: str | None = None


class AccountUpdateRequest(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    broker: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = None


class HoldingUpsertRequest(CamelModel):
    stock_code: str = Field(min_length=1, max_length=6)
    stock_name: str = Field(min_length=1, max_length=100)
    quantity: int = Field(ge=0)
    avg_price: Decimal = Field(ge=0)
    current_price: Decimal = Field(ge=0)


class TradeImportRequest(CamelModel):
    from_date: str = Field(description="YYYY-MM-DD")
    to_date: str = Field(description="YYYY-MM-DD")


class TradeImportResponse(CamelModel):
    from_date: str
    to_date: str
    imported: int
    trades: list["TradeResponse"]


class TradeCreateRequest(CamelModel):
    stock_code: str = Field(min_length=1, max_length=6)
    stock_name: str = Field(min_length=1, max_length=100)
    trade_type: str
    quantity: int = Field(gt=0)
    price: Decimal = Field(gt=0)
    fee: Decimal = Field(default=Decimal("0"), ge=0)
    tax: Decimal = Field(default=Decimal("0"), ge=0)
    traded_at: datetime
    memo: str | None = None


class HoldingResponse(CamelModel):
    id: int
    account_id: int
    market_type: str = "domestic"
    exchange_code: str | None = None
    stock_code: str
    stock_name: str
    quantity: int
    avg_price: float
    current_price: float

    @classmethod
    def from_orm(cls, h) -> "HoldingResponse":
        return cls(
            id=h.id,
            account_id=h.account_id,
            market_type=getattr(h, "market_type", "domestic") or "domestic",
            exchange_code=getattr(h, "exchange_code", None),
            stock_code=h.stock_code,
            stock_name=h.stock_name,
            quantity=h.quantity,
            avg_price=to_float(h.avg_price),
            current_price=to_float(h.current_price),
        )


class HoldingDetailResponse(HoldingResponse):
    orderable_quantity: int
    purchase_amount: float
    evaluation_amount: float
    profit_loss: float
    return_rate: float
    currency: str

    @classmethod
    def from_orm(cls, h, *, fx: Decimal | None = None) -> "HoldingDetailResponse":
        base = HoldingResponse.from_orm(h)
        detail = holding_detail_dict(h, fx)
        return cls(**base.model_dump(), **detail)


class HoldingsPortfolioSummary(CamelModel):
    total_deposit: float
    total_assets: float
    evaluation_amount: float
    purchase_amount: float
    profit_loss: float
    return_rate: float

    @classmethod
    def from_account(cls, account, holdings: list, *, fx: Decimal | None = None) -> "HoldingsPortfolioSummary":
        return cls(**portfolio_summary_dict(account, holdings, fx))


class TradeResponse(CamelModel):
    id: int
    account_id: int
    stock_code: str
    stock_name: str
    trade_type: str
    quantity: int
    price: float
    fee: float
    tax: float
    realized_pnl: float | None = None
    traded_at: str
    memo: str | None = None

    @classmethod
    def from_orm(cls, t) -> "TradeResponse":
        return cls(
            id=t.id,
            account_id=t.account_id,
            stock_code=t.stock_code,
            stock_name=t.stock_name,
            trade_type=t.trade_type,
            quantity=t.quantity,
            price=to_float(t.price),
            fee=to_float(t.fee),
            tax=to_float(t.tax),
            realized_pnl=to_float(t.realized_pnl) if t.realized_pnl is not None else None,
            traded_at=dt_iso(t.traded_at),
            memo=t.memo,
        )


class PerformancePointResponse(CamelModel):
    date: str
    return_rate: float
    total_value: float


class AccountStatsResponse(CamelModel):
    id: int
    user_id: int
    name: str
    broker: str
    broker_code: str = "manual"
    connection_mode: str = "manual"
    sync_status: str = "manual"
    account_number_masked: str | None = None
    last_synced_at: str | None = None
    last_sync_error: str | None = None
    has_api_credentials: bool = False
    sync_domestic: bool = True
    sync_us_markets: list[str] = Field(default_factory=list)
    usd_krw_rate: float | None = None
    initial_capital: float
    cash_balance: float
    description: str | None = None
    created_at: str
    current_value: float
    profit_loss: float
    return_rate: float

    @classmethod
    def from_account(cls, account, holdings: list) -> "AccountStatsResponse":
        stats = account_stats(account, holdings)
        number = account.account_number
        masked = None
        if number and len(number) >= 4:
            masked = f"{'*' * (len(number) - 4)}{number[-4:]}"
        sync_domestic, sync_us = (True, [])
        usd_krw_rate: float | None = None
        if account.credential is not None:
            sync_domestic, sync_us = KISBrokerAdapter.parse_sync_config(account.credential.extra_json)
            extra = KISBrokerAdapter.parse_extra(account.credential.extra_json)
            rate = extra.get("usdKrwRate")
            if rate and rate > 0:
                usd_krw_rate = to_float(rate)
        return cls(
            id=account.id,
            user_id=account.user_id,
            name=account.name,
            broker=account.broker,
            broker_code=getattr(account, "broker_code", "manual") or "manual",
            connection_mode=getattr(account, "connection_mode", "manual") or "manual",
            sync_status=getattr(account, "sync_status", "manual") or "manual",
            account_number_masked=masked,
            last_synced_at=dt_iso(account.last_synced_at) if account.last_synced_at else None,
            last_sync_error=account.last_sync_error,
            has_api_credentials=account.credential is not None,
            sync_domestic=sync_domestic,
            sync_us_markets=sync_us,
            usd_krw_rate=usd_krw_rate,
            initial_capital=to_float(account.initial_capital),
            cash_balance=to_float(account.cash_balance),
            description=account.description,
            created_at=dt_iso(account.created_at),
            current_value=to_float(stats["current_value"]),
            profit_loss=to_float(stats["profit_loss"]),
            return_rate=to_float(stats["return_rate"]),
        )


class AccountDetailResponse(AccountStatsResponse):
    holdings: list[HoldingDetailResponse]
    holdings_summary: HoldingsPortfolioSummary
    trades: list[TradeResponse]
    performance: list[PerformancePointResponse]


class AccountListResponse(CamelModel):
    items: list[AccountStatsResponse]
    total: int
