from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.dependencies import get_current_user, get_db
from app.models import Account, Journal, Trade, User
from app.schemas.account import TradeResponse
from app.schemas.journal import (
    JournalDetailResponse,
    JournalListResponse,
    JournalResponse,
    JournalWriteRequest,
)
from app.services.journal_service import create_journal, update_journal

router = APIRouter(prefix="/journals", tags=["journals"])


@router.get("", response_model=JournalListResponse)
def list_journals(
    q: str | None = Query(None),
    account_id: int | None = Query(None, alias="accountId"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JournalListResponse:
    stmt = (
        select(Journal)
        .where(Journal.user_id == user.id)
        .options(
            selectinload(Journal.tags),
            selectinload(Journal.stocks),
            selectinload(Journal.trade_links),
        )
        .order_by(Journal.journal_date.desc(), Journal.id.desc())
    )
    if account_id is not None:
        stmt = stmt.where(Journal.account_id == account_id)
    journals = list(db.scalars(stmt).all())
    if q:
        q_lower = q.lower()
        filtered = []
        for j in journals:
            if q_lower in j.title.lower() or q_lower in j.content.lower():
                filtered.append(j)
                continue
            if any(q_lower in t.tag.lower() for t in j.tags):
                filtered.append(j)
        journals = filtered
    items = [JournalResponse.from_orm(j) for j in journals]
    return JournalListResponse(items=items, total=len(items))


@router.post("", response_model=JournalResponse, status_code=status.HTTP_201_CREATED)
def post_journal(
    body: JournalWriteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JournalResponse:
    journal = create_journal(db, user.id, body)
    db.commit()
    return JournalResponse.from_orm(journal)


@router.get("/{journal_id}", response_model=JournalDetailResponse)
def get_journal(
    journal_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JournalDetailResponse:
    journal = db.scalar(
        select(Journal)
        .where(Journal.id == journal_id, Journal.user_id == user.id)
        .options(
            selectinload(Journal.tags),
            selectinload(Journal.stocks),
            selectinload(Journal.trade_links),
        )
    )
    if journal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="일지를 찾을 수 없습니다")

    trade_ids = [link.trade_id for link in journal.trade_links]
    linked: list[Trade] = []
    if trade_ids:
        linked = list(
            db.scalars(
                select(Trade)
                .join(Account, Trade.account_id == Account.id)
                .where(Trade.id.in_(trade_ids), Account.user_id == user.id)
            ).all()
        )
    base = JournalResponse.from_orm(journal)
    return JournalDetailResponse(
        **base.model_dump(),
        linked_trades=[TradeResponse.from_orm(t) for t in linked],
    )


@router.patch("/{journal_id}", response_model=JournalResponse)
def patch_journal(
    journal_id: int,
    body: JournalWriteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JournalResponse:
    journal = update_journal(db, journal_id, user.id, body)
    db.commit()
    return JournalResponse.from_orm(journal)


@router.delete("/{journal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_journal(
    journal_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    journal = db.scalar(select(Journal).where(Journal.id == journal_id, Journal.user_id == user.id))
    if journal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="일지를 찾을 수 없습니다")
    db.delete(journal)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
