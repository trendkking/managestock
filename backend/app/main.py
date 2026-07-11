from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.bootstrap import ensure_admin_user
from app.config import settings
from app.routers import accounts, admin, auth, brokers, competitions, dashboard, journal_entries, journal_rule_memo, journals, market, seo
from app.schemas.common import HealthResponse


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        ensure_admin_user()
    except Exception:
        # 관리자 시드 실패로 API 전체가 죽지 않게 함
        pass
    yield


app = FastAPI(
    title="BULLSLONG API",
    description="주식 계좌 관리 · 매매일지 · 수익률 경연 대회 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


app.include_router(auth.router, prefix="/api")
app.include_router(accounts.router, prefix="/api")
app.include_router(brokers.router, prefix="/api")
app.include_router(journals.router, prefix="/api")
app.include_router(journal_entries.router, prefix="/api")
app.include_router(journal_rule_memo.router, prefix="/api")
app.include_router(market.router, prefix="/api")
app.include_router(competitions.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(seo.router)


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health_check() -> HealthResponse:
    return HealthResponse(status="ok")
