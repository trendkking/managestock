# 백엔드 개발 요청 명세서 (backend.md)

> **기준 문서:** 현재 구현된 React 프론트엔드 (`frontend/src`)  
> **DB:** 개발·프로덕션 모두 **SQLite**  
> **원칙:** UI에 존재하는 기능과 화면에 필요한 데이터만 API·DB로 구현한다.

---

## 1. 개요

### 1.1 목적

프론트엔드 Mock(Zustand)을 **FastAPI REST API**로 대체한다.  
응답 필드명·구조는 `frontend/src/types/index.ts`와 **동일한 camelCase**를 사용해 연동 비용을 최소화한다.

### 1.2 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | FastAPI 0.110+ |
| 언어 | Python 3.11+ |
| ORM | SQLAlchemy 2.0 |
| 마이그레이션 | Alembic |
| DB | **SQLite 3** (dev + production 동일) |
| 인증 | JWT (Bearer) + bcrypt |
| 검증 | Pydantic v2 |
| 서버 | Uvicorn |

### 1.3 디렉터리 구조

```
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── dependencies.py
│   ├── models/
│   ├── schemas/          # 요청/응답 (camelCase alias)
│   ├── routers/
│   │   ├── auth.py
│   │   ├── accounts.py
│   │   ├── accounts.py     # 계좌 + holdings/trades/performance 중첩
│   │   ├── journals.py
│   │   ├── competitions.py
│   │   └── dashboard.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── account_service.py
│   │   ├── trade_service.py      # 매매 + 스냅샷·대회 entry 갱신
│   │   ├── journal_service.py
│   │   └── competition_service.py
│   └── utils/
│       ├── security.py
│       └── pagination.py
├── alembic/
├── scripts/
│   └── seed.py             # 테스트 계정·샘플 데이터
├── tests/
├── requirements.txt
└── .env.example
```

### 1.4 프론트 화면 ↔ API 매핑 (검증 반영 2026-06-01)

| 프론트 경로 | 화면·컴포넌트 | API 호출 |
|-------------|----------------|----------|
| `/login` | `LoginPage` | `POST /auth/login` |
| `/register` | `RegisterPage` | `POST /auth/register` |
| `/` | `LandingPage` | (토큰 있으면) `GET /auth/me` |
| `/dashboard` | `DashboardPage` | `GET /dashboard/summary` 1회 (계좌별 막대 차트 포함) |
| `/accounts` | `AccountsPage`, `AccountFormDialog` | `GET/POST/PATCH/DELETE /accounts` |
| `/accounts/:id` | `AccountDetailPage`, `TradeFormModal`, `HoldingFormModal` | `GET /accounts/{id}` (holdings·trades·**performance** 포함), `POST …/holdings`, `POST …/trades` |
| `/journal` | `JournalListPage` | `GET /journals?q=&accountId=` |
| `/journal/new`, `…/edit` | `JournalFormPage` | `GET /accounts` (계좌 셀렉트), `POST/PATCH/DELETE /journals` |
| `/journal/:id` | `JournalDetailPage` | `GET /journals/{id}` (`linkedTrades` 포함) |
| `/competitions` | `CompetitionsPage` | `GET /competitions?status=` |
| `/competitions/:id` | `CompetitionDetailPage` | `GET /competitions/{id}`, `GET …/leaderboard`, `GET …/chart`, `GET /accounts` (참가 계좌), `POST …/join` |
| `/profile` | `ProfilePage` | `GET/PATCH/DELETE /auth/me` |
| `/admin/competitions` | `AdminCompetitionsPage` | `GET /competitions` (`status` 생략 → 전체) |

**제거·통합 (UI·Mock 기준)**

| 기존 명세 | 조치 | 사유 |
|-----------|------|------|
| `GET /accounts/{id}/trades` | **제거** | `AccountDetailPage`는 `GET /accounts/{id}`의 `trades`로 탭 필터(클라이언트) |
| `DELETE /accounts/{id}/trades/{id}` | **제거** | 매매 삭제 UI 없음 (`dataStore.deleteTrade` 미사용) |
| `GET /accounts/{id}/performance` | **`GET /accounts/{id}`에 통합** | 차트 탭이 별도 요청 없이 상세 1회 로드 |
| `GET /admin/competitions` | **제거** | 관리자 테이블 = `GET /competitions` (status 생략) |

---

## 2. 구현 범위 (In / Out)

### 2.1 구현 대상 (In Scope)

- JWT 로그인·회원가입·내 정보·프로필 수정·회원 탈퇴
- 계좌 CRUD + 목록/상세 시 **수익률·평가금액 계산 필드 포함**
- 보유종목 수동 등록/수정 (종목코드당 1행)
- 매매 **등록** (매수/매도 → 현금·보유종목 자동 반영; 목록은 계좌 상세에 포함)
- 계좌 일별 스냅샷 기반 **수익률 차트**
- 매매일지 CRUD + 태그·관련종목·연결매매
- 경연 대회 목록·상세·참가·리더보드·Top N 차트
- 관리자: `GET /competitions` (status 생략)로 대회 테이블 조회
- SQLite 단일 DB 파일 (환경별 경로만 분리)
- 시드: `test@gmail.com` / `123` (admin)

