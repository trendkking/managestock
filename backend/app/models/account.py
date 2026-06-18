from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (Index("idx_accounts_user_id", "user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    broker: Mapped[str] = mapped_column(String(50), nullable=False)
    initial_capital: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    cash_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    broker_code: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    account_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    connection_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    sync_status: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship(back_populates="accounts")
    credential: Mapped["AccountCredential | None"] = relationship(
        back_populates="account", cascade="all, delete-orphan", uselist=False
    )
    holdings: Mapped[list["Holding"]] = relationship(back_populates="account", cascade="all, delete-orphan")
    trades: Mapped[list["Trade"]] = relationship(back_populates="account", cascade="all, delete-orphan")
    snapshots: Mapped[list["AccountSnapshot"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )
    journals: Mapped[list["Journal"]] = relationship(back_populates="account")
    competition_entries: Mapped[list["CompetitionEntry"]] = relationship(back_populates="account")
    cash_flows: Mapped[list["AccountCashFlow"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )


class Holding(Base):
    __tablename__ = "holdings"
    __table_args__ = (
        UniqueConstraint("account_id", "market_type", "stock_code", name="uq_holdings_account_market_stock"),
        Index("idx_holdings_account_id", "account_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    market_type: Mapped[str] = mapped_column(String(10), nullable=False, default="domestic")
    exchange_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    stock_code: Mapped[str] = mapped_column(String(12), nullable=False)
    stock_name: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    orderable_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    avg_price: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    current_price: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    purchase_amount: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    evaluation_amount: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    profit_loss: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    return_rate: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    account: Mapped["Account"] = relationship(back_populates="holdings")


class Trade(Base):
    __tablename__ = "trades"
    __table_args__ = (
        Index("idx_trades_account_id", "account_id"),
        Index("idx_trades_traded_at", "traded_at"),
        Index("idx_trades_stock_code", "stock_code"),
        Index("idx_trades_account_traded", "account_id", "traded_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    stock_code: Mapped[str] = mapped_column(String(6), nullable=False)
    stock_name: Mapped[str] = mapped_column(String(100), nullable=False)
    trade_type: Mapped[str] = mapped_column(String(4), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    fee: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    tax: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    realized_pnl: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    traded_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    account: Mapped["Account"] = relationship(back_populates="trades")
    journal_links: Mapped[list["JournalTrade"]] = relationship(
        back_populates="trade", cascade="all, delete-orphan"
    )


class AccountSnapshot(Base):
    __tablename__ = "account_snapshots"
    __table_args__ = (
        UniqueConstraint("account_id", "snapshot_date", name="uq_snapshots_account_date"),
        Index("idx_snapshots_account_date", "account_id", "snapshot_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_value: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    return_rate: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    cash_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    evaluation_amount: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    account: Mapped["Account"] = relationship(back_populates="snapshots")
