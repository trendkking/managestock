from pydantic import EmailStr, Field

from app.schemas.base import CamelModel, dt_iso


class RegisterRequest(CamelModel):
    nickname: str = Field(min_length=2, max_length=20)
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(CamelModel):
    email: str = Field(min_length=1, description="이메일 또는 admin")
    password: str


class TokenResponse(CamelModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(CamelModel):
    id: int
    nickname: str
    email: str
    role: str
    show_nickname_public: bool
    created_at: str

    @classmethod
    def from_orm_user(cls, user) -> "UserResponse":
        return cls(
            id=user.id,
            nickname=user.nickname,
            email=user.email,
            role=user.role,
            show_nickname_public=user.show_nickname_public,
            created_at=dt_iso(user.created_at),
        )


class ProfileUpdateRequest(CamelModel):
    nickname: str | None = Field(default=None, min_length=2, max_length=20)
    show_nickname_public: bool | None = None
