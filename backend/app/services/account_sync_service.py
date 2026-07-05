from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.brokers.base import BrokerError
from app.brokers.factory import get_broker_adapter, is_api_broker
from app.brokers.kis import KIS_SYNC_MEMO_PREFIX, KISBrokerAdapter, KISCredentials, US_EXCHANGE_CODES
from app.brokers.kiwoom import KiwoomBrokerAdapter, KiwoomCredentials
from app.brokers.sync_config import extra_json, parse_extra, parse_sync_config, sync_memo_prefix
from app.models import Account, AccountCredential, Holding, Trade
from app.services.calculations import account_stats, holdings_unrealized_pnl_krw
from app.services.snapshot_service import upsert_account_snapshot
from app.utils.crypto import decrypt_secret, encrypt_secret
from app.utils.time import kst_date_end_exclusive_utc_naive, kst_date_start_utc_naive, utc_naive_to_kst_date, utc_now


def build_kis_credentials(credential: AccountCredential, account: Account) -> KISCredentials:
    return KISBrokerAdapter.build_credentials(credential, account)


def _sync_memo_prefix_for(account: Account) -> str:
    return sync_memo_prefix(account.broker_code)


def _trade_memo_matches_sync(trade: Trade, account: Account) -> bool:
    if not trade.memo:
        return False
    prefix = _sync_memo_prefix_for(account)
    if trade.memo.startswith(prefix):
        return True
    return account.broker_code == "kis" and trade.memo.startswith(KIS_SYNC_MEMO_PREFIX)


def _normalize_connect_account(
    broker_code: str,
    account_number: str,
    account_product_code: str,
) -> tuple[str, str]:
    digits = "".join(ch for ch in account_number if ch.isdigit())
    product = "".join(ch for ch in account_product_code if ch.isdigit()) or "01"
    product = product.zfill(2)[:2]

    if broker_code == "kis":
        if len(digits) == 10:
            return digits[:8], digits[8:]
        if len(digits) == 8:
            return digits, product
        raise BrokerError("계좌번호는 8자리 또는 10자리(종합+상품코드) 숫자여야 합니다.")

    if broker_code == "kiwoom":
        if len(digits) in (8, 9, 10):
            return digits, product
        raise BrokerError("키움 계좌번호는 8~10자리 숫자여야 합니다.")

    raise BrokerError(f"지원하지 않는 증권사 코드입니다: {broker_code}")


def _ensure_access_token(db: Session, account: Account, adapter, creds) -> str:
    credential = account.credential
    if credential is None:
        raise BrokerError("API 연동 정보가 없습니다.")

    now = utc_now()
    expires_at = credential.token_expires_at
    if expires_at is not None and getattr(expires_at, "tzinfo", None) is not None:
        expires_at = expires_at.replace(tzinfo=None)
    if credential.access_token_encrypted and expires_at and expires_at > now:
        return decrypt_secret(credential.access_token_encrypted)

    if account.broker_code == "kis" and isinstance(adapter, KISBrokerAdapter):
        extra = parse_extra(credential.extra_json)
        prefer_virtual = extra.get("kisUseVirtual")
        token, expires_in, use_virtual = KISBrokerAdapter.issue_token_with_environment(
            creds,
            prefer_virtual=prefer_virtual,
        )
        if prefer_virtual is None or prefer_virtual != use_virtual:
            sync_domestic, sync_us = parse_sync_config(credential.extra_json)
            credential.extra_json = extra_json(
                str(extra.get("accountProductCode", "01")),
                sync_domestic=sync_domestic,
                sync_us=sync_us,
                usd_krw_rate=extra.get("usdKrwRate"),
                stats_baseline_v=int(extra.get("statsBaselineV", 2)),
                kis_use_virtual=use_virtual,
            )
    else:
        token, expires_in = adapter.issue_token(creds)
    credential.access_token_encrypted = encrypt_secret(token)
    credential.token_expires_at = adapter.token_expires_at(expires_in)
    db.flush()
    return token


def _holding_key(market_type: str, stock_code: str) -> tuple[str, str]:
    return market_type, stock_code


def _copy_broker_holding_fields(holding: Holding, item) -> None:
    holding.orderable_quantity = item.orderable_quantity
    holding.purchase_amount = item.purchase_amount
    holding.evaluation_amount = item.evaluation_amount
    holding.profit_loss = item.profit_loss
    holding.return_rate = item.return_rate
    holding.currency = item.currency


def _parse_iso_date(value: str) -> date:
    return datetime.strptime(value.strip()[:10], "%Y-%m-%d").date()


