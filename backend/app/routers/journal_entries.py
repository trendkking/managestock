from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models import JournalEntry, User
from app.schemas.journal_entry import (
    JournalEntryListResponse,
    JournalEntryResponse,
    JournalEntryWriteRequest,
)
from app.utils.time import utc_now

router = APIRouter(prefix="/journal-entries", tags=["journal-entries"])


@router.get("", response_model=JournalEntryListResponse)
def list_journal_entries(
    q: str | None = Query(None),
    stock_code: str | None = Query(None, alias="stockCode"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JournalEntryListResponse:
    stmt = (
        select(JournalEntry)
        .where(JournalEntry.user_id == user.id)
        .order_by(JournalEntry.journal_date.desc(), JournalEntry.id.desc())
    )
    if stock_code:
        stmt = stmt.where(JournalEntry.stock_code == stock_code.strip())
    entries = list(db.scalars(stmt).all())
    if q:
        q_lower = q.lower()
        entries = [
            e
            for e in entries
            if q_lower in e.stock_name.lower()
            or q_lower in e.stock_code.lower()
            or q_lower in e.reason.lower()
        ]
    items = [JournalEntryResponse.from_orm(e) for e in entries]
    return JournalEntryListResponse(items=items, total=len(items))


@router.post("", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
def create_journal_entry(
    body: JournalEntryWriteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JournalEntryResponse:
    now = utc_now()
    entry = JournalEntry(
        user_id=user.id,
        journal_date=body.journal_date,
        stock_code=body.stock_code.strip(),
        stock_name=body.stock_name.strip(),
        side=body.side,
        reason=body.reason.strip(),
        created_at=now,
        updated_at=now,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return JournalEntryResponse.from_orm(entry)


@router.patch("/{entry_id}", response_model=JournalEntryResponse)
def update_journal_entry(
    entry_id: int,
    body: JournalEntryWriteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JournalEntryResponse:
    entry = db.scalar(
        select(JournalEntry).where(JournalEntry.id == entry_id, JournalEntry.user_id == user.id)
    )
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="일지를 찾을 수 없습니다")
    entry.journal_date = body.journal_date
    entry.stock_code = body.stock_code.strip()
    entry.stock_name = body.stock_name.strip()
    entry.side = body.side
    entry.reason = body.reason.strip()
    entry.updated_at = utc_now()
    db.commit()
    db.refresh(entry)
    return JournalEntryResponse.from_orm(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_journal_entry(
    entry_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    entry = db.scalar(
        select(JournalEntry).where(JournalEntry.id == entry_id, JournalEntry.user_id == user.id)
    )
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="일지를 찾을 수 없습니다")
    db.delete(entry)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
