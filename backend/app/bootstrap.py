"""앱 기동 시 필수 시드 (관리자 계정 등)."""

from __future__ import annotations

import logging

from sqlalchemy import select

from app.database import SessionLocal
from app.models import User
from app.utils.auth_email import ADMIN_EMAIL
from app.utils.security import hash_password
from app.utils.time import utc_now

logger = logging.getLogger(__name__)

ADMIN_PASSWORD = "123"


def ensure_admin_user() -> None:
    """관리자 계정(admin / 123)이 항상 로그인 가능하도록 생성·갱신."""
    db = SessionLocal()
    try:
        now = utc_now()
        password_hash = hash_password(ADMIN_PASSWORD)
        admin = db.scalar(select(User).where(User.email == ADMIN_EMAIL))

        if admin:
            admin.password_hash = password_hash
            admin.role = "admin"
            admin.updated_at = now
            # nickname 충돌 시에만 유지
            taken = db.scalar(
                select(User).where(User.nickname == "admin", User.id != admin.id)
            )
            if not taken:
                admin.nickname = "admin"
        else:
            taken = db.scalar(select(User).where(User.nickname == "admin"))
            nickname = "admin" if not taken else "bullslong_admin"
            db.add(
                User(
                    nickname=nickname,
                    email=ADMIN_EMAIL,
                    password_hash=password_hash,
                    role="admin",
                    show_nickname_public=True,
                    created_at=now,
                    updated_at=now,
                )
            )
        db.commit()
        logger.info("Admin account ensured (login id: admin / password: 123)")
    except Exception:
        db.rollback()
        logger.exception("Failed to ensure admin user")
    finally:
        db.close()
