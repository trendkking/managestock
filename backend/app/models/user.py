from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nickname: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user")
    show_nickname_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    accounts: Mapped[list["Account"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    journals: Mapped[list["Journal"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    journal_entries: Mapped[list["JournalEntry"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    journal_rule_memo: Mapped["JournalRuleMemo | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    competition_entries: Mapped[list["CompetitionEntry"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