### 2.2 구현 제외 (Out of Scope)

프론트에 **UI가 없거나** “Phase 2”로 표시된 기능은 백엔드도 구현하지 않는다.

| 제외 항목 | 사유 |
|-----------|------|
| 비밀번호 변경 API | `ProfilePage` — “Phase 2” 버튼 |
| 매매일지 이미지 업로드 | 업로드 UI 없음 |
| 매매 수정(PATCH trade) | 수정 UI 없음 |
| 관리자 전용 `/admin/*` 라우터 | `GET /competitions`로 통합 |
| 관리자 대회 생성/수정/삭제 | `AdminCompetitionsPage` 조회만 |
| 대회 참가 취소 | UI 없음 |
| OAuth·실시간 시세·WebSocket | 미구현 |
| PostgreSQL 전환 | 본 프로젝트는 SQLite 고정 |

---

## 3. 환경 설정 (SQLite)

### 3.1 환경 변수

| 변수 | 개발 | 프로덕션 | 설명 |
|------|------|----------|------|
| `APP_ENV` | `development` | `production` | 환경 구분 |
| `DATABASE_URL` | `sqlite:///./managestock.db` | `sqlite:///./data/managestock.db` | SQLite 경로 |
| `SECRET_KEY` | (랜덤) | (강력한 랜덤) | JWT 서명 |
| `ALGORITHM` | `HS256` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | `1440` | 24시간 |
| `CORS_ORIGINS` | `http://localhost:5173` | 실제 도메인 | |
| `SQLITE_WAL` | `true` | `true` | WAL 모드 권장 |

```env
# backend/.env.example
APP_ENV=development
DATABASE_URL=sqlite:///./managestock.db
SECRET_KEY=change-me-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173
```

### 3.2 SQLite 운영 설정

```python
# database.py
connect_args = {"check_same_thread": False}
# 시작 시: PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
```

- 프로덕션: `data/` 디렉터리에 DB 파일, 백업은 파일 복사
- 동시 쓰기: WAL 모드 + 짧은 트랜잭션
- Alembic으로 스키마 버전 관리 (dev/prod 동일 마이그레이션)

### 3.3 CORS

- `allow_credentials=True`
- Methods: `GET, POST, PATCH, DELETE`
- Headers: `Authorization`, `Content-Type`

---

## 4. 인증

### 4.1 JWT

- Header: `Authorization: Bearer {token}`
- Payload: `sub` (user_id), `role`, `exp`

### 4.2 역할

| role | 프론트 접근 |
|------|-------------|
| `user` | 일반 페이지 |
| `admin` | 일반 + `/admin/competitions` |

### 4.3 시드 계정

| 이메일 | 비밀번호 | role | 용도 |
|--------|----------|------|------|
| `test@gmail.com` | `123` | `admin` | 전체 페이지 테스트 |

---

## 5. API 명세

Base URL: `/api`  
응답 JSON 키: **camelCase** (프론트 `types/index.ts`와 동일)

### 5.0 엔드포인트 목록 (최적화 · 23개)

| # | Method | Path | DB·서비스 | 프론트 |
|---|--------|------|-----------|--------|
| 1 | POST | `/auth/register` | `users` INSERT | `RegisterPage` |
| 2 | POST | `/auth/login` | `users` SELECT | `LoginPage` |
| 3 | GET | `/auth/me` | `users` | 세션 복원·`ProfilePage` |
| 4 | PATCH | `/auth/me` | `users` UPDATE | `ProfilePage` 저장 |
| 5 | DELETE | `/auth/me` | CASCADE 전 테이블 | `ProfilePage` 탈퇴 |
| 6 | GET | `/dashboard/summary` | 집계·`trades`·`journals`·`competition_entries` | `DashboardPage` |
| 7 | GET | `/accounts` | `accounts`+`holdings` 계산 | `AccountsPage`, 일지/대회 셀렉트 |
| 8 | POST | `/accounts` | `accounts`+`account_snapshots` | 계좌 추가 |
| 9 | GET | `/accounts/{id}` | `accounts`+`holdings`+`trades`+`account_snapshots` | `AccountDetailPage` |
| 10 | PATCH | `/accounts/{id}` | `accounts` UPDATE | 계좌 수정 |
| 11 | DELETE | `/accounts/{id}` | CASCADE·`competition_entries` RESTRICT | 계좌 삭제 |
| 12 | POST | `/accounts/{id}/holdings` | `holdings` UPSERT | `HoldingFormModal` |
| 13 | POST | `/accounts/{id}/trades` | `trades`+`holdings`+`accounts`+스냅샷·대회 entry | `TradeFormModal` |
| 14 | GET | `/journals` | `journals`+tags 검색 | `JournalListPage` |
| 15 | POST | `/journals` | `journals`+tags/stocks/trades | 일지 작성 |
| 16 | GET | `/journals/{id}` | `journals`+M:N+`trades` JOIN | `JournalDetailPage` |
| 17 | PATCH | `/journals/{id}` | 동일 REPLACE | 일지 수정 |
| 18 | DELETE | `/journals/{id}` | CASCADE | 일지 삭제 |
| 19 | GET | `/competitions` | `competitions`+entry COUNT | 목록·**관리자 테이블** |
| 20 | GET | `/competitions/{id}` | `competitions`+`isJoined` | `CompetitionDetailPage` 헤더 |
| 21 | POST | `/competitions/{id}/join` | `competition_entries` INSERT | 참가하기 |
| 22 | GET | `/competitions/{id}/leaderboard` | `competition_entries`+`users`+`accounts` | 리더보드 |
| 23 | GET | `/competitions/{id}/chart` | `competition_snapshots` Top 5 | 수익률 차트 |

