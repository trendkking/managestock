# 백엔드 현황 명세서 (backend.md)

> **최종 업데이트:** 2026-06-20  
> **상태:** 구현 완료 · 프로덕션 배포됨 (`https://bullslong.com/api`)

---

## 1. 개요

### 1.1 기술 스택 (실제 버전)

| 구분 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | FastAPI | 0.137.2 |
| 언어 | Python | 3.11.15 |
| ORM | SQLAlchemy | 2.0.51 |
| 마이그레이션 | Alembic | 1.18.4 |
| DB | SQLite 3 | (WAL 모드) |
| 인증 | JWT HS256 + bcrypt | python-jose, bcrypt 5.x |
| 검증 | Pydantic v2 | |
| 서버 | Uvicorn | 0.49.0 (workers=2) |
| 증권사 연동 | 한국투자증권 Open API (KIS) | finance-datareader |

### 1.2 디렉터리 구조 (실제)

```
backend/
├── app/
│   ├── main.py              # FastAPI 앱, CORS, 라우터 등록
│   ├── config.py            # pydantic-settings (.env 로드)
│   ├── database.py          # SQLAlchemy Base, SessionLocal
│   ├── dependencies.py      # get_db, get_current_user, get_current_admin
│   ├── db/
│   │   └── engine.py        # WAL 모드 설정
│   ├── models/              # SQLAlchemy ORM 모델
│   │   ├── user.py
│   │   ├── account.py       # Account, Holding, Trade, AccountSnapshot
│   │   ├── account_credential.py
│   │   ├── account_cash_flow.py
│   │   ├── journal.py       # Journal, JournalTag, JournalStock, JournalTrade
│   │   ├── journal_entry.py
│   │   └── competition.py   # Competition, CompetitionEntry, CompetitionSnapshot
│   ├── schemas/             # Pydantic v2 요청/응답 스키마
│   │   ├── auth.py
│   │   ├── account.py
│   │   ├── broker.py
│   │   ├── journal.py
│   │   ├── journal_entry.py
│   │   ├── competition.py
│   │   ├── dashboard.py
│   │   ├── market.py
│   │   ├── admin.py
│   │   ├── base.py
│   │   └── common.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── accounts.py
│   │   ├── brokers.py
│   │   ├── journals.py
│   │   ├── journal_entries.py
│   │   ├── competitions.py
│   │   ├── dashboard.py
│   │   ├── market.py
│   │   └── admin.py
│   ├── services/
│   │   ├── account_sync_service.py   # KIS 연동, 잔고/체결 동기화
│   │   ├── trade_service.py          # 매수/매도 처리, 보유종목 갱신
│   │   ├── snapshot_service.py       # 계좌 일별 스냅샷
│   │   ├── portfolio_valuation.py    # 포트폴리오 평가
│   │   ├── holdings_portfolio.py     # 보유종목 포트폴리오
│   │   ├── calculations.py           # 수익률 계산
│   │   ├── competition_evaluation.py # 대회 수익률 평가
│   │   ├── competition_service.py    # 대회 참가/탈퇴
│   │   ├── journal_service.py        # 매매일지 CRUD
│   │   ├── market_data_service.py    # FinanceDataReader 주가 조회
│   │   ├── dashboard_service.py      # 대시보드 집계
│   │   ├── admin_service.py          # 관리자 통계
│   ├── brokers/
│   │   ├── base.py          # BrokerBase 추상 클래스, BrokerError
│   │   ├── catalog.py       # 지원 증권사 카탈로그
│   │   ├── factory.py       # 브로커 인스턴스 팩토리
│   │   └── kis.py           # 한국투자증권 KIS Open API 구현
│   └── utils/
│       ├── jwt.py           # create_access_token, decode_token
│       ├── security.py      # hash_password, verify_password
│       ├── crypto.py        # Fernet 암호화 (API 키 저장)
│       ├── auth_email.py    # 관리자 이메일, 로그인 식별자 정규화
│       └── time.py          # utc_now()
├── alembic/
│   ├── alembic.ini
│   └── versions/            # 001 ~ 010 마이그레이션
├── tests/                   # pytest 테스트
├── data/
│   └── bullslong.db       # 프로덕션 SQLite DB (WAL)
├── uploads/                 # 업로드 파일 디렉터리
├── venv/                    # Python 3.11 가상환경
├── requirements.txt
├── .env                     # 프로덕션 환경 변수
└── .env.example
```

