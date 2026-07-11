"""앱 기동 시 필수 시드 (관리자 계정 등)."""

from sqlalchemy import select

from app.database import SessionLocal
from app.models import User
from app.utils.auth_email import ADMIN_EMAIL
from app.utils.security import hash_password
from app.utils.time import utc_now


def ensure_admin_user() -> None:
    """관리자 계정(admin / 123)이 항상 로그인 가능하도록 생성·갱신."""
    db = SessionLocal()
    try:
        now = utc_now()
        admin = db.scalar(select(User).where(User.email == ADMIN_EMAIL))
        if admin:
            admin.nickname = "admin"
            admin.password_hash = hash_password("123")
            admin.role = "admin"
            admin.updated_at = now
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
        db.commit()
    finally:
        db.close()
