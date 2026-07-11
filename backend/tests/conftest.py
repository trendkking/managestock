from collections.abc import Generator
from datetime import date, datetime
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.dependencies import get_db
from app.main import app
from app.models import Competition, User
from app.utils.auth_email import ADMIN_EMAIL, ADMIN_PASSWORD
from app.utils.security import hash_password
from app.utils.time import utc_now


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    now = utc_now()
    session.add(
        User(
            nickname="admin",
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            role="admin",
            show_nickname_public=True,
            created_at=now,
            updated_at=now,
        )
    )
    session.add(
        User(
            nickname="테스트유저",
            email="test@gmail.com",
            password_hash=hash_password("123"),
            role="user",
            show_nickname_public=True,
            created_at=now,
            updated_at=now,
        )
    )
    session.add(
        Competition(
            name="API 테스트 대회",
            description="통합 테스트용",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status="active",
            min_initial_capital=Decimal("1000000"),
            created_at=now,
            updated_at=now,
        )
    )
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": "test@gmail.com", "password": "123"})
    assert response.status_code == 200, response.text
    token = response.json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}
