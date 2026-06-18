from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.brokers.base import BrokerError
from app.brokers.catalog import get_catalog_entry
from app.dependencies import get_current_user, get_db
from app.utils.time import utc_now
from app.models import (
    Account,
    AccountSnapshot,
    CompetitionEntry,
    Holding,
    Trade,
    User,
)
from app.schemas.account import (
    AccountCreateRequest,
    AccountDetailResponse,
    AccountListResponse,
    AccountStatsResponse,
    AccountUpdateRequest,
    HoldingResponse,
    HoldingUpsertRequest,
    PerformancePointResponse,
    TradeCreateRequest,
    TradeImportRequest,
    TradeImportResponse,
    TradeResponse,
)
from app.services.account_sync_service import _parse_iso_date, import_domestic_trades_range
from app.schemas.broker import AccountConnectRequest
from app.schemas.base import date_iso, to_float
from app.services.account_sync_service import connect_kis_account, sync_account_from_broker
from app.services.snapshot_service import upsert_account_snapshot
from app.services.trade_service import execute_trade, upsert_holding

router = APIRouter(prefix="/accounts", tags=["accounts"])


def _get_user_account(db: Session, user_id: int, account_id: int) -> Account:
    account = db.scalar(
        select(Account)
        .options(selectinload(Account.credential))
        .where(Account.id == account_id, Account.user_id == user_id)
    )
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="계좌를 찾을 수 없습니다")
    return account


@router.get("", response_model=AccountListResponse)
def list_accounts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccountListResponse:
    accounts = db.scalars(
        select(Account)
        .options(selectinload(Account.credential))
        .where(Account.user_id == user.id)
        .order_by(Account.id)
    ).all()
    items = []
    for account in accounts:
        holdings = list(db.scalars(select(Holding).where(Holding.account_id == account.id)).all())
        items.append(AccountStatsResponse.from_account(account, holdings))
    return AccountListResponse(items=items, total=len(items))


@router.post("", response_model=AccountStatsResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    body: AccountCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccountStatsResponse:
    now = utc_now()
    account = Account(
        user_id=user.id,
        name=body.name,
        broker=body.broker,
        broker_code="manual",
        connection_mode="manual",
        sync_status="manual",
        initial_capital=body.initial_capital,
        cash_balance=body.initial_capital,
        description=body.description,
        created_at=now,
        updated_at=now,
    )
    db.add(account)
    db.flush()
    upsert_account_snapshot(db, account, [], date.today())
    db.commit()
    db.refresh(account)
    return AccountStatsResponse.from_account(account, [])


@router.post("/connect", response_model=AccountStatsResponse, status_code=status.HTTP_201_CREATED)
def connect_account(
    body: AccountConnectRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccountStatsResponse:
    catalog = get_catalog_entry(body.broker_code)
    if catalog is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="지원하지 않는 증권사입니다.")
    if not catalog.api_connect_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{catalog.name} API 연동은 아직 준비 중입니다.",
        )
    if body.sync_us and not catalog.supported_markets.us:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{catalog.name}는 미국 주식 Open API를 제공하지 않습니다.",
        )
    if body.sync_us:
        allowed = set(catalog.supported_markets.us)
        invalid = [code for code in body.sync_us if code not in allowed]
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="선택한 미국 거래소는 이 증권사에서 지원하지 않습니다.",
            )
    try:
        account = connect_kis_account(
            db,
            user_id=user.id,
            name=body.name,
            account_number=body.account_number,
            account_product_code=body.account_product_code,
            app_key=body.app_key,
            app_secret=body.app_secret,
            description=body.description,
            sync_domestic=body.sync_domestic,
            sync_us=body.sync_us,
        )
        db.commit()
        db.refresh(account)
        holdings = list(db.scalars(select(Holding).where(Holding.account_id == account.id)).all())
        return AccountStatsResponse.from_account(account, holdings)
    except BrokerError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/{account_id}/sync", response_model=AccountStatsResponse)
