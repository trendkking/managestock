from pydantic import Field

from app.schemas.base import CamelModel, dt_iso


class AdminUserItem(CamelModel):
    id: int
    nickname: str
    email: str
    role: str
    created_at: str
    accounts_count: int = 0
    journals_count: int = 0

    @classmethod
    def from_row(cls, user, accounts_count: int, journals_count: int) -> "AdminUserItem":
        return cls(
            id=user.id,
            nickname=user.nickname,
            email=user.email,
            role=user.role,
            created_at=dt_iso(user.created_at),
            accounts_count=accounts_count,
            journals_count=journals_count,
        )


class AdminUserListResponse(CamelModel):
    items: list[AdminUserItem]
    total: int


class AdminJournalItem(CamelModel):
    id: int
    user_id: int
    user_nickname: str
    user_email: str
    title: str
    journal_date: str
    content_preview: str
    created_at: str

    @classmethod
    def from_journal(cls, journal, nickname: str, email: str) -> "AdminJournalItem":
        preview = journal.content.replace("\n", " ").strip()
        if len(preview) > 120:
            preview = preview[:120] + "…"
        return cls(
            id=journal.id,
            user_id=journal.user_id,
            user_nickname=nickname,
            user_email=email,
            title=journal.title,
            journal_date=journal.journal_date.isoformat(),
            content_preview=preview,
            created_at=dt_iso(journal.created_at),
        )


class AdminJournalListResponse(CamelModel):
    items: list[AdminJournalItem]
    total: int


class SignupTrendPoint(CamelModel):
    date: str
    count: int


class AdminStatsResponse(CamelModel):
    total_users: int
    total_journals: int
    total_accounts: int
    total_trades: int
    total_competitions: int
    active_competitions: int
    new_users_today: int
    new_users_this_week: int
    new_users_this_month: int
    new_journals_today: int
    signup_trend: list[SignupTrendPoint] = Field(default_factory=list)