def _trade_in_date_range(traded_at: datetime, from_date: date, to_date: date) -> bool:
    d = utc_naive_to_kst_date(traded_at)
    return from_date <= d <= to_date


def _dedupe_sync_trades_by_memo(db: Session, account: Account) -> int:
    prefix = _sync_memo_prefix_for(account)
    trades = list(
        db.scalars(
            select(Trade).where(Trade.account_id == account.id).order_by(Trade.id.asc())
        ).all()
    )
    seen_memos: set[str] = set()
    removed = 0
    for trade in trades:
        if not _trade_memo_matches_sync(trade, account):
            continue
        if trade.memo in seen_memos:
            db.delete(trade)
            removed += 1
        else:
            seen_memos.add(trade.memo)
    if removed:
        db.flush()
    return removed


def _apply_domestic_trades_import(
    db: Session,
    account: Account,
    broker_trades: list,
    *,
    from_date: date,
    to_date: date,
) -> int:
    prefix = _sync_memo_prefix_for(account)
    incoming_by_id: dict[str, object] = {}
    for item in broker_trades:
        if not _trade_in_date_range(item.traded_at, from_date, to_date):
            continue
        incoming_by_id[item.external_id] = item

    existing = list(db.scalars(select(Trade).where(Trade.account_id == account.id)).all())
    incoming_ext_ids = set(incoming_by_id.keys())
    legacy_prefix = KIS_SYNC_MEMO_PREFIX if account.broker_code == "kis" else prefix
    for trade in existing:
        if not _trade_memo_matches_sync(trade, account):
            continue
        ext = trade.memo[len(legacy_prefix) :] if trade.memo.startswith(legacy_prefix) else trade.memo[len(prefix) :]
        if ext in incoming_ext_ids or _trade_in_date_range(trade.traded_at, from_date, to_date):
            db.delete(trade)
    db.flush()
    _dedupe_sync_trades_by_memo(db, account)

    now = utc_now()
    added = 0
    for item in incoming_by_id.values():
        db.add(
            Trade(
                account_id=account.id,
                stock_code=item.stock_code,
                stock_name=item.stock_name,
                trade_type=item.trade_type,
                quantity=item.quantity,
                price=item.price,
                fee=item.fee,
                tax=item.tax,
                realized_pnl=item.realized_pnl,
                traded_at=item.traded_at,
                memo=f"{prefix}{item.external_id}",
                created_at=now,
            )
        )
        added += 1
    db.flush()
    return added


def import_domestic_trades_range(
    db: Session,
    account: Account,
    *,
    from_date: date,
    to_date: date,
) -> tuple[list[Trade], int]:
    if account.connection_mode != "api" or not is_api_broker(account.broker_code):
        raise BrokerError("API 연동 계좌만 지원합니다.")
    if account.credential is None:
        raise BrokerError("API 연동 정보가 없습니다.")
    if from_date > to_date:
        raise BrokerError("시작일이 종료일보다 늦을 수 없습니다.")
    if (to_date - from_date).days > 365:
        raise BrokerError("한 번에 조회 가능한 기간은 최대 365일(약 1년)입니다.")

    sync_domestic, _ = parse_sync_config(account.credential.extra_json)
    if not sync_domestic:
        raise BrokerError("국내 주식 동기화가 설정되어 있지 않습니다.")

    adapter = get_broker_adapter(account.broker_code, extra_json_raw=account.credential.extra_json)
    creds = adapter.build_credentials(account.credential, account)
    token = _ensure_access_token(db, account, adapter, creds)
    broker_trades = adapter.fetch_domestic_trades(
        creds,
        access_token=token,
        start_date=from_date.isoformat(),
        end_date=to_date.isoformat(),
    )
    imported = _apply_domestic_trades_import(
        db,
        account,
        broker_trades,
        from_date=from_date,
        to_date=to_date,
    )
    trades = list(
        db.scalars(
            select(Trade)
            .where(
                Trade.account_id == account.id,
                Trade.traded_at >= kst_date_start_utc_naive(from_date),
                Trade.traded_at < kst_date_end_exclusive_utc_naive(to_date),
            )
            .order_by(Trade.traded_at.asc())
        ).all()
    )
    return trades, imported


def _sync_domestic_trades_from_broker(
    db: Session,
    account: Account,
    adapter,
    creds,
    *,
    access_token: str,
) -> int:
    to_date = utc_now().date()
    from_date = to_date - timedelta(days=92)
    broker_trades = adapter.fetch_domestic_trades(
        creds,
        access_token=access_token,
        start_date=from_date.isoformat(),
        end_date=to_date.isoformat(),
    )
    return _apply_domestic_trades_import(
        db,
        account,
        broker_trades,
        from_date=from_date,
        to_date=to_date,
    )


