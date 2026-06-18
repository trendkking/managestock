from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.models import Account, Journal, JournalStock, JournalTag, JournalTrade, Trade
from app.utils.time import utc_now
from app.schemas.journal import JournalWriteRequest


def _load_journal(db: Session, journal_id: int, user_id: int) -> Journal:
    journal = db.scalar(
        select(Journal)
        .where(Journal.id == journal_id, Journal.user_id == user_id)
        .options(
            selectinload(Journal.tags),
            selectinload(Journal.stocks),
            selectinload(Journal.trade_links),
        )
    )
    if journal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="일지를 찾을 수 없습니다")
    return journal


def _validate_account(db: Session, user_id: int, account_id: int | None) -> None:
    if account_id is None:
        return
    account = db.scalar(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    if account is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 계좌입니다")


def _validate_trades(db: Session, user_id: int, trade_ids: list[int]) -> None:
    if not trade_ids:
        return
    trades = db.scalars(
        select(Trade)
        .join(Account, Trade.account_id == Account.id)
        .where(Trade.id.in_(trade_ids), Account.user_id == user_id)
    ).all()
    if len(trades) != len(set(trade_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 매매 ID가 포함되어 있습니다")


def _sync_relations(db: Session, journal: Journal, data: JournalWriteRequest, user_id: int) -> None:
    db.execute(delete(JournalTag).where(JournalTag.journal_id == journal.id))
    db.execute(delete(JournalStock).where(JournalStock.journal_id == journal.id))
    db.execute(delete(JournalTrade).where(JournalTrade.journal_id == journal.id))
    for tag in data.tags[:10]:
        tag = tag.strip()
        if tag:
            db.add(JournalTag(journal_id=journal.id, tag=tag[:30]))
    for code in data.stock_codes:
        code = code.strip()
        if code:
            db.add(JournalStock(journal_id=journal.id, stock_code=code[:6], stock_name=None))
    _validate_trades(db, user_id, data.trade_ids)
    for trade_id in data.trade_ids:
        db.add(JournalTrade(journal_id=journal.id, trade_id=trade_id))


def create_journal(db: Session, user_id: int, data: JournalWriteRequest) -> Journal:
    _validate_account(db, user_id, data.account_id)
    now = utc_now()
    journal = Journal(
        user_id=user_id,
        account_id=data.account_id,
        title=data.title,
        journal_date=data.journal_date,
        content=data.content,
        reflection=data.reflection,
        emotion=data.emotion,
        created_at=now,
        updated_at=now,
    )
    db.add(journal)
    db.flush()
    _sync_relations(db, journal, data, user_id)
    db.refresh(journal)
    return _load_journal(db, journal.id, user_id)


def update_journal(db: Session, journal_id: int, user_id: int, data: JournalWriteRequest) -> Journal:
    journal = _load_journal(db, journal_id, user_id)
    _validate_account(db, user_id, data.account_id)
    journal.title = data.title
    journal.journal_date = data.journal_date
    journal.account_id = data.account_id
    journal.content = data.content
    journal.reflection = data.reflection
    journal.emotion = data.emotion
    journal.updated_at = utc_now()
    _sync_relations(db, journal, data, user_id)
    db.flush()
    return _load_journal(db, journal.id, user_id)
