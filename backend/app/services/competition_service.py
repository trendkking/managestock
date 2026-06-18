from datetime import date

from decimal import Decimal

from sqlalchemy import select

from sqlalchemy.orm import Session

from app.models import Account, Competition, CompetitionEntry, Holding, Trade, User

from app.services.competition_evaluation import (
    competition_baseline_evaluation,
    competition_current_evaluation,
    competition_score,
)


def load_account_trades(db: Session, account_id: int) -> list[Trade]:
    return list(db.scalars(select(Trade).where(Trade.account_id == account_id)).all())


def competition_period_end(comp: Competition, today: date | None = None) -> date:
    today = today or date.today()
    return min(today, comp.end_date)


def compute_competition_scores(
    db: Session,
    account: Account,
    holdings: list[Holding],
    trades: list[Trade],
    comp: Competition,
    *,
    today: date | None = None,
) -> tuple[Decimal, Decimal, Decimal, Decimal, Decimal]:
    """(baseline, current_total, score, unrealized_A, realized_B) — DB 필드 period_deposits/withdrawals에 A/B 저장."""
    _ = db
    today = today or date.today()
    period_end = competition_period_end(comp, today)

    baseline = competition_baseline_evaluation()
    current_total, unrealized, realized = competition_current_evaluation(
        account, holdings, trades, comp.start_date, period_end
    )
    score = competition_score(current_total, baseline)

    return (
        baseline,
        current_total,
        score,
        unrealized,
        realized,
    )


def refresh_competition_entries(db: Session, competition_id: int) -> None:
    """대회 참가자 점수를 시가 마킹·기간 실현손익 기준으로 재계산."""
    comp = db.get(Competition, competition_id)
    if comp is None:
        return

    entries = list(
        db.scalars(
            select(CompetitionEntry).where(CompetitionEntry.competition_id == competition_id)
        ).all()
    )

    for entry in entries:
        account = db.get(Account, entry.account_id)
        if account is None:
            continue

        holdings = list(
            db.scalars(select(Holding).where(Holding.account_id == account.id)).all()
        )
        trades = load_account_trades(db, account.id)

        baseline, current_total, score, unrealized, realized = compute_competition_scores(
            db, account, holdings, trades, comp
        )

        entry.entry_value = baseline
        entry.current_value = current_total
        entry.return_rate = score
        entry.period_deposits = unrealized
        entry.period_withdrawals = realized

    db.flush()


def aggregate_leaderboard_rows(
    db: Session,
    entries: list[CompetitionEntry],
    *,
    current_user_id: int,
) -> list[dict]:
    """계좌별 entry를 사용자 단위로 합산해 리더보드 행을 만든다."""
    grouped: dict[int, list[CompetitionEntry]] = {}
    for entry in entries:
        grouped.setdefault(entry.user_id, []).append(entry)

    rows: list[dict] = []
    for user_id, user_entries in grouped.items():
        entry_user = db.get(User, user_id)
        nickname = entry_user.nickname if entry_user and entry_user.show_nickname_public else "익명"
        account_names: list[str] = []
        score = Decimal("0")
        unrealized = Decimal("0")
        realized = Decimal("0")
        entry_value = Decimal("0")
        current_value = Decimal("0")
        for entry in user_entries:
            account = db.get(Account, entry.account_id)
            if account:
                account_names.append(account.name)
            score += entry.return_rate or Decimal("0")
            unrealized += entry.period_deposits or Decimal("0")
            realized += entry.period_withdrawals or Decimal("0")
            entry_value += entry.entry_value or Decimal("0")
            current_value += entry.current_value or Decimal("0")
        rows.append(
            {
                "user_id": user_id,
                "nickname": nickname,
                "account_name": ", ".join(account_names),
                "score_delta": score,
                "start_total_value": entry_value,
                "current_total_value": current_value,
                "unrealized_pnl": unrealized,
                "realized_pnl": realized,
                "is_me": user_id == current_user_id,
            }
        )

    rows.sort(key=lambda row: row["score_delta"], reverse=True)
    return rows
