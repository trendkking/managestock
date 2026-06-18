from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.utils.time import utc_now
from app.models import (
    Account,
    Competition,
    CompetitionEntry,
    CompetitionSnapshot,
    Holding,
    Trade,
    User,
)
from app.schemas.base import date_iso, to_float
from app.schemas.competition import (
    ChartPointResponse,
    ChartSeriesResponse,
    CompetitionChartResponse,
    CompetitionListResponse,
    CompetitionResponse,
    JoinCompetitionRequest,
    LeaderboardEntryResponse,
    LeaderboardResponse,
    MyCompetitionEntryListResponse,
    MyCompetitionEntryResponse,
)
from app.services.competition_service import (
    aggregate_leaderboard_rows,
    compute_competition_scores,
    load_account_trades,
    refresh_competition_entries,
)
router = APIRouter(prefix="/competitions", tags=["competitions"])


def _competition_response(db: Session, comp: Competition, user_id: int) -> CompetitionResponse:
    participant_count = (
        db.scalar(
            select(func.count(func.distinct(CompetitionEntry.user_id)))
            .select_from(CompetitionEntry)
            .where(CompetitionEntry.competition_id == comp.id)
        )
        or 0
    )
    is_joined = (
        db.scalar(
            select(CompetitionEntry).where(
                CompetitionEntry.competition_id == comp.id,
                CompetitionEntry.user_id == user_id,
            )
        )
        is not None
    )
    return CompetitionResponse.from_orm(comp, participant_count=participant_count, is_joined=is_joined)


