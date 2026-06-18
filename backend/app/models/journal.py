from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Journal(Base):
    __tablename__ = "journals"
    __table_args__ = (
        Index("idx_journals_user_id", "user_id"),
        Index("idx_journals_journal_date", "journal_date"),
        Index("idx_journals_account_id", "account_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_id: Mapped[int | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    journal_date: Mapped[date] = mapped_column(Date, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    reflection: Mapped[str | None] = mapped_column(Text, nullable=True)
    emotion: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship(back_populates="journals")
    account: Mapped["Account | None"] = relationship(back_populates="journals")
    tags: Mapped[list["JournalTag"]] = relationship(back_populates="journal", cascade="all, delete-orphan")
    stocks: Mapped[list["JournalStock"]] = relationship(back_populates="journal", cascade="all, delete-orphan")
    trade_links: Mapped[list["JournalTrade"]] = relationship(back_populates="journal", cascade="all, delete-orphan")


class JournalTag(Base):
    __tablename__ = "journal_tags"
    __table_args__ = (
        Index("idx_journal_tags_journal_id", "journal_id"),
        Index("idx_journal_tags_tag", "tag"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    journal_id: Mapped[int] = mapped_column(ForeignKey("journals.id", ondelete="CASCADE"), nullable=False)
    tag: Mapped[str] = mapped_column(String(30), nullable=False)

    journal: Mapped["Journal"] = relationship(back_populates="tags")


class JournalStock(Base):
    __tablename__ = "journal_stocks"
    __table_args__ = (
        Index("idx_journal_stocks_journal_id", "journal_id"),
        Index("idx_journal_stocks_code", "stock_code"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    journal_id: Mapped[int] = mapped_column(ForeignKey("journals.id", ondelete="CASCADE"), nullable=False)
    stock_code: Mapped[str] = mapped_column(String(6), nullable=False)
    stock_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    journal: Mapped["Journal"] = relationship(back_populates="stocks")


class JournalTrade(Base):
    __tablename__ = "journal_trades"

    journal_id: Mapped[int] = mapped_column(
        ForeignKey("journals.id", ondelete="CASCADE"), primary_key=True
    )
    trade_id: Mapped[int] = mapped_column(ForeignKey("trades.id", ondelete="CASCADE"), primary_key=True)

    journal: Mapped["Journal"] = relationship(back_populates="trade_links")
    trade: Mapped["Trade"] = relationship(back_populates="journal_links")
