from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models import User
from app.schemas.auth import LoginRequest, ProfileUpdateRequest, RegisterRequest, TokenResponse, UserResponse
from app.utils.auth_email import ADMIN_EMAIL, normalize_login_identifier
from app.utils.jwt import create_access_token
from app.utils.security import hash_password, verify_password
from app.utils.time import utc_now

router = APIRouter(prefix="/auth", tags=["auth"])

SEED_EMAIL = "test@gmail.com"


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> UserResponse:
    if body.email.lower() in (SEED_EMAIL, ADMIN_EMAIL, "admin"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 이메일입니다")
    if db.scalar(select(User).where(User.email == body.email.lower())):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 이메일입니다")
    if db.scalar(select(User).where(User.nickname == body.nickname)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 닉네임입니다")

    now = utc_now()
    user = User(
        nickname=body.nickname,
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        role="user",
        show_nickname_public=True,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.from_orm_user(user)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    email = normalize_login_identifier(body.email)
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="이메일 또는 비밀번호가 올바르지 않습니다")
    token = create_access_token(user_id=user.id, role=user.role)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.from_orm_user(user)


@router.patch("/me", response_model=UserResponse)
def update_me(
    body: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    if body.nickname is not None and body.nickname != user.nickname:
        existing = db.scalar(select(User).where(User.nickname == body.nickname, User.id != user.id))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 닉네임입니다")
        user.nickname = body.nickname
    if body.show_nickname_public is not None:
        user.show_nickname_public = body.show_nickname_public
    user.updated_at = utc_now()
    db.commit()
    db.refresh(user)
    return UserResponse.from_orm_user(user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    db.delete(user)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
