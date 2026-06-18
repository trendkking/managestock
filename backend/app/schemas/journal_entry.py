from datetime import date
from typing import Literal

from pydantic import Field

from app.schemas.base import CamelModel, date_iso, dt_iso

JournalEntrySide = Literal["buy", "sell"]


class JournalEntryWriteRequest(CamelModel):
    journal_date: date
    stock_code: str = Field(min_length=1, max_length=12)
    stock_name: str = Field(min_length=1, max_length=100)
    side: JournalEntrySide = "buy"
    reason: str = Field(min_length=1)


class JournalEntryResponse(CamelModel):
    id: int
    user_id: int
    journal_date: str
    stock_code: str
    stock_name: str
    side: JournalEntrySide
    reason: str
    created_at: str
    updated_at: str

    @classmethod
    def from_orm(cls, entry) -> "JournalEntryResponse":
        return cls(
            id=entry.id,
            user_id=entry.user_id,
            journal_date=date_iso(entry.journal_date),
            stock_code=entry.stock_code,
            stock_name=entry.stock_name,
            side=entry.side,
            reason=entry.reason,
            created_at=dt_iso(entry.created_at),
            updated_at=dt_iso(entry.updated_at),
        )


class JournalEntryListResponse(CamelModel):
    items: list[JournalEntryResponse]
    total: int
