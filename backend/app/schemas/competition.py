from decimal import Decimal

from app.schemas.base import CamelModel, date_iso, to_float


class CompetitionResponse(CamelModel):
    id: int
    name: str
    description: str | None = None
    start_date: str
    end_date: str
    status: str
    min_initial_capital: float | None = None
    max_participants: int | None = None
    rules: str | None = None
    participant_count: int
    is_joined: bool = False

    @classmethod
    def from_orm(cls, comp, *, participant_count: int, is_joined: bool) -> "CompetitionResponse":
        return cls(
            id=comp.id,
            name=comp.name,
            description=comp.description,
            start_date=date_iso(comp.start_date),
            end_date=date_iso(comp.end_date),
            status=comp.status,
            min_initial_capital=to_float(comp.min_initial_capital)
            if comp.min_initial_capital is not None
            else None,
            max_participants=comp.max_participants,
            rules=comp.rules,
            participant_count=participant_count,
            is_joined=is_joined,
        )


class CompetitionListResponse(CamelModel):
    items: list[CompetitionResponse]
    total: int


class MyCompetitionEntryResponse(CamelModel):
    competition_id: int
    competition_name: str
    competition_status: str
    account_id: int
    account_name: str
    score_delta: float = 0
    start_total_value: float = 0
    current_total_value: float = 0
    unrealized_pnl: float = 0
    realized_pnl: float = 0
    period_deposits: float = 0
    period_withdrawals: float = 0
    net_cash_flow: float = 0

    @classmethod
    def from_row(cls, entry, comp, account) -> "MyCompetitionEntryResponse":
        unrealized = to_float(getattr(entry, "period_deposits", 0) or 0)
        realized = to_float(getattr(entry, "period_withdrawals", 0) or 0)
        return cls(
            competition_id=comp.id,
            competition_name=comp.name,
            competition_status=comp.status,
            account_id=account.id,
            account_name=account.name,
            score_delta=to_float(entry.return_rate),
            start_total_value=to_float(entry.entry_value),
            current_total_value=to_float(entry.current_value),
            unrealized_pnl=unrealized,
            realized_pnl=realized,
            period_deposits=0,
            period_withdrawals=0,
            net_cash_flow=0,
        )


class MyCompetitionEntryListResponse(CamelModel):
    items: list[MyCompetitionEntryResponse]
    total: int


class JoinCompetitionRequest(CamelModel):
    account_id: int


class LeaderboardEntryResponse(CamelModel):
    rank: int
    user_id: int
    nickname: str
    account_name: str
    score_delta: float
    start_total_value: float
    current_total_value: float
    unrealized_pnl: float = 0
    realized_pnl: float = 0
    period_deposits: float = 0
    period_withdrawals: float = 0
    net_cash_flow: float = 0
    is_me: bool = False


class LeaderboardResponse(CamelModel):
    my_rank: int | None = None
    items: list[LeaderboardEntryResponse]
    total: int


class ChartPointResponse(CamelModel):
    date: str
    score_delta: float


class ChartSeriesResponse(CamelModel):
    nickname: str
    data: list[ChartPointResponse]


class CompetitionChartResponse(CamelModel):
    series: list[ChartSeriesResponse]