def _apply_balance_to_account(
    db: Session,
    account: Account,
    balance,
    *,
    sync_domestic: bool,
    sync_us: list[str],
) -> None:
    existing = {
        _holding_key(h.market_type, h.stock_code): h
        for h in db.scalars(select(Holding).where(Holding.account_id == account.id)).all()
    }
    seen: set[tuple[str, str]] = set()

    for item in balance.holdings:
        key = _holding_key(item.market_type, item.stock_code)
        seen.add(key)
        holding = existing.get(key)
        if holding:
            holding.stock_name = item.stock_name
            holding.quantity = item.quantity
            holding.avg_price = item.avg_price
            holding.current_price = item.current_price
            holding.exchange_code = item.exchange_code
            _copy_broker_holding_fields(holding, item)
            holding.updated_at = utc_now()
        else:
            db.add(
                Holding(
                    account_id=account.id,
                    market_type=item.market_type,
                    exchange_code=item.exchange_code,
                    stock_code=item.stock_code,
                    stock_name=item.stock_name,
                    quantity=item.quantity,
                    orderable_quantity=item.orderable_quantity,
                    avg_price=item.avg_price,
                    current_price=item.current_price,
                    purchase_amount=item.purchase_amount,
                    evaluation_amount=item.evaluation_amount,
                    profit_loss=item.profit_loss,
                    return_rate=item.return_rate,
                    currency=item.currency,
                    updated_at=utc_now(),
                )
            )

    allowed_markets = set()
    if sync_domestic:
        allowed_markets.add("domestic")
    if sync_us:
        allowed_markets.add("us")

    for key, holding in existing.items():
        if key in seen:
            continue
        if holding.market_type in allowed_markets:
            db.delete(holding)

    account.cash_balance = balance.cash_balance
    if account.initial_capital <= 0:
        account.initial_capital = balance.total_evaluation
    account.sync_status = "connected"
    account.last_synced_at = utc_now()
    account.last_sync_error = None
    account.updated_at = utc_now()

    if account.credential is not None and getattr(balance, "usd_krw_rate", None):
        rate = balance.usd_krw_rate
        if rate and rate > 0:
            extra = parse_extra(account.credential.extra_json)
            account.credential.extra_json = extra_json(
                str(extra.get("accountProductCode", "01")),
                sync_domestic=sync_domestic,
                sync_us=sync_us,
                usd_krw_rate=rate,
                stats_baseline_v=int(extra.get("statsBaselineV", 2)),
            )


def _repair_account_baseline_if_needed(
    account: Account,
    holdings: list[Holding],
    *,
    sync_domestic: bool,
    sync_us: list[str],
    usd_krw_rate: Decimal | None,
) -> None:
    if account.connection_mode != "api" or account.credential is None:
        return
    extra = parse_extra(account.credential.extra_json)
    if int(extra.get("statsBaselineV", 1)) >= 2:
        return
    rate = usd_krw_rate or extra.get("usdKrwRate")
    stats = account_stats(account, holdings)
    unrealized = holdings_unrealized_pnl_krw(holdings, rate)
    cost_basis = stats["current_value"] - unrealized
    if cost_basis > 0:
        account.initial_capital = cost_basis
    elif account.initial_capital <= 0:
        account.initial_capital = stats["current_value"]
    account.credential.extra_json = extra_json(
        str(extra.get("accountProductCode", "01")),
        sync_domestic=sync_domestic,
        sync_us=sync_us,
        usd_krw_rate=rate,
        stats_baseline_v=2,
    )


def sync_account_from_broker(db: Session, account: Account) -> Account:
    if account.connection_mode != "api" or not is_api_broker(account.broker_code):
        raise BrokerError("API 연동 계좌가 아닙니다.")
    if account.credential is None:
        raise BrokerError("API 연동 정보가 없습니다.")

    adapter = get_broker_adapter(account.broker_code, extra_json_raw=account.credential.extra_json)
    sync_domestic, sync_us = parse_sync_config(account.credential.extra_json)
    if not sync_domestic and not sync_us:
        raise BrokerError("동기화할 시장(국내 주식 또는 미국 주식)이 설정되어 있지 않습니다.")

    creds = adapter.build_credentials(account.credential, account)
    token = _ensure_access_token(db, account, adapter, creds)
    balance = adapter.fetch_combined_balance(
        creds,
        access_token=token,
        sync_domestic=sync_domestic,
        sync_us=sync_us,
    )

    _apply_balance_to_account(
        db,
        account,
        balance,
        sync_domestic=sync_domestic,
        sync_us=sync_us,
    )

    holdings = list(db.scalars(select(Holding).where(Holding.account_id == account.id)).all())
    _repair_account_baseline_if_needed(
        account,
        holdings,
        sync_domestic=sync_domestic,
        sync_us=sync_us,
        usd_krw_rate=balance.usd_krw_rate,
    )
    upsert_account_snapshot(db, account, holdings, date.today())

    db.flush()
    return account


