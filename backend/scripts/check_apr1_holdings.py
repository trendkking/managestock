"""4/1 기준 보유종목 역산 (매매내역 기준)."""
from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select, create_engine
from sqlalchemy.orm import Session

from app.models import Account, AccountSnapshot, Competition, CompetitionEntry, Holding, Trade, User

CUTOFF = date(2026, 4, 1)


def main() -> None:
    engine = create_engine("sqlite:///managestock.db")
    with Session(engine) as db:
        user = db.scalar(select(User).where(User.email == "test@gmail.com"))
        comp = db.scalar(select(Competition).where(Competition.name.like("%Q2%")))
        entry = db.scalar(
            select(CompetitionEntry).where(
                CompetitionEntry.competition_id == comp.id,
                CompetitionEntry.user_id == user.id,
            )
        )
        account_id = entry.account_id
        account = db.get(Account, account_id)

        trades = list(
            db.scalars(
                select(Trade).where(Trade.account_id == account_id).order_by(Trade.traded_at)
            ).all()
        )

        snap = db.scalar(
            select(AccountSnapshot).where(
                AccountSnapshot.account_id == account_id,
                AccountSnapshot.snapshot_date == CUTOFF,
            )
        )
        holding_count = db.scalar(
            select(func.count()).select_from(Holding).where(Holding.account_id == account_id)
        )

        print("=== 계좌:", account.name, "(id=", account_id, ") ===")
        print("4/1 AccountSnapshot:", f"eval={snap.evaluation_amount}" if snap else "없음")
        print("현재 보유종목 수:", holding_count)
        print("전체 매매건수:", len(trades))

        positions: dict[str, dict] = defaultdict(
            lambda: {"qty": 0, "cost": Decimal("0"), "name": ""}
        )
        trades_through = [t for t in trades if t.traded_at.date() <= CUTOFF]
        print("4/1까지 매매건수:", len(trades_through))

        for t in trades_through:
            code = t.stock_code
            positions[code]["name"] = t.stock_name
            q = int(t.quantity)
            if t.trade_type == "buy":
                positions[code]["qty"] += q
                positions[code]["cost"] += Decimal(t.quantity) * t.price + (t.fee or 0)
            elif t.trade_type == "sell":
                pos = positions[code]
                if pos["qty"] > 0:
                    avg = pos["cost"] / pos["qty"]
                    pos["qty"] -= q
                    pos["cost"] -= avg * q
                else:
                    pos["qty"] -= q

        held = {c: p for c, p in positions.items() if p["qty"] > 0}
        print("4/1 기준 보유종목 수(매매역산):", len(held))
        print()

        if not held:
            print("=> 매매내역상 4/1 종료 시점 보유 수량 0")
        else:
            print("=== 4/1 보유 (매매역산) ===")
            for code, p in sorted(held.items(), key=lambda x: -float(x[1]["cost"])):
                avg = float(p["cost"] / p["qty"]) if p["qty"] else 0
                print(
                    f"  {p['name']} ({code}): {p['qty']}주, "
                    f"매입원가 {float(p['cost']):,.0f}, 평균단가 {avg:,.0f}"
                )

        print()
        print("=== 4/1 직전 매매 (최근 15건) ===")
        for t in trades_through[-15:]:
            print(
                t.traded_at.date(),
                t.trade_type,
                t.stock_name,
                "qty",
                t.quantity,
                "price",
                float(t.price),
            )


if __name__ == "__main__":
    main()
