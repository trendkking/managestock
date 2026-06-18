from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.dependencies import get_current_admin, get_db
from app.models import Account, Journal, User
from app.schemas.admin import (
    AdminJournalItem,
    AdminJournalListResponse,
    AdminStatsResponse,
    AdminUserItem,
    AdminUserListResponse,
)
from app.services.admin_service import build_admin_stats

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStatsResponse)
def admin_stats(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminStatsResponse:
    return build_admin_stats(db)


@router.get("/users", response_model=AdminUserListResponse)
def admin_list_users(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminUserListResponse:
    users = list(db.scalars(select(User).order_by(User.created_at.desc())).all())
    items: list[AdminUserItem] = []
    for user in users:
        accounts_count = db.scalar(select(func.count()).select_from(Account).where(Account.user_id == user.id)) or 0
        journals_count = db.scalar(select(func.count()).select_from(Journal).where(Journal.user_id == user.id)) or 0
        items.append(AdminUserItem.from_row(user, accounts_count, journals_count))
    return AdminUserListResponse(items=items, total=len(items))


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="본인 계정은 삭제할 수 없습니다")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다")
    db.delete(user)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/journals", response_model=AdminJournalListResponse)
def admin_list_journals(
    q: str | None = Query(None),
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminJournalListResponse:
    journals = list(
        db.scalars(
            select(Journal)
            .options(selectinload(Journal.user))
            .order_by(Journal.created_at.desc())
        ).all()
    )
    if q:
        q_lower = q.lower()
        journals = [
            j
            for j in journals
            if q_lower in j.title.lower() or q_lower in j.content.lower() or q_lower in j.user.nickname.lower()
        ]
    items = [
        AdminJournalItem.from_journal(j, j.user.nickname, j.user.email)
        for j in journals
    ]
    return AdminJournalListResponse(items=items, total=len(items))


@router.delete("/journals/{journal_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_journal(
    journal_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    journal = db.get(Journal, journal_id)
    if journal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="게시물을 찾을 수 없습니다")
    db.delete(journal)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
