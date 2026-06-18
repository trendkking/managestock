"""
DB 마이그레이션 + 시드 일괄 실행

  python -m scripts.db_setup
"""
import subprocess
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    print("=== Alembic upgrade head ===")
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_ROOT,
        check=False,
    )
    if result.returncode != 0:
        sys.exit(result.returncode)

    print("\n=== Seed data ===")
    from scripts.seed import seed

    seed()
    print("\nDB 설정 완료.")


if __name__ == "__main__":
    main()
