from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AccountCashFlow(Base):
    """계좌 입·출금 (대회 순입금 보정용)."""

    __tablename__ = "account_cash_flows"
    __table_args__ = (
        Index("idx_cash_flows_account_date", "account_id", "flow_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    flow_date: Mapped[date] = mapped_column(Date, nullable=False)
    flow_type: Mapped[str] = mapped_column(String(10), nullable=False)  # deposit | withdraw
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    account: Mapped["Account"] = relationship(back_populates="cash_flows")
