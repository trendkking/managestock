from app.schemas.account import TradeResponse
from app.schemas.base import CamelModel
from app.schemas.journal import JournalResponse


class AccountSummaryItem(CamelModel):
    id: int
    name: str
    return_rate: float


class ActiveCompetitionItem(CamelModel):
    id: int
    name: str
    my_rank: int
    score_delta: float


class DashboardSummaryResponse(CamelModel):
    total_value: float
    total_profit_loss: float
    total_return_rate: float
    accounts_count: int
    account_summaries: list[AccountSummaryItem]
    recent_trades: list[TradeResponse]
    active_competitions: list[ActiveCompetitionItem]
    recent_journals: list[JournalResponse]
