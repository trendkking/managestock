from datetime import date

from pydantic import Field

from app.schemas.account import TradeResponse
from app.schemas.base import CamelModel, date_iso, dt_iso


class JournalWriteRequest(CamelModel):
    title: str = Field(min_length=1, max_length=100)
    journal_date: date
    account_id: int | None = None
    content: str
    reflection: str | None = None
    emotion: str | None = None
    tags: list[str] = Field(default_factory=list)
    stock_codes: list[str] = Field(default_factory=list)
    trade_ids: list[int] = Field(default_factory=list)


class JournalResponse(CamelModel):
    id: int
    user_id: int
    account_id: int | None = None
    title: str
    journal_date: str
    content: str
    reflection: str | None = None
    emotion: str | None = None
    tags: list[str]
    stock_codes: list[str]
    trade_ids: list[int]
    created_at: str
    updated_at: str

    @classmethod
    def from_orm(cls, journal) -> "JournalResponse":
        return cls(
            id=journal.id,
            user_id=journal.user_id,
            account_id=journal.account_id,
            title=journal.title,
            journal_date=date_iso(journal.journal_date),
            content=journal.content,
            reflection=journal.reflection,
            emotion=journal.emotion,
            tags=[t.tag for t in journal.tags],
            stock_codes=[s.stock_code for s in journal.stocks],
            trade_ids=[link.trade_id for link in journal.trade_links],
            created_at=dt_iso(journal.created_at),
            updated_at=dt_iso(journal.updated_at),
        )


class JournalDetailResponse(JournalResponse):
    linked_trades: list[TradeResponse] = Field(default_factory=list)


class JournalListResponse(CamelModel):
    items: list[JournalResponse]
    total: int