def connect_broker_account(
    db: Session,
    *,
    broker_code: str,
    user_id: int,
    name: str,
    account_number: str,
    account_product_code: str,
    app_key: str,
    app_secret: str,
    description: str | None,
    sync_domestic: bool = True,
    sync_us: list[str] | None = None,
) -> Account:
    cano, product_code = _normalize_connect_account(broker_code, account_number, account_product_code)
    us_codes = [code for code in (sync_us or []) if code in US_EXCHANGE_CODES]
    if not sync_domestic and not us_codes:
        raise BrokerError("국내 주식 또는 미국 주식 중 최소 하나를 선택해주세요.")

    kiwoom_use_virtual: bool | None = None
    kis_use_virtual: bool | None = None
    if broker_code == "kis":
        creds = KISCredentials(
            app_key=app_key.strip(),
            app_secret=app_secret.strip(),
            account_number=cano,
            account_product_code=product_code,
        )
        token, expires_in, kis_use_virtual = KISBrokerAdapter.issue_token_with_environment(creds)
        adapter = KISBrokerAdapter(use_virtual=kis_use_virtual)
    elif broker_code == "kiwoom":
        creds = KiwoomCredentials(
            app_key=app_key.strip(),
            app_secret=app_secret.strip(),
            account_number=cano,
        )
        token, expires_in, kiwoom_use_virtual = KiwoomBrokerAdapter.issue_token_with_environment(creds)
        adapter = KiwoomBrokerAdapter(use_virtual=kiwoom_use_virtual)
    else:
        raise BrokerError(f"지원하지 않는 증권사 코드입니다: {broker_code}")

    balance = adapter.fetch_combined_balance(
        creds,
        access_token=token,
        sync_domestic=sync_domestic,
        sync_us=us_codes,
    )

    now = utc_now()
    account = Account(
        user_id=user_id,
        name=name.strip(),
        broker=adapter.display_name,
        broker_code=broker_code,
        account_number=cano,
        connection_mode="api",
        sync_status="connected",
        initial_capital=balance.total_evaluation,
        cash_balance=balance.cash_balance,
        description=description,
        last_synced_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(account)
    db.flush()

    credential = AccountCredential(
        account_id=account.id,
        app_key_encrypted=encrypt_secret(app_key.strip()),
        app_secret_encrypted=encrypt_secret(app_secret.strip()),
        access_token_encrypted=encrypt_secret(token),
        token_expires_at=adapter.token_expires_at(expires_in),
        extra_json=extra_json(
            product_code,
            sync_domestic=sync_domestic,
            sync_us=us_codes,
            usd_krw_rate=balance.usd_krw_rate,
            stats_baseline_v=2,
            kiwoom_use_virtual=kiwoom_use_virtual,
            kis_use_virtual=kis_use_virtual,
        ),
    )
    db.add(credential)
    db.flush()

    _apply_balance_to_account(
        db,
        account,
        balance,
        sync_domestic=sync_domestic,
        sync_us=us_codes,
    )

    holdings = list(db.scalars(select(Holding).where(Holding.account_id == account.id)).all())
    _repair_account_baseline_if_needed(
        account,
        holdings,
        sync_domestic=sync_domestic,
        sync_us=us_codes,
        usd_krw_rate=balance.usd_krw_rate,
    )
    upsert_account_snapshot(db, account, holdings, date.today())
    db.flush()
    return account


def connect_kis_account(
    db: Session,
    *,
    user_id: int,
    name: str,
    account_number: str,
    account_product_code: str,
    app_key: str,
    app_secret: str,
    description: str | None,
    sync_domestic: bool = True,
    sync_us: list[str] | None = None,
) -> Account:
    return connect_broker_account(
        db,
        broker_code="kis",
        user_id=user_id,
        name=name,
        account_number=account_number,
        account_product_code=account_product_code,
        app_key=app_key,
        app_secret=app_secret,
        description=description,
        sync_domestic=sync_domestic,
        sync_us=sync_us,
    )
