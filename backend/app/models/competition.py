from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Competition(Base):
    __tablename__ = "competitions"
    __table_args__ = (
        Index("idx_competitions_status", "status"),
        Index("idx_competitions_dates", "start_date", "end_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="upcoming")
    min_initial_capital: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    max_participants: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rules: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    entries: Mapped[list["CompetitionEntry"]] = relationship(
        back_populates="competition", cascade="all, delete-orphan"
    )
    snapshots: Mapped[list["CompetitionSnapshot"]] = relationship(
        back_populates="competition", cascade="all, delete-orphan"
    )


class CompetitionEntry(Base):
    __tablename__ = "competition_entries"
    __table_args__ = (
        UniqueConstraint("competition_id", "account_id", name="uq_entries_competition_account"),
        Index("idx_entries_competition_return", "competition_id", "return_rate"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    competition_id: Mapped[int] = mapped_column(
        ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False)
    entry_value: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    current_value: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    return_rate: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False, default=0)
    period_deposits: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    period_withdrawals: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    final_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    final_return_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    competition: Mapped["Competition"] = relationship(back_populates="entries")
    user: Mapped["User"] = relationship(back_populates="competition_entries")
    account: Mapped["Account"] = relationship(back_populates="competition_entries")
    snapshots: Mapped[list["CompetitionSnapshot"]] = relationship(
        back_populates="entry", cascade="all, delete-orphan"
    )


class CompetitionSnapshot(Base):
    __tablename__ = "competition_snapshots"
    __table_args__ = (
        UniqueConstraint("entry_id", "snapshot_date", name="uq_comp_snapshots_entry_date"),
        Index("idx_comp_snap_comp_date", "competition_id", "snapshot_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    competition_id: Mapped[int] = mapped_column(
        ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    entry_id: Mapped[int] = mapped_column(
        ForeignKey("competition_entries.id", ondelete="CASCADE"), nullable=False
    )
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    return_rate: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    total_value: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)

    competition: Mapped["Competition"] = relationship(back_populates="snapshots")
    entry: Mapped["CompetitionEntry"] = relationship(back_populates="snapshots")