인증 5 + 대시보드 1 + 계좌 7 + 일지 5 + 대회 5 = **23개** (구 명세 대비 `GET …/trades`, `DELETE …/trades`, `GET …/performance`, `GET /admin/competitions` 4건 제거)

**페이지네이션:** UI에 페이지 넘김이 없는 리소스는 `items`+`total`만 반환하고 `page`/`limit`는 **선택** (기본: 전체 또는 상한 100).

```json
{
  "items": [],
  "total": 0
}
```

---

### 5.1 인증 `/auth`

| Method | Path | Auth | 프론트 연동 |
|--------|------|------|-------------|
| POST | `/auth/register` | - | `RegisterPage` |
| POST | `/auth/login` | - | `LoginPage` |
| GET | `/auth/me` | ✓ | 레이아웃·프로필 |
| PATCH | `/auth/me` | ✓ | `ProfilePage` 저장 |
| DELETE | `/auth/me` | ✓ | `ProfilePage` 탈퇴 |

#### POST `/auth/register`

```json
// Request
{ "nickname": "닉네임", "email": "user@example.com", "password": "password123" }

// Response 201 — User (camelCase)
{
  "id": 1,
  "nickname": "닉네임",
  "email": "user@example.com",
  "role": "user",
  "showNicknamePublic": true,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

- 비밀번호: 일반 가입 8자 이상
- `test@gmail.com`은 시드 전용 (중복 가입 409)

#### POST `/auth/login`

```json
// Request (JSON)
{ "email": "test@gmail.com", "password": "123" }

// Response 200
{ "accessToken": "eyJ...", "tokenType": "bearer" }
```

#### GET `/auth/me`

```json
// Response 200 — User
```

#### PATCH `/auth/me`

```json
// Request (프로필 UI 필드만)
{ "nickname": "새닉네임", "showNicknamePublic": false }
```

#### DELETE `/auth/me`

- 연관 데이터 cascade 삭제 (계좌·일지·대회 참가 등)
- Response: `204 No Content`

---

### 5.2 대시보드 `/dashboard`

| Method | Path | Auth | 프론트 연동 |
|--------|------|------|-------------|
| GET | `/dashboard/summary` | ✓ | `DashboardPage` |

#### Response — `DashboardSummary` (+ 계좌별 막대 차트)

`DashboardPage`는 별도 `GET /accounts` 없이 이 응답만으로 렌더링한다.

```json
{
  "totalValue": 16130000,
  "totalProfitLoss": 1130000,
  "totalReturnRate": 7.54,
  "accountsCount": 2,
  "accountSummaries": [
    { "id": 1, "name": "키움 주계좌", "returnRate": 12.5 },
    { "id": 2, "name": "단타 연습 계좌", "returnRate": -2.4 }
  ],
  "recentTrades": [ /* Trade[], 최대 5건, tradedAt DESC, 본인 전체 계좌 */ ],
  "activeCompetitions": [
    { "id": 1, "name": "2026 Q2 수익률 챌린지", "myRank": 3, "returnRate": 12.5 }
  ],
  "recentJournals": [ /* Journal[], 최대 3건, journal_date DESC */ ]
}
```

| 필드 | DB·계산 |
|------|---------|
| `totalValue` 등 | 본인 `accounts` + `holdings` 집계 |
| `accountSummaries` | 계좌별 `returnRate` (§6.6) — `types`에 없음, API 전용 |
| `activeCompetitions` | `competitions.status=active` ∧ 본인 `competition_entries` |
| `recentTrades` | `trades` JOIN `accounts` WHERE `user_id` |
| `recentJournals` | `journals` WHERE `user_id` |

---

### 5.3 계좌 `/accounts`

| Method | Path | Auth | 프론트 연동 |
|--------|------|------|-------------|
| GET | `/accounts` | ✓ | `AccountsPage` 카드 목록 |
| POST | `/accounts` | ✓ | 계좌 추가 모달 |
| GET | `/accounts/{id}` | ✓ | `AccountDetailPage` 헤더·탭 |
| PATCH | `/accounts/{id}` | ✓ | 계좌 수정 모달 |
| DELETE | `/accounts/{id}` | ✓ | 계좌 삭제 |

#### GET `/accounts` — 항목: `Account` + 통계 필드

```json
{
  "items": [
    {
      "id": 1,
      "userId": 1,
      "name": "키움 주계좌",
      "broker": "키움증권",
      "initialCapital": 10000000,
      "cashBalance": 5670000,
      "description": "장기 투자용",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "currentValue": 11250000,
      "profitLoss": 1250000,
      "returnRate": 12.5
    }
  ],
  "total": 1
}
```

#### POST `/accounts`

```json
// Request — AccountsPage 모달
{
  "name": "키움 주계좌",
  "broker": "키움증권",
  "initialCapital": 10000000,
  "description": "선택"
}
```

- 생성 시 `cashBalance = initialCapital`
- 초기 스냅샷 1건 기록

#### GET `/accounts/{id}` — `AccountWithStats` + `performance`

`AccountDetailPage` 1회 호출로 보유·매매·수익률 차트 탭을 모두 채운다.  
매매 탭 `tradeType` 필터는 **클라이언트**에서 `trades` 배열 필터 (`AccountDetailPage`와 동일).

```json
{
  "id": 1,
  "userId": 1,
  "name": "키움 주계좌",
  "broker": "키움증권",
  "initialCapital": 10000000,
  "cashBalance": 5670000,
  "description": "...",
  "createdAt": "...",
  "currentValue": 11250000,
  "profitLoss": 1250000,
  "returnRate": 12.5,
  "holdings": [ /* Holding[] — holdings 테이블 */ ],
  "trades": [ /* Trade[] — trades 테이블, tradedAt DESC */ ],
  "performance": [
    { "date": "2026-05-01", "returnRate": 0, "totalValue": 10000000 }
  ]
}
```

| 응답 필드 | DB 테이블 |
|-----------|-----------|
| `holdings[]` | `holdings` |
| `trades[]` | `trades` |
| `performance[]` | `account_snapshots` → `date`=`snapshot_date`, `returnRate`, `totalValue` |

#### PATCH `/accounts/{id}`

- 수정 가능: `name`, `broker`, `description` (프론트 수정 모달과 동일)
- `initialCapital`은 생성 후 변경 불가

---

### 5.4 보유종목 `/accounts/{account_id}/holdings`

| Method | Path | Auth | 프론트 연동 |
|--------|------|------|-------------|
| POST | `/accounts/{id}/holdings` | ✓ | `HoldingFormModal` |

```json
// Request — upsert (accountId + stockCode UNIQUE)
{
  "stockCode": "005930",
  "stockName": "삼성전자",
  "quantity": 50,
  "avgPrice": 68000,
  "currentPrice": 72000
}

