from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Account, Competition, CompetitionEntry, Holding, Journal, Trade
from app.schemas.account import TradeResponse
from app.schemas.base import to_float
from app.schemas.dashboard import (
    AccountSummaryItem,
    ActiveCompetitionItem,
    DashboardSummaryResponse,
)
from app.schemas.journal import JournalResponse
from app.services.competition_service import aggregate_leaderboard_rows
from app.services.calculations import account_stats


def build_dashboard_summary(db: Session, user_id: int) -> DashboardSummaryResponse:
    accounts = db.scalars(select(Account).where(Account.user_id == user_id)).all()
    total_value = 0.0
    total_initial = 0.0
    account_summaries: list[AccountSummaryItem] = []

    for account in accounts:
        holdings = list(db.scalars(select(Holding).where(Holding.account_id == account.id)).all())
        stats = account_stats(account, holdings)
        cv = to_float(stats["current_value"])
        rr = to_float(stats["return_rate"])
        total_value += cv
        total_initial += to_float(account.initial_capital)
        account_summaries.append(AccountSummaryItem(id=account.id, name=account.name, return_rate=rr))

    total_profit_loss = total_value - total_initial
    total_return_rate = (total_profit_loss / total_initial * 100) if total_initial > 0 else 0.0

    recent_trades_orm = db.scalars(
        select(Trade)
        .join(Account, Trade.account_id == Account.id)
        .where(Account.user_id == user_id)
        .order_by(Trade.traded_at.desc())
        .limit(5)
    ).all()
    recent_trades = [TradeResponse.from_orm(t) for t in recent_trades_orm]

    recent_journals_orm = db.scalars(
        select(Journal)
        .where(Journal.user_id == user_id)
        .options(
            selectinload(Journal.tags),
            selectinload(Journal.stocks),
            selectinload(Journal.trade_links),
        )
        .order_by(Journal.journal_date.desc(), Journal.id.desc())
        .limit(3)
    ).all()
    recent_journals = [JournalResponse.from_orm(j) for j in recent_journals_orm]

    active_comps = db.scalars(select(Competition).where(Competition.status == "active")).all()
    active_competitions: list[ActiveCompetitionItem] = []
    for comp in active_comps:
        user_entries = list(
            db.scalars(
                select(CompetitionEntry).where(
                    CompetitionEntry.competition_id == comp.id,
                    CompetitionEntry.user_id == user_id,
                )
            ).all()
        )
        if not user_entries:
            continue
        all_entries = list(
            db.scalars(
                select(CompetitionEntry).where(CompetitionEntry.competition_id == comp.id)
            ).all()
        )
        aggregated = aggregate_leaderboard_rows(db, all_entries, current_user_id=user_id)
        my_row = next((row for row in aggregated if row["user_id"] == user_id), None)
        my_rank = next((i + 1 for i, row in enumerate(aggregated) if row["user_id"] == user_id), 0)
        active_competitions.append(
            ActiveCompetitionItem(
                id=comp.id,
                name=comp.name,
                my_rank=my_rank,
                score_delta=to_float(my_row["score_delta"]) if my_row else 0.0,
            )
        )

    return DashboardSummaryResponse(
        total_value=round(total_value, 2),
        total_profit_loss=round(total_profit_loss, 2),
        total_return_rate=round(total_return_rate, 2),
        accounts_count=len(accounts),
        account_summaries=account_summaries,
        recent_trades=recent_trades,
        active_competitions=active_competitions,
        recent_journals=recent_journals,
    )