def sync_account(
    account_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccountStatsResponse:
    account = _get_user_account(db, user.id, account_id)
    try:
        account = sync_account_from_broker(db, account)
        db.commit()
        db.refresh(account)
        holdings = list(db.scalars(select(Holding).where(Holding.account_id == account.id)).all())
        return AccountStatsResponse.from_account(account, holdings)
    except BrokerError as exc:
        account.sync_status = "error"
        account.last_sync_error = str(exc)
        account.updated_at = utc_now()
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{account_id}", response_model=AccountDetailResponse)
def get_account(
    account_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccountDetailResponse:
    account = _get_user_account(db, user.id, account_id)
    holdings = list(db.scalars(select(Holding).where(Holding.account_id == account.id)).all())
    trades = list(
        db.scalars(select(Trade).where(Trade.account_id == account.id).order_by(Trade.traded_at.desc())).all()
    )
    snapshots = list(
        db.scalars(
            select(AccountSnapshot)
            .where(AccountSnapshot.account_id == account.id)
            .order_by(AccountSnapshot.snapshot_date)
        ).all()
    )
    from app.schemas.account import HoldingDetailResponse, HoldingsPortfolioSummary, _fx_for_account

    fx = _fx_for_account(account)
    base = AccountStatsResponse.from_account(account, holdings)
    return AccountDetailResponse(
        **base.model_dump(),
        holdings=[HoldingDetailResponse.from_orm(h, fx=fx) for h in holdings],
        holdings_summary=HoldingsPortfolioSummary.from_account(account, holdings, fx=fx),
        trades=[TradeResponse.from_orm(t) for t in trades],
        performance=[
            PerformancePointResponse(
                date=date_iso(s.snapshot_date),
                return_rate=to_float(s.return_rate),
                total_value=to_float(s.total_value),
            )
            for s in snapshots
        ],
    )


@router.patch("/{account_id}", response_model=AccountStatsResponse)
def update_account(
    account_id: int,
    body: AccountUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccountStatsResponse:
    account = _get_user_account(db, user.id, account_id)
    if body.name is not None:
        account.name = body.name
    if body.broker is not None:
        account.broker = body.broker
    if body.description is not None:
        account.description = body.description
    account.updated_at = utc_now()
    db.commit()
    holdings = list(db.scalars(select(Holding).where(Holding.account_id == account.id)).all())
    return AccountStatsResponse.from_account(account, holdings)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = _get_user_account(db, user.id, account_id)
    entry = db.scalar(select(CompetitionEntry).where(CompetitionEntry.account_id == account.id))
    if entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="대회에 참가 중인 계좌는 삭제할 수 없습니다",
        )
    db.delete(account)
    db.commit()


@router.post("/{account_id}/holdings", response_model=HoldingResponse)
def post_holding(
    account_id: int,
    body: HoldingUpsertRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HoldingResponse:
    account = _get_user_account(db, user.id, account_id)
    if account.connection_mode == "api":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API 연동 계좌는 「동기화」로 잔고·보유종목을 갱신하세요",
        )
    holding = upsert_holding(
        db,
        account,
        stock_code=body.stock_code,
        stock_name=body.stock_name,
        quantity=body.quantity,
        avg_price=body.avg_price,
        current_price=body.current_price,
    )
    db.commit()
    db.refresh(holding)
    return HoldingResponse.from_orm(holding)


@router.post("/{account_id}/trades/import", response_model=TradeImportResponse)
def import_trades(
    account_id: int,
    body: TradeImportRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TradeImportResponse:
    account = _get_user_account(db, user.id, account_id)
    try:
        from_date = _parse_iso_date(body.from_date)
        to_date = _parse_iso_date(body.to_date)
        trades, imported = import_domestic_trades_range(db, account, from_date=from_date, to_date=to_date)
        db.commit()
        return TradeImportResponse(
            from_date=from_date.isoformat(),
            to_date=to_date.isoformat(),
            imported=imported,
            trades=[TradeResponse.from_orm(t) for t in trades],
        )
    except BrokerError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/{account_id}/trades", response_model=TradeResponse, status_code=status.HTTP_201_CREATED)
def post_trade(
    account_id: int,
    body: TradeCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TradeResponse:
    account = _get_user_account(db, user.id, account_id)
    if account.connection_mode == "api":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API 연동 계좌는 증권사 체결 내역을 사용합니다. 동기화 후 확인하세요",
        )
    trade = execute_trade(
        db,
        account,
        stock_code=body.stock_code,
        stock_name=body.stock_name,
        trade_type=body.trade_type,
        quantity=body.quantity,
        price=body.price,
        fee=body.fee,
        tax=body.tax,
        traded_at=body.traded_at,
        memo=body.memo,
    )
    db.commit()
    db.refresh(trade)
    return TradeResponse.from_orm(trade)
