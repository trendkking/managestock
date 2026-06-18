# MANAGESTOCK Backend

FastAPI + SQLAlchemy + SQLite — **23개 REST API** (`backend.md` 명세)

## 빠른 시작

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env

python -m scripts.db_setup   # migrate + seed
uvicorn app.main:app --reload --port 8000
```

- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/health

## 시드 계정

| 이메일 | 비밀번호 | role |
|--------|----------|------|
| test@gmail.com | 123 | admin |

## API 구조

| 라우터 | 경로 | 설명 |
|--------|------|------|
| auth | `/api/auth` | 회원가입·로그인·프로필 |
| accounts | `/api/accounts` | 계좌 CRUD, holdings, trades |
| journals | `/api/journals` | 매매일지 |
| competitions | `/api/competitions` | 경연 대회 |
| dashboard | `/api/dashboard` | 대시보드 요약 |

## 프론트 연동

프론트 `.env`: `VITE_USE_MOCK=false`, `VITE_API_URL=http://localhost:8000`

프로젝트 루트 `npm start` 시 DB 마이그레이션·시드 후 서버가 함께 실행됩니다.
