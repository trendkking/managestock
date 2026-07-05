from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models import JournalRuleMemo, User
from app.schemas.journal_rule_memo import JournalRuleMemoResponse, JournalRuleMemoWriteRequest
from app.utils.time import utc_now

router = APIRouter(prefix="/journal-rule-memo", tags=["journal-rule-memo"])


def _get_or_create_memo(db: Session, user_id: int) -> JournalRuleMemo:
    memo = db.scalar(select(JournalRuleMemo).where(JournalRuleMemo.user_id == user_id))
    if memo is not None:
        return memo
    now = utc_now()
    memo = JournalRuleMemo(user_id=user_id, content="", updated_at=now)
    db.add(memo)
    db.commit()
    db.refresh(memo)
    return memo


@router.get("", response_model=JournalRuleMemoResponse)
def get_journal_rule_memo(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JournalRuleMemoResponse:
    memo = _get_or_create_memo(db, user.id)
    return JournalRuleMemoResponse.from_orm(memo)


@router.put("", response_model=JournalRuleMemoResponse)
def save_journal_rule_memo(
    body: JournalRuleMemoWriteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JournalRuleMemoResponse:
    memo = _get_or_create_memo(db, user.id)
    memo.content = body.content.strip()
    memo.updated_at = utc_now()
    db.commit()
    db.refresh(memo)
    return JournalRuleMemoResponse.from_orm(memo)