@router.get("", response_model=CompetitionListResponse)
def list_competitions(
    status_filter: str | None = Query(None, alias="status"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CompetitionListResponse:
    stmt = select(Competition).order_by(Competition.start_date.desc())
    if status_filter:
        stmt = stmt.where(Competition.status == status_filter)
    competitions = list(db.scalars(stmt).all())
    items = [_competition_response(db, c, user.id) for c in competitions]
    return CompetitionListResponse(items=items, total=len(items))


@router.get("/entries/me", response_model=MyCompetitionEntryListResponse)
def list_my_competition_entries(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MyCompetitionEntryListResponse:
    entries = list(
        db.scalars(select(CompetitionEntry).where(CompetitionEntry.user_id == user.id)).all()
    )
    comp_ids = {e.competition_id for e in entries}
    for comp_id in comp_ids:
        refresh_competition_entries(db, comp_id)
    if comp_ids:
        db.commit()
        entries = list(
            db.scalars(select(CompetitionEntry).where(CompetitionEntry.user_id == user.id)).all()
        )
    items: list[MyCompetitionEntryResponse] = []
    for entry in entries:
        comp = db.get(Competition, entry.competition_id)
        account = db.get(Account, entry.account_id)
        if comp is None or account is None:
            continue
        items.append(MyCompetitionEntryResponse.from_row(entry, comp, account))
    return MyCompetitionEntryListResponse(items=items, total=len(items))


@router.get("/{competition_id}", response_model=CompetitionResponse)
def get_competition(
    competition_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CompetitionResponse:
    comp = db.get(Competition, competition_id)
    if comp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="대회를 찾을 수 없습니다")
    return _competition_response(db, comp, user.id)


@router.post("/{competition_id}/join", response_model=CompetitionResponse, status_code=status.HTTP_201_CREATED)
def join_competition(
    competition_id: int,
    body: JoinCompetitionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CompetitionResponse:
    comp = db.get(Competition, competition_id)
    if comp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="대회를 찾을 수 없습니다")
    if comp.status not in ("upcoming", "active"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="참가할 수 없는 대회입니다")

    account = db.scalar(
        select(Account).where(Account.id == body.account_id, Account.user_id == user.id)
    )
    if account is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="본인 계좌만 참가할 수 있습니다")

    existing_user = db.scalar(
        select(CompetitionEntry).where(
            CompetitionEntry.competition_id == competition_id,
            CompetitionEntry.user_id == user.id,
            CompetitionEntry.account_id == body.account_id,
        )
    )
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 이 계좌로 참가 중입니다")

    existing_account = db.scalar(
        select(CompetitionEntry).where(
            CompetitionEntry.competition_id == competition_id,
            CompetitionEntry.account_id == body.account_id,
        )
    )
    if existing_account:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이 계좌는 이미 참가 중입니다")

    if comp.max_participants:
        user_already_joined = db.scalar(
            select(CompetitionEntry).where(
                CompetitionEntry.competition_id == competition_id,
                CompetitionEntry.user_id == user.id,
            )
        )
        if user_already_joined is None:
            participant_count = (
                db.scalar(
                    select(func.count(func.distinct(CompetitionEntry.user_id)))
                    .select_from(CompetitionEntry)
                    .where(CompetitionEntry.competition_id == comp.id)
                )
                or 0
            )
            if participant_count >= comp.max_participants:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="참가 인원이 마감되었습니다")

    holdings = list(db.scalars(select(Holding).where(Holding.account_id == account.id)).all())
    trades = load_account_trades(db, account.id)
    baseline, current_eval, evaluation_delta, unrealized, realized = compute_competition_scores(
        db, account, holdings, trades, comp
    )

    now = utc_now()
    entry = CompetitionEntry(
        competition_id=competition_id,
        user_id=user.id,
        account_id=account.id,
        entry_value=baseline,
        current_value=current_eval,
        return_rate=evaluation_delta,
        period_deposits=unrealized,
        period_withdrawals=realized,
        joined_at=now,
        updated_at=now,
    )
    db.add(entry)
    db.flush()
    db.add(
        CompetitionSnapshot(
            competition_id=competition_id,
            entry_id=entry.id,
            snapshot_date=date.today(),
            return_rate=evaluation_delta,
            total_value=current_eval,
        )
    )
    db.commit()
    return _competition_response(db, comp, user.id)


@router.delete("/{competition_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_competition(
    competition_id: int,
    account_id: int | None = Query(None, alias="accountId"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comp = db.get(Competition, competition_id)
    if comp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="대회를 찾을 수 없습니다")

    stmt = select(CompetitionEntry).where(
        CompetitionEntry.competition_id == competition_id,
        CompetitionEntry.user_id == user.id,
    )
    if account_id is not None:
        stmt = stmt.where(CompetitionEntry.account_id == account_id)
    entries = list(db.scalars(stmt).all())
    if not entries:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="참가 중인 대회가 아닙니다")

    for entry in entries:
        db.delete(entry)
    db.commit()


@router.get("/{competition_id}/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(
    competition_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LeaderboardResponse:
    comp = db.get(Competition, competition_id)
    if comp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="대회를 찾을 수 없습니다")

    refresh_competition_entries(db, competition_id)
    db.commit()

    entries = list(
        db.scalars(
            select(CompetitionEntry).where(CompetitionEntry.competition_id == competition_id)
        ).all()
    )
    aggregated = aggregate_leaderboard_rows(db, entries, current_user_id=user.id)
    items: list[LeaderboardEntryResponse] = []
    my_rank: int | None = None
    for rank, row in enumerate(aggregated, start=1):
        if row["is_me"]:
            my_rank = rank
        items.append(
            LeaderboardEntryResponse(
                rank=rank,
                user_id=row["user_id"],
                nickname=row["nickname"],
                account_name=row["account_name"],
                score_delta=to_float(row["score_delta"]),
                start_total_value=to_float(row["start_total_value"]),
                current_total_value=to_float(row["current_total_value"]),
                unrealized_pnl=to_float(row["unrealized_pnl"]),
                realized_pnl=to_float(row["realized_pnl"]),
                period_deposits=0,
                period_withdrawals=0,
                net_cash_flow=0,
                is_me=row["is_me"],
            )
        )
    return LeaderboardResponse(my_rank=my_rank, items=items, total=len(items))


@router.get("/{competition_id}/chart", response_model=CompetitionChartResponse)
def get_chart(
    competition_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CompetitionChartResponse:
    comp = db.get(Competition, competition_id)
    if comp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="대회를 찾을 수 없습니다")

    refresh_competition_entries(db, competition_id)
    db.commit()

    top_entries = list(
        db.scalars(
            select(CompetitionEntry)
            .where(CompetitionEntry.competition_id == competition_id)
            .order_by(CompetitionEntry.return_rate.desc())
            .limit(5)
        ).all()
    )
    series_list: list[ChartSeriesResponse] = []
    for entry in top_entries:
        entry_user = db.get(User, entry.user_id)
        nickname = entry_user.nickname if entry_user and entry_user.show_nickname_public else "익명"
        snaps = list(
            db.scalars(
                select(CompetitionSnapshot)
                .where(CompetitionSnapshot.entry_id == entry.id)
                .order_by(CompetitionSnapshot.snapshot_date)
            ).all()
        )
        if not snaps:
            snaps_data = [
                ChartPointResponse(
                    date=comp.start_date.strftime("%m-%d"),
                    score_delta=0.0,
                )
            ]
        else:
            snaps_data = [
                ChartPointResponse(
                    date=s.snapshot_date.strftime("%m-%d"),
                    score_delta=to_float(s.return_rate),
                )
                for s in snaps
            ]
        series_list.append(ChartSeriesResponse(nickname=nickname, data=snaps_data))
    return CompetitionChartResponse(series=series_list)
