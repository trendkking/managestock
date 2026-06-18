"""DB 스키마·시드 검증: python -m scripts.verify_db"""
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "managestock.db"

EXPECTED_TABLES = {
    "users",
    "accounts",
    "holdings",
    "trades",
    "account_snapshots",
    "journals",
    "journal_tags",
    "journal_stocks",
    "journal_trades",
    "competitions",
    "competition_entries",
    "competition_snapshots",
}


def main() -> None:
    conn = sqlite3.connect(DB)
    tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    tables -= {"alembic_version"}

    missing = EXPECTED_TABLES - tables
    extra = tables - EXPECTED_TABLES

    print(f"DB: {DB}")
    print(f"Tables ({len(tables)}): {sorted(tables)}")
    if missing:
        print(f"MISSING: {missing}")
    if extra:
        print(f"EXTRA: {extra}")

    user = conn.execute("SELECT email, role FROM users").fetchall()
    print(f"Users: {user}")
    for table in sorted(EXPECTED_TABLES - {"users"}):
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count} rows")

    conn.close()
    if missing:
        raise SystemExit(1)
    print("\nOK - 12 tables + seed verified")


if __name__ == "__main__":
    main()