---

## 2. 서버 설정 (프로덕션)

### 2.1 systemd 서비스

파일: `/etc/systemd/system/bullslong-backend.service`

```ini
[Unit]
Description=BULLSLONG FastAPI Backend
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/var/www/bullslong/backend
EnvironmentFile=/var/www/bullslong/backend/.env
ExecStart=/var/www/bullslong/backend/venv/bin/uvicorn app.main:app \
          --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 2.2 Nginx 설정

```nginx
# /etc/nginx/nginx.conf — HTTPS 서버 블록
location /api/ {
    proxy_pass         http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
}
```

### 2.3 환경 변수 (`backend/.env`)

| 변수 | 프로덕션 값 | 설명 |
|------|------------|------|
| `APP_ENV` | `production` | 환경 구분 |
| `DATABASE_URL` | `sqlite:////var/www/bullslong/backend/data/bullslong.db` | DB 경로 |
| `SECRET_KEY` | (랜덤 64자) | JWT 서명 키 |
| `ALGORITHM` | `HS256` | JWT 알고리즘 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | 토큰 만료 (24h) |
| `CORS_ORIGINS` | `https://bullslong.com,https://www.bullslong.com` | CORS 허용 도메인 |
| `UPLOAD_DIR` | `/var/www/bullslong/backend/uploads` | 업로드 경로 |
| `SQLITE_WAL` | `true` | WAL 모드 |
| `KIS_USE_VIRTUAL` | `false` | KIS 실전/모의 투자 |

---

## 3. API 엔드포인트 명세

Base URL: `https://bullslong.com/api`  
인증: `Authorization: Bearer {JWT}` (명시된 공개 엔드포인트 제외)

### 3.1 인증 (`/api/auth`)

| Method | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/auth/register` | 불필요 | 회원가입 |
| POST | `/auth/login` | 불필요 | 로그인 → JWT 반환 |
| GET | `/auth/me` | 필요 | 내 정보 조회 |
| PATCH | `/auth/me` | 필요 | 닉네임·공개설정 수정 |
| DELETE | `/auth/me` | 필요 | 회원 탈퇴 |

### 3.2 계좌 (`/api/accounts`)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/accounts` | 내 계좌 목록 (수익률 포함) |
| POST | `/accounts` | 수동 계좌 생성 |
| POST | `/accounts/connect` | KIS API 연동 계좌 생성 |
| GET | `/accounts/{id}` | 계좌 상세 (보유종목·매매·차트 포함) |
| PATCH | `/accounts/{id}` | 계좌 정보 수정 |
| DELETE | `/accounts/{id}` | 계좌 삭제 (대회 참가 중이면 400) |
| POST | `/accounts/{id}/sync` | KIS 잔고·보유종목 동기화 |
| POST | `/accounts/{id}/holdings` | 보유종목 수동 등록/수정 |
| POST | `/accounts/{id}/trades` | 매매 수동 등록 (매수/매도) |
| POST | `/accounts/{id}/trades/import` | KIS 체결 내역 기간별 가져오기 |

**계좌 상세 응답 (`GET /accounts/{id}`) 포함 필드:**
- 기본 정보 + 수익률/평가금액
- `holdings`: 보유종목 목록 (market_type, PnL 필드 포함)
- `holdingsSummary`: 포트폴리오 비중 요약
- `trades`: 매매 내역 목록 (최신순)
- `performance`: 일별 스냅샷 수익률 배열

### 3.3 증권사 (`/api/brokers`)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/brokers` | 지원 증권사 목록 |

**지원 증권사:**

| code | 이름 | API 연동 | 국내 | 미국 |
|------|------|---------|------|------|
| `kis` | 한국투자증권 | ✅ | ✅ | NASD, NYSE, AMEX |
| `kiwoom` | 키움증권 | 준비중 | ✅ | - |
| `ls` | LS증권 | 준비중 | ✅ | - |
| `mirae` | 미래에셋증권 | 준비중 | ✅ | NASD, NYSE, AMEX |

