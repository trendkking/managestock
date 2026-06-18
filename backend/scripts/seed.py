"""
초기 시드 데이터 삽입 (프론트 Mock 데이터와 동일 구조)

실행:
  cd backend
  alembic upgrade head
  python -m scripts.seed
"""
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import select

from app.database import SessionLocal
from app.models import (
    Account,
    AccountSnapshot,
    Competition,
    CompetitionEntry,
    CompetitionSnapshot,
    Holding,
    Journal,
    JournalStock,
    JournalTag,
    JournalTrade,
    Trade,
    User,
)
from app.utils.auth_email import ADMIN_EMAIL
from app.utils.security import hash_password
from app.utils.time import utc_now


def ensure_admin_user(db) -> None:
    now = utc_now()
    admin = db.scalar(select(User).where(User.email == ADMIN_EMAIL))
    if admin:
        admin.nickname = "admin"
        admin.password_hash = hash_password("123")
        admin.role = "admin"
        admin.updated_at = now
        print("  - 관리자 계정 갱신: admin / 123")
    else:
        db.add(
            User(
                nickname="admin",
                email=ADMIN_EMAIL,
                password_hash=hash_password("123"),
                role="admin",
                show_nickname_public=True,
                created_at=now,
                updated_at=now,
            )
        )
        print("  - 관리자 계정 생성: admin / 123 (로그인 ID: admin)")


