from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Account,
    AccountSnapshot,
    Competition,
    CompetitionEntry,
    CompetitionSnapshot,
    Holding,
    Trade,
)
from app.services.calculations import account_evaluation_amount_at_date, account_stats
from app.services.competition_service import compute_competition_scores, load_account_trades
from app.utils.time import utc_now


def upsert_account_snapshot(db: Session, account: Account, holdings: list[Holding], snap_date: date | None = None) -> None:
    snap_date = snap_date or date.today()
    stats = account_stats(account, holdings)
    trades = load_account_trades(db, account.id)
    evaluation_amount = account_evaluation_amount_at_date(account, holdings, trades, snap_date)
    existing = db.scalar(
        select(AccountSnapshot).where(
            AccountSnapshot.account_id == account.id,
            AccountSnapshot.snapshot_date == snap_date,
        )
    )
    if existing:
        existing.total_value = stats["current_value"]
        existing.return_rate = stats["return_rate"]
        existing.cash_balance = account.cash_balance
        existing.evaluation_amount = evaluation_amount
    else:
        db.add(
            AccountSnapshot(
                account_id=account.id,
                snapshot_date=snap_date,
                total_value=stats["current_value"],
                return_rate=stats["return_rate"],
                cash_balance=account.cash_balance,
                evaluation_amount=evaluation_amount,
                created_at=utc_now(),
            )
        )


def refresh_competition_entries_for_account(db: Session, account: Account, holdings: list[Holding]) -> None:
    trades = load_account_trades(db, account.id)
    entries = db.scalars(
        select(CompetitionEntry).where(CompetitionEntry.account_id == account.id)
    ).all()
    today = date.today()
    for entry in entries:
        comp = db.get(Competition, entry.competition_id)
        if comp is None:
            continue
        baseline, current_eval, delta, deposits, withdrawals = compute_competition_scores(
            db, account, holdings, trades, comp, today=today
        )
        entry.entry_value = baseline
        entry.current_value = current_eval
        entry.return_rate = delta
        entry.period_deposits = deposits
        entry.period_withdrawals = withdrawals
        entry.updated_at = utc_now()
        snap = db.scalar(
            select(CompetitionSnapshot).where(
                CompetitionSnapshot.entry_id == entry.id,
                CompetitionSnapshot.snapshot_date == today,
            )
        )
        if snap:
            snap.return_rate = entry.return_rate
            snap.total_value = current_eval
        else:
            db.add(
                CompetitionSnapshot(
                    competition_id=entry.competition_id,
                    entry_id=entry.id,
                    snapshot_date=today,
                    return_rate=entry.return_rate,
                    total_value=current_eval,
                )
            )