### 3.4 매매일지 (`/api/journals`)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/journals` | 내 일지 목록 |
| POST | `/journals` | 일지 작성 |
| GET | `/journals/{id}` | 일지 상세 (linkedTrades 포함) |
| PATCH | `/journals/{id}` | 일지 수정 |
| DELETE | `/journals/{id}` | 일지 삭제 |

### 3.5 매매일지 항목 (`/api/journal-entries`)

차트 마커용 날짜·종목·매매사유 기록

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/journal-entries` | 내 항목 목록 (stock_code 필터) |
| POST | `/journal-entries` | 항목 생성 |
| PATCH | `/journal-entries/{id}` | 항목 수정 |
| DELETE | `/journal-entries/{id}` | 항목 삭제 |

### 3.6 경연 대회 (`/api/competitions`)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/competitions` | 대회 목록 (status 필터) |
| GET | `/competitions/entries/me` | 내 참가 목록 |
| GET | `/competitions/{id}` | 대회 상세 |
| POST | `/competitions/{id}/join` | 대회 참가 |
| DELETE | `/competitions/{id}/leave` | 대회 탈퇴 |
| GET | `/competitions/{id}/leaderboard` | 리더보드 (순위) |
| GET | `/competitions/{id}/chart` | 참가자 수익률 추이 |

### 3.7 대시보드 (`/api/dashboard`)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/dashboard/summary` | 전체 자산 요약 + 계좌별 수익률 |

### 3.8 시장 데이터 (`/api/market`)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/market/stocks/search?q=` | 종목 검색 (FinanceDataReader) |
| GET | `/market/stocks/{code}/daily` | 일별 OHLCV (캔들스틱용) |

### 3.9 관리자 (`/api/admin`) — role=admin 전용

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/admin/stats` | 전체 통계 |
| GET | `/admin/users` | 사용자 목록 |
| DELETE | `/admin/users/{id}` | 사용자 삭제 |
| GET | `/admin/journals` | 전체 일지 목록 |
| DELETE | `/admin/journals/{id}` | 일지 삭제 |

### 3.10 헬스체크

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | `{"status": "ok"}` |

API 문서 (Swagger): `https://bullslong.com/docs`

---

## 4. 핵심 비즈니스 로직

### 4.1 매수/매도 처리 (`trade_service.py`)
1. 매수: 현금 차감, 보유종목 가중평균 단가 갱신
2. 매도: 보유 수량 초과 시 400, 실현손익 계산, 현금 증가
3. 매매 처리 후 `account_snapshots` 당일 스냅샷 upsert

### 4.2 수익률 계산 (`calculations.py`)
```
총평가금액 = cash_balance + Σ(quantity × current_price)
수익률(%) = (총평가금액 - initial_capital) / initial_capital × 100
```

### 4.3 KIS 연동 (`brokers/kis.py`, `account_sync_service.py`)
- 계좌 연결 시 App Key/Secret → Fernet 암호화 → `account_credentials` 저장
- `POST /accounts/{id}/sync`: 잔고 조회 → 보유종목 동기화
- `POST /accounts/{id}/trades/import`: 국내 체결 내역 기간별 가져오기 (중복 방지)
- 토큰 만료 시 자동 재발급

### 4.4 대회 수익률 (`competition_evaluation.py`)
```
대회수익률(%) = (current_value - entry_value) / entry_value × 100
```
- 입출금 보정: `account_cash_flows` 테이블 기록 → Modified Dietz 방식 적용

---

## 5. 테스트

```bash
cd backend
venv/bin/pytest -v                               # 전체
venv/bin/pytest tests/test_calculations.py -v    # 수익률 계산
venv/bin/pytest tests/test_kis_broker.py -v      # KIS 브로커
```

테스트 파일:
- `test_api_integration.py` — 인증·계좌·매매 통합
- `test_calculations.py` — 수익률·손익 계산
- `test_competition_evaluation.py` — 대회 수익률
- `test_kis_broker.py` — KIS API
- `test_kis_domestic_trades.py` — 체결 내역 가져오기
- `test_trade_import_dedupe.py` — 중복 방지
- `test_market_data_service.py` — 주가 조회