def seed() -> None:
    db = SessionLocal()
    try:
        ensure_admin_user(db)
        db.flush()

        existing = db.scalar(select(User).where(User.email == "test@gmail.com"))
        if existing:
            db.commit()
            print("시드 데이터가 이미 존재합니다. (test@gmail.com)")
            return

        # --- 사용자 ---
        test_user = User(
            nickname="테스트유저",
            email="test@gmail.com",
            password_hash=hash_password("123"),
            role="admin",
            show_nickname_public=True,
        )
        db.add(test_user)
        db.flush()

        # cash_balance: total_value(스냅샷) - Σ(quantity × current_price) 와 일치
        # account1: 11_250_000 - 5_580_000 = 5_670_000 / account2: 4_880_000 - 3_075_000 = 1_805_000

        # --- 계좌 ---
        account1 = Account(
            user_id=test_user.id,
            name="키움 주계좌",
            broker="키움증권",
            initial_capital=Decimal("10000000"),
            cash_balance=Decimal("5670000"),
            description="장기 투자용 메인 계좌",
        )
        account2 = Account(
            user_id=test_user.id,
            name="단타 연습 계좌",
            broker="KB증권",
            initial_capital=Decimal("5000000"),
            cash_balance=Decimal("1805000"),
            description="스윙·단타 연습",
        )
        db.add_all([account1, account2])
        db.flush()

        # --- 보유종목 ---
        holdings = [
            Holding(
                account_id=account1.id,
                stock_code="005930",
                stock_name="삼성전자",
                quantity=50,
                avg_price=Decimal("68000"),
                current_price=Decimal("72000"),
            ),
            Holding(
                account_id=account1.id,
                stock_code="000660",
                stock_name="SK하이닉스",
                quantity=10,
                avg_price=Decimal("185000"),
                current_price=Decimal("198000"),
            ),
            Holding(
                account_id=account2.id,
                stock_code="035420",
                stock_name="NAVER",
                quantity=15,
                avg_price=Decimal("210000"),
                current_price=Decimal("205000"),
            ),
        ]
        db.add_all(holdings)

        # --- 매매 ---
        trades = [
            Trade(
                account_id=account1.id,
                stock_code="005930",
                stock_name="삼성전자",
                trade_type="buy",
                quantity=50,
                price=Decimal("68000"),
                fee=Decimal("500"),
                tax=Decimal("0"),
                traded_at=datetime(2026, 5, 10, 10, 30),
                memo="반등 구간 매수",
            ),
            Trade(
                account_id=account1.id,
                stock_code="000660",
                stock_name="SK하이닉스",
                trade_type="buy",
                quantity=10,
                price=Decimal("185000"),
                fee=Decimal("300"),
                tax=Decimal("0"),
                traded_at=datetime(2026, 5, 15, 14, 0),
            ),
            Trade(
                account_id=account2.id,
                stock_code="035420",
                stock_name="NAVER",
                trade_type="buy",
                quantity=15,
                price=Decimal("210000"),
                fee=Decimal("400"),
                tax=Decimal("0"),
                traded_at=datetime(2026, 5, 20, 11, 0),
            ),
            Trade(
                account_id=account1.id,
                stock_code="005930",
                stock_name="삼성전자",
                trade_type="sell",
                quantity=10,
                price=Decimal("71500"),
                fee=Decimal("200"),
                tax=Decimal("150"),
                realized_pnl=Decimal("33000"),
                traded_at=datetime(2026, 5, 28, 9, 45),
                memo="일부 차익실현",
            ),
        ]
        db.add_all(trades)
        db.flush()

        # --- 계좌 스냅샷 ---
        snapshots_a1 = [
            ("2026-05-01", Decimal("0"), Decimal("10000000"), Decimal("10000000")),
            ("2026-05-08", Decimal("2.3"), Decimal("10230000"), Decimal("10000000")),
            ("2026-05-15", Decimal("5.1"), Decimal("10510000"), Decimal("10000000")),
            ("2026-05-22", Decimal("8.4"), Decimal("10840000"), Decimal("10000000")),
            ("2026-05-31", Decimal("12.5"), Decimal("11250000"), Decimal("5670000")),
        ]
        for snap_date, rate, total, cash in snapshots_a1:
            db.add(
                AccountSnapshot(
                    account_id=account1.id,
                    snapshot_date=date.fromisoformat(snap_date),
                    return_rate=rate,
                    total_value=total,
                    cash_balance=cash,
                )
            )

        snapshots_a2 = [
            ("2026-05-01", Decimal("0"), Decimal("5000000"), Decimal("5000000")),
            ("2026-05-15", Decimal("-1.2"), Decimal("4940000"), Decimal("3200000")),
            ("2026-05-31", Decimal("-2.4"), Decimal("4880000"), Decimal("1805000")),
        ]
        for snap_date, rate, total, cash in snapshots_a2:
            db.add(
                AccountSnapshot(
                    account_id=account2.id,
                    snapshot_date=date.fromisoformat(snap_date),
                    return_rate=rate,
                    total_value=total,
                    cash_balance=cash,
                )
            )

        # --- 매매일지 ---
        journal1 = Journal(
            user_id=test_user.id,
            account_id=account1.id,
            title="삼성전자 반등 구간 매수 근거",
            journal_date=date(2026, 5, 10),
            content="## 매수 근거\n- 20일 이평선 지지 확인\n- 반도체 업황 개선 기대\n\n## 진입 전략\n- 분할 매수 1차 50주",
            reflection="손절선 -5% 반드시 지킬 것",
            emotion="confident",
        )
        journal2 = Journal(
            user_id=test_user.id,
            account_id=account1.id,
            title="SK하이닉스 추가 매수",
            journal_date=date(2026, 5, 15),
            content="## 시장 상황\nHBM 수요 증가 뉴스 확인 후 진입",
            emotion="calm",
        )
        journal3 = Journal(
            user_id=test_user.id,
            account_id=account2.id,
            title="NAVER 단기 매매 복기",
            journal_date=date(2026, 5, 20),
            content="## 매수\n지지선 근처에서 진입했으나 반등이 약함",
            reflection="추세 확인 없이 진입 — 다음엔 60분봉 확인",
            emotion="anxious",
        )
        db.add_all([journal1, journal2, journal3])
        db.flush()

        db.add_all(
            [
                JournalTag(journal_id=journal1.id, tag="반도체"),
                JournalTag(journal_id=journal1.id, tag="장기"),
                JournalTag(journal_id=journal2.id, tag="HBM"),
                JournalTag(journal_id=journal2.id, tag="반도체"),
                JournalTag(journal_id=journal3.id, tag="단타"),
                JournalTag(journal_id=journal3.id, tag="IT"),
            ]
        )
        db.add_all(
            [
                JournalStock(journal_id=journal1.id, stock_code="005930", stock_name="삼성전자"),
                JournalStock(journal_id=journal2.id, stock_code="000660", stock_name="SK하이닉스"),
                JournalStock(journal_id=journal3.id, stock_code="035420", stock_name="NAVER"),
            ]
        )
        db.add_all(
            [
                JournalTrade(journal_id=journal1.id, trade_id=trades[0].id),
                JournalTrade(journal_id=journal2.id, trade_id=trades[1].id),
                JournalTrade(journal_id=journal3.id, trade_id=trades[2].id),
            ]
        )

        # --- 경연 대회 ---
        comp1 = Competition(
            name="2026 Q2 수익률 챌린지",
            description="2분기 평가금액(보유손익+매매손익)으로 겨루는 공식 대회",
            start_date=date(2026, 4, 1),
            end_date=date(2026, 6, 30),
            status="active",
            min_initial_capital=Decimal("5000000"),
            rules="보유 계좌는 여러 개까지 참가할 수 있으며, 평가금액은 계좌별 손익을 합산합니다.",
        )
        comp2 = Competition(
            name="2026 Q3 챌린지",
            description="3분기 수익률 경쟁 (7~9월)",
            start_date=date(2026, 7, 1),
            end_date=date(2026, 9, 30),
            status="upcoming",
            min_initial_capital=Decimal("3000000"),
        )
        comp3 = Competition(
            name="2026 Q1 챌린지",
            description="1분기 수익률 경쟁 (종료)",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 3, 31),
            status="ended",
        )
        db.add_all([comp1, comp2, comp3])
        db.flush()

        entry1 = CompetitionEntry(
            competition_id=comp1.id,
            user_id=test_user.id,
            account_id=account1.id,
            entry_value=Decimal("250000"),
            current_value=Decimal("363000"),
            return_rate=Decimal("113000"),
        )
        db.add(entry1)
        db.flush()

        db.add_all(
            [
                CompetitionSnapshot(
                    competition_id=comp1.id,
                    entry_id=entry1.id,
                    snapshot_date=date(2026, 4, 1),
                    return_rate=Decimal("0"),
                    total_value=Decimal("250000"),
                ),
                CompetitionSnapshot(
                    competition_id=comp1.id,
                    entry_id=entry1.id,
                    snapshot_date=date(2026, 5, 1),
                    return_rate=Decimal("50000"),
                    total_value=Decimal("300000"),
                ),
                CompetitionSnapshot(
                    competition_id=comp1.id,
                    entry_id=entry1.id,
                    snapshot_date=date(2026, 5, 31),
                    return_rate=Decimal("113000"),
                    total_value=Decimal("363000"),
                ),
            ]
        )

        db.commit()
        print("시드 데이터 삽입 완료")
        print("  - test@gmail.com / 123")
        print("  - admin / 123 (관리자)")
        print("  - 계좌 2건, 보유종목 3건, 매매 4건")
        print("  - 매매일지 3건, 대회 3건, 참가 1건")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