// Response 200 — Holding
```

- 목록은 `GET /accounts/{id}` 의 `holdings`에 포함 (별도 목록 API 불필요)
- `current_price` 변경 시 `account_snapshots` 당일 upsert + 대회 entry 재계산 (trade와 동일 규칙)

---

### 5.5 매매 `/accounts/{account_id}/trades`

| Method | Path | Auth | 프론트 연동 |
|--------|------|------|-------------|
| POST | `/accounts/{id}/trades` | ✓ | `TradeFormModal` |

- **목록:** `GET /accounts/{id}` 의 `trades` (별도 GET 없음)
- **삭제·수정:** UI 없음 → API 없음

#### POST — `TradeFormModal` 필드

```json
{
  "stockCode": "005930",
  "stockName": "삼성전자",
  "tradeType": "buy",
  "quantity": 10,
  "price": 72000,
  "fee": 100,
  "tax": 0,
  "tradedAt": "2026-05-30T14:30:00.000Z",
  "memo": "선택"
}
```

#### `trade_service` 규칙 (프론트 Mock과 동일)

| 유형 | 처리 |
|------|------|
| 매수 | `cashBalance` 감소, 보유종목 가중평균 단가 갱신 |
| 매도 | 보유 수량 검증(부족 시 400), `realizedPnl` 계산, 수량 0이면 종목 삭제 |
| 공통 | `account_snapshots` 당일 upsert, 참가 계좌면 `competition_entries`·`competition_snapshots` 갱신 |

**DB 쓰기 (POST trade)**

| trade_type | 테이블 |
|------------|--------|
| buy/sell | `trades` INSERT |
| buy/sell | `accounts.cash_balance` UPDATE |
| buy/sell | `holdings` UPSERT / UPDATE / DELETE |
| sell | `trades.realized_pnl` SET |

> 수익률 차트 데이터는 **`GET /accounts/{id}` → `performance[]`** (`account_snapshots`). 별도 `/performance` 엔드포인트 없음.

---

### 5.6 매매일지 `/journals`

| Method | Path | Auth | 프론트 연동 |
|--------|------|------|-------------|
| GET | `/journals` | ✓ | `JournalListPage` |
| POST | `/journals` | ✓ | `JournalFormPage` 작성 |
| GET | `/journals/{id}` | ✓ | `JournalDetailPage` |
| PATCH | `/journals/{id}` | ✓ | `JournalFormPage` 수정 |
| DELETE | `/journals/{id}` | ✓ | 상세·수정 페이지 |

#### GET Query — `JournalListPage`

| 파라미터 | 설명 |
|----------|------|
| `q` | 제목·본문·`journal_tags.tag` 검색 (프론트 `includes`와 동일) |
| `accountId` | `journals.account_id` 필터 |
| `page`, `limit` | 선택 (UI 없음, 기본 전체) |

#### POST / PATCH — `JournalFormPage`

```json
{
  "title": "삼성전자 매수 근거",
  "journalDate": "2026-05-30",
  "accountId": 1,
  "content": "## 매수 근거\n...",
  "reflection": "선택",
  "emotion": "confident",
  "tags": ["반도체", "장기"],
  "stockCodes": ["005930"],
  "tradeIds": [12, 13]
}
```

#### Response — `Journal`

```json
{
  "id": 1,
  "userId": 1,
  "accountId": 1,
  "title": "...",
  "journalDate": "2026-05-30",
  "content": "...",
  "reflection": "...",
  "emotion": "confident",
  "tags": ["반도체"],
  "stockCodes": ["005930"],
  "tradeIds": [1],
  "createdAt": "...",
  "updatedAt": "..."
}
```

- `emotion` 값: `confident`, `anxious`, `fomo`, `calm`, `greedy`, `fearful` (프론트 `EMOTIONS` 상수)

**DB 쓰기 (POST/PATCH)**

| 요청 필드 | 테이블 |
|-----------|--------|
| 본문 필드 | `journals` |
| `tags[]` | `journal_tags` (기존 삭제 후 INSERT) |
| `stockCodes[]` | `journal_stocks` (code; name은 holdings/trades에서 보완 가능) |
| `tradeIds[]` | `journal_trades` |

#### GET `/journals/{id}` — 상세 (`JournalDetailPage`)

목록용 `Journal` 필드 + 연결 매매 (프론트가 전역 `trades`를 조회하지 않도록).

```json
{
  "id": 1,
  "title": "...",
  "tags": ["반도체"],
  "stockCodes": ["005930"],
  "tradeIds": [1],
  "linkedTrades": [
    {
      "id": 1,
      "accountId": 1,
      "stockCode": "005930",
      "stockName": "삼성전자",
      "tradeType": "buy",
      "quantity": 50,
      "price": 68000,
      "fee": 500,
      "tax": 0,
      "tradedAt": "2026-05-10T10:30:00.000Z"
    }
  ]
}
```

| 필드 | DB |
|------|-----|
| `linkedTrades` | `journal_trades` → `trades` (본인 소유 검증) |

---

### 5.7 경연 대회 `/competitions`

| Method | Path | Auth | 프론트 연동 |
|--------|------|------|-------------|
| GET | `/competitions` | ✓ | `CompetitionsPage` 탭 |
| GET | `/competitions/{id}` | ✓ | `CompetitionDetailPage` |
| POST | `/competitions/{id}/join` | ✓ | 참가하기 |
| GET | `/competitions/{id}/leaderboard` | ✓ | 리더보드 |
| GET | `/competitions/{id}/chart` | ✓ | Top 5 Line Chart |

#### GET `/competitions?status=`

| status | 프론트 |
|--------|--------|
| `active` | `CompetitionsPage` 진행 중 탭 |
| `upcoming` | 예정 탭 |
| `ended` | 종료 탭 |
| *(생략)* | `AdminCompetitionsPage` — 전체 상태 한 번에 |

| 응답 필드 | DB |
|-----------|-----|
| `participantCount` | `COUNT(competition_entries)` |
| `isJoined` | 본인 `competition_entries` 존재 여부 |

#### Response 항목 — `Competition`

```json
{
  "id": 1,
  "name": "2026 Q2 수익률 챌린지",
  "description": "...",
  "startDate": "2026-04-01",
  "endDate": "2026-06-30",
  "status": "active",
  "minInitialCapital": 5000000,
  "maxParticipants": null,
  "rules": "...",
  "participantCount": 48,
  "isJoined": true
}
```

- `isJoined`: 현재 로그인 사용자 참가 여부

#### POST `/competitions/{id}/join`

```json
{ "accountId": 1 }
```

| 검증 | |
|------|--|
| 본인 계좌 | |
| 동일 대회 1인 1계좌 | |
| `status` in (`upcoming`, `active`) | |
| `entryValue` = 참가 시점 계좌 `currentValue` | |

#### GET `/competitions/{id}`

`CompetitionDetailPage` 헤더·규칙·참가 UI. `GET /competitions` 목록과 동일 스키마 + 필수.

#### GET `/competitions/{id}/leaderboard`

`CompetitionDetailPage` 리더보드. 상단 대회 정보는 `GET /competitions/{id}` 로 이미 로드 — **중복 `competition` 객체 없음**.

```json
{
  "myRank": 3,
  "items": [
    {
      "rank": 1,
      "userId": 5,
      "nickname": "bull_run",
      "accountName": "대회용 계좌",
      "returnRate": 25.8,
      "currentValue": 12580000,
      "entryValue": 10000000,
      "isMe": false
    }
  ],
  "total": 48
}
```

- `showNicknamePublic=false` 사용자는 닉네임 `"익명"` 처리

#### GET `/competitions/{id}/chart`

```json
{
  "series": [
    {
      "nickname": "bull_run",
      "data": [
        { "date": "04-01", "returnRate": 0 },
        { "date": "05-31", "returnRate": 25.8 }
      ]
    }
  ]
}
```

- DB: `competition_snapshots` — `entry_id`별 시계열, 수익률 상위 5 `entry`의 `nickname`(`users`, 익명 처리)

**POST join → DB**

| 단계 | 테이블 |
|------|--------|
| 검증 | `competitions`, `accounts`, `competition_entries` UNIQUE |
| INSERT | `competition_entries` (`entry_value`, `current_value`, `return_rate`) |
| 선택 | `competition_snapshots` 참가일 1건 |

---

### 5.8 관리자 화면

별도 `/admin/*` API 없음.

| 화면 | API | 권한 |
|------|-----|------|
| `AdminCompetitionsPage` | `GET /api/competitions` (query `status` 생략) | JWT `role=admin` (`AdminRoute`) |

대회 CRUD는 UI·API 모두 Phase 2.

---

## 6. 데이터베이스 (SQLite)

> ERD·쿼리 패턴: [db.md](./db.md)  
> ORM: `backend/app/models/` · 마이그레이션: `alembic/versions/001_initial_schema.py`  
> 검증: `python -m scripts.verify_db` (12테이블 + 시드 행 수)

### 6.1 테이블 개요 (12개)

| # | 테이블 | 용도 | 프론트 타입/필드 |
|---|--------|------|------------------|
| 1 | `users` | 인증·프로필 | `User` |
| 2 | `accounts` | 계좌 | `Account` |
| 3 | `holdings` | 보유종목 | `Holding` |
| 4 | `trades` | 매매 | `Trade` |
| 5 | `account_snapshots` | 수익률 차트 | `PerformancePoint[]` |
| 6 | `journals` | 일지 본문 | `Journal` (일부 필드) |
| 7 | `journal_tags` | 태그 | `Journal.tags[]` |
| 8 | `journal_stocks` | 관련 종목 | `Journal.stockCodes[]` (+ name) |
| 9 | `journal_trades` | 일지↔매매 | `Journal.tradeIds[]` |
| 10 | `competitions` | 대회 | `Competition` (일부 필드) |
| 11 | `competition_entries` | 참가·순위 | `LeaderboardEntry` (조합) |
| 12 | `competition_snapshots` | 대회 차트 | `CompetitionChartSeries` |

**미구현:** `journal_images` (업로드 UI 없음)

### 6.2 API 전용 필드 (DB 컬럼 없음)

서비스·집계로만 채우며, `types/index.ts`와 응답 JSON에 포함한다.

| 타입 | 필드 | 산출 방식 |
|------|------|-----------|
| `Account` (+목록) | `currentValue`, `profitLoss`, `returnRate` | §6.4 계산식 |
| `AccountWithStats` | `holdings`, `trades` | 관계 조회 |
| `Competition` | `participantCount` | `COUNT(competition_entries)` |
| `Competition` | `isJoined` | 현재 user의 entry 존재 여부 |
| `DashboardSummary` | `accountSummaries` 등 | 여러 테이블 집계 |
| `DashboardSummary` | `totalValue` 등 | §6.6 계산 |
| `AccountWithStats` (상세) | `performance[]` | `account_snapshots` |
| `Journal` (상세) | `linkedTrades[]` | `journal_trades` → `trades` |
| `LeaderboardEntry` | `rank`, `nickname`, `isMe` | `RANK()` + users |

### 6.3 컬럼 ↔ camelCase 매핑

DB는 `snake_case`, API·프론트는 `camelCase` (Pydantic `alias`).

| 테이블 | DB 컬럼 | API 필드 |
|--------|---------|----------|
| users | `password_hash` | *(응답 제외)* |
| users | `show_nickname_public` | `showNicknamePublic` |
| users | `created_at`, `updated_at` | `createdAt`, `updatedAt` |
| accounts | `user_id`, `initial_capital`, `cash_balance` | `userId`, `initialCapital`, `cashBalance` |
| holdings | `account_id`, `stock_code`, `stock_name`, `avg_price`, `current_price` | `accountId`, `stockCode`, `stockName`, `avgPrice`, `currentPrice` |
| trades | `trade_type`, `realized_pnl`, `traded_at` | `tradeType`, `realizedPnl`, `tradedAt` |
| account_snapshots | `snapshot_date`, `total_value`, `return_rate` | `date`, `totalValue`, `returnRate` |
| journals | `journal_date`, `account_id` | `journalDate`, `accountId` |
| competitions | `start_date`, `end_date`, `min_initial_capital`, `max_participants` | `startDate`, `endDate`, `minInitialCapital`, `maxParticipants` |
| competition_entries | `entry_value`, `current_value`, `return_rate`, `joined_at` | `entryValue`, `currentValue`, `returnRate`, `joinedAt` |

**일지 집계:** `Journal.tags` ← `journal_tags.tag`, `stockCodes` ← `journal_stocks.stock_code`, `tradeIds` ← `journal_trades.trade_id`.  
작성 시 `stockCodes`만 오면 `journal_stocks`에 code 저장, `stock_name`은 요청·보유종목·매매에서 보완.

### 6.4 테이블 정의 요약

#### users

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | INTEGER | PK |
| nickname | VARCHAR(20) | UNIQUE, NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| role | VARCHAR(20) | `user` \| `admin`, default `user` |
| show_nickname_public | BOOLEAN | default TRUE |
| created_at, updated_at | DATETIME | NOT NULL |

#### accounts

| 컬럼 | 타입 | 제약 |
|------|------|------|
| user_id | INTEGER | FK → users, ON DELETE CASCADE |
| name | VARCHAR(50) | NOT NULL |
| broker | VARCHAR(50) | NOT NULL (`BROKERS` 상수와 동일 문자열) |
| initial_capital | NUMERIC(18,2) | NOT NULL, 생성 후 변경 불가 |
| cash_balance | NUMERIC(18,2) | NOT NULL, 생성 시 = initial_capital |
| description | TEXT | NULL |

인덱스: `idx_accounts_user_id`

#### holdings

| 컬럼 | 타입 | 제약 |
|------|------|------|
| account_id | INTEGER | FK → accounts, CASCADE |
| stock_code | VARCHAR(6) | UNIQUE(account_id, stock_code) |
| stock_name | VARCHAR(100) | NOT NULL |
| quantity | INTEGER | NOT NULL, ≥0 |
| avg_price, current_price | NUMERIC(18,2) | NOT NULL |

#### trades

| 컬럼 | 타입 | 제약 |
|------|------|------|
| trade_type | VARCHAR(4) | `buy` \| `sell` |
| quantity | INTEGER | >0 (앱 검증) |
| price, fee, tax | NUMERIC(18,2) | fee/tax default 0 |
| realized_pnl | NUMERIC(18,2) | NULL (매도 시 설정) |
| traded_at | DATETIME | NOT NULL |
| memo | TEXT | NULL |

인덱스: `account_id`, `traded_at`, `stock_code`, `(account_id, traded_at)`

#### account_snapshots

| 컬럼 | 타입 | 제약 |
|------|------|------|
| snapshot_date | DATE | UNIQUE(account_id, snapshot_date) |
| total_value, return_rate, cash_balance | NUMERIC | NOT NULL |

당일 매매·현재가 변경 시 upsert (서비스 레이어).

#### journals · journal_tags · journal_stocks · journal_trades

- `journals.account_id` → accounts, **ON DELETE SET NULL**
- `emotion`: `confident`, `anxious`, `fomo`, `calm`, `greedy`, `fearful` (`EMOTIONS` 상수)
- `journal_trades`: 복합 PK `(journal_id, trade_id)`, trade 삭제 시 CASCADE

#### competitions · competition_entries · competition_snapshots

- `competitions.status`: `upcoming` \| `active` \| `ended`
- `competition_entries`: UNIQUE(competition_id, user_id), UNIQUE(competition_id, account_id)
- `accounts.id` 참가 시 **ON DELETE RESTRICT** (참가 중 계좌 삭제 400)
- `competition_snapshots`: UNIQUE(entry_id, snapshot_date)

### 6.5 ER 관계 (삭제 정책)

```
users ──CASCADE──> accounts ──CASCADE──> holdings, trades, account_snapshots
users ──CASCADE──> journals ──CASCADE──> journal_tags, journal_stocks, journal_trades
users ──CASCADE──> competition_entries
accounts ──SET NULL──> journals.account_id
accounts ──RESTRICT──> competition_entries.account_id
competitions ──CASCADE──> competition_entries, competition_snapshots
trades ──CASCADE──> journal_trades
```

### 6.6 핵심 계산식 (서비스 레이어, DB 저장 아님)

```
holdingsValue = Σ(quantity × current_price)
currentValue  = cash_balance + holdingsValue
profitLoss    = currentValue - initial_capital
returnRate    = (profitLoss / initial_capital) × 100   // initial_capital > 0

대회 entry.return_rate = (current_value - entry_value) / entry_value × 100
```

- `current_price`: `holdings.current_price` 수동 입력 (시세 API 없음)
- 프론트 `calcAccountStats`와 동일 식 (`frontend/src/utils/index.ts`)
- **시드·스냅샷:** `total_value` = 해당 시점 `cash_balance` + 보유 평가액과 일치해야 함 (2026-06-01 검토 시 계좌별 cash 수정 반영)

### 6.7 프론트 Mock ↔ DB 정합성 (검토 결과)

| 항목 | 상태 |
|------|------|
| 12테이블 스키마 vs `types/index.ts` | 일치 |
| 시드 데이터 구조 vs `dataStore.ts` Mock | 일치 (계좌·보유·매매·일지·대회 3건) |
| `journal_images` | 미구현 (의도적) |
| 시드 `cash_balance` vs 스냅샷 `total_value` | **수정함** (이전 Mock은 평가액 12.5%와 cash+holdings 불일치) |
| 시드 매매 이력 vs 보유 수량 | 데모용 정적 데이터(매도 10주 기록·보유 50주). **운영 시 `trade_service`가 보유·현금 동기화** |
| `JournalFormPage` | UI에서 `stockCodes`/`tradeIds` 미입력 → DB에는 빈 배열로 저장 가능 (추후 폼 확장) |

### 6.8 마이그레이션·시드

```bash
cd backend
python -m scripts.db_setup    # alembic upgrade head + seed
python -m scripts.verify_db   # 12 tables 검증
```

- DB 파일: `backend/managestock.db` (dev, `DATABASE_URL=sqlite:///./managestock.db`)
- 시드 재적용: 기존 `test@gmail.com` 있으면 스킵 → 초기화 시 DB 파일 삭제 후 `db_setup` 재실행

---

## 7. 비즈니스 규칙 요약

| 규칙 | |
|------|--|
| 리소스 소유권 | `account`, `journal` 등은 `user_id` 일치 필수 |
| 계좌 삭제 | cascade: holdings, trades, snapshots |
| 대회 참가 중 계좌 | 삭제 시 400 또는 참가 선행 해제 |
| 매도 수량 | 보유 부족 시 400 |
| 리더보드 | `return_rate` DESC, `RANK()` |
| 테스트 계정 | 시드로 `test@gmail.com` / bcrypt(`123`) |

---

## 8. 에러 응답

```json
{ "detail": "메시지" }
```

| Code | 용도 |
|------|------|
| 400 | 검증·비즈니스 규칙 |
| 401 | 미인증 |
| 403 | 권한 없음 (admin 등) |
| 404 | 없음 |
| 409 | 이메일·닉네임·대회 중복 참가 |
| 422 | Pydantic 검증 |

---

## 9. 개발 우선순위

프론트 Mock 제거 순서:

| Phase | API | 프론트 교체 대상 |
|-------|-----|------------------|
| **P0** | `auth`, `accounts` (+ holdings/trades POST, 상세에 `performance`) | 로그인·계좌·매매 |
| **P1** | `dashboard`, `journals` | 대시보드·일지 |
| **P2** | `competitions` (+ join, leaderboard, chart) | 경연 대회 |
| **P3** | 시드·통합 테스트 | `GET /competitions` 관리자 테이블 포함 |

각 Phase 완료 시 `frontend/src/api/` 모듈 추가 및 Zustand → TanStack Query 전환.

---

## 10. 시드 데이터 (`scripts/seed.py`)

실행: `python -m scripts.seed` (또는 `alembic upgrade` 후 자동)

| 데이터 | 내용 |
|--------|------|
| 사용자 | `test@gmail.com` / `123`, admin |
| 계좌 | Mock 2건 (키움·KB) |
| 보유·매매 | Mock와 동일 |
| 일지 | Mock 3건 |
| 대회 | Mock 3건 (active/upcoming/ended) |
| 대회 참가 | test 유저 → Q2 대회 |

---

## 11. 테스트

```bash
cd backend
pytest -v
```

| 필수 시나리오 | |
|---------------|--|
| test@gmail.com 로그인 | |
| 계좌 CRUD + 타 user 403 | |
| 매수 → holdings 갱신 | |
| 매도 수량 초과 400 | |
| 일지 tags/tradeIds 저장 | |
| 대회 join + leaderboard | |
| dashboard summary 필드 | |

- DB: `sqlite:///:memory:` 또는 임시 파일

---

## 12. 실행

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload --port 8000
```

또는 프로젝트 루트: `npm start`

---

## 13. 프론트 연동 체크리스트

- [ ] `VITE_API_URL=http://localhost:8000`
- [ ] `VITE_USE_MOCK=false`
- [ ] Axios `Authorization: Bearer`
- [ ] 응답 camelCase ↔ `types/index.ts` 일치
- [ ] 401 시 로그아웃 → `/login`
- [ ] 로그인 성공 → `/` (랜딩)

---

## 14. requirements.txt

```
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
sqlalchemy>=2.0.0
alembic>=1.13.0
pydantic[email]>=2.0.0
pydantic-settings>=2.0.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.9
httpx>=0.27.0
pytest>=8.0.0
pytest-asyncio>=0.23.0
```

---

## 15. 문서 변경 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 2.2.0 | 2026-06-01 | API 명세 검증: 프론트·DB 대조, 23엔드포인트로 최적화, `performance`·`linkedTrades`·`accountSummaries` 반영 |
| 2.1.0 | 2026-06-01 | DB 종합 검토: §6 스키마·매핑·정합성 문서화, 시드 cash_balance 수정, db.md 12테이블 정렬 |
| 2.0.0 | 2026-05-31 | 프론트엔드 구현 기준 재정의, SQLite dev/prod 통일, UI 없는 기능 제외 |
| 1.0.0 | 2026-05-31 | 초안 |
