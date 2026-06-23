# 프론트엔드 현황 명세서 (front.md)

> **최종 업데이트:** 2026-06-20  
> **상태:** 구현 완료 · 프로덕션 배포됨 (`https://bullslong.com`)

---

## 1. 개요

### 1.1 프로젝트명
**BULLSLONG** — 주식 계좌 관리 · 매매일지 · 수익률 경연 대회 플랫폼

### 1.2 기술 스택 (실제 버전)

| 구분 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | React | 19.2.6 |
| 빌드 도구 | Vite | 8.0.12 |
| 언어 | TypeScript | 6.0.2 |
| 라우팅 | React Router | v7 |
| 서버 상태 | TanStack Query | v5 |
| 클라이언트 상태 | Zustand | v5 |
| HTTP 클라이언트 | Axios | v1 |
| UI 컴포넌트 | Radix UI + Tailwind CSS v4 | |
| 차트 | Recharts | v3 |
| 폼 | React Hook Form v7 + Zod v4 | |
| 날짜 | date-fns | v4 |
| 아이콘 | Lucide React | |

### 1.3 빌드 산출물

```
frontend/dist/
├── index.html                    # 0.45 kB
├── assets/
│   ├── index-BLgugZSx.css        # 36.56 kB (gzip 7.24 kB)
│   └── index-cs99C5NI.js         # 906.89 kB (gzip 274.02 kB)
├── favicon.svg
└── icons.svg
```

빌드 명령: `cd frontend && npm run build`  
서빙: Nginx `/var/www/bullslong/frontend/dist`

---

## 2. 디렉터리 구조 (실제)

```
frontend/src/
├── api/
│   ├── client.ts          # Axios 인스턴스 (baseURL, 인터셉터)
│   └── index.ts           # 도메인별 API 함수 (authApi, accountsApi, …)
├── components/
│   ├── features/
│   │   ├── accounts/      # AccountFormModal, HoldingsTabPanel, TradesTabPanel
│   │   │                  # TradePnlChartPanel, TradeFormModal, AccountMarketFlags
│   │   ├── competitions/  # AccountCompetitionPanel, CompetitionScoringGuide
│   │   └── journal/       # JournalStockChartPanel, CandlestickLayer
│   │                      # StockSearchField, useJournalStockChart
│   ├── layout/
│   │   ├── Layout.tsx          # 공통 레이아웃 (헤더, 사이드바)
│   │   ├── AdminLayout.tsx     # 관리자 레이아웃
│   │   ├── DataBootstrap.tsx   # 초기 데이터 로드
│   │   └── RouteGuards.tsx     # ProtectedRoute, GuestRoute, AdminProtectedRoute
│   └── ui/                # Button, Card, Badge, Dialog, Input, Tabs, StatCard 등
├── hooks/
│   ├── useDailyPrices.ts   # 일별 주가 데이터 훅
│   └── useDerivedData.ts   # 파생 계산 훅
├── lib/
│   ├── env.ts              # VITE_API_URL, VITE_USE_MOCK
│   ├── accountStats.ts     # 계좌 통계 계산
│   ├── holdingsDisplay.ts  # 보유종목 표시 로직
│   ├── tradesLedger.ts     # 매매 내역 처리
│   ├── journalStockChart.ts # 차트 데이터 변환
│   ├── brokerMarketUi.ts   # 증권사·시장 UI 매핑
│   ├── marketLabels.ts     # 시장 코드 → 레이블
│   └── apiError.ts         # API 에러 처리
├── pages/
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── AccountsPage.tsx
│   ├── AccountDetailPage.tsx
│   ├── JournalListPage.tsx
│   ├── JournalFormPage.tsx
│   ├── JournalDetailPage.tsx
│   ├── JournalChartPage.tsx      # 종목 차트 + 매매일지 마커
│   ├── CompetitionsPage.tsx
│   ├── CompetitionDetailPage.tsx
│   ├── ProfilePage.tsx
│   └── admin/
│       ├── AdminLoginPage.tsx
│       ├── AdminDashboardPage.tsx
│       ├── AdminUsersPage.tsx
│       ├── AdminJournalsPage.tsx
│       └── AdminCompetitionsPage.tsx
├── stores/
│   ├── authStore.ts    # Zustand — JWT 토큰, 사용자 정보
│   └── dataStore.ts    # Zustand — 공유 UI 상태
├── types/
│   ├── index.ts        # 전체 도메인 타입
│   └── admin.ts        # 관리자 전용 타입
└── utils/
    └── index.ts        # 공통 유틸리티
```

---

## 3. 라우팅 구조 (실제 구현)

```
/                              LandingPage           — 비로그인 공개
/login                         LoginPage             — GuestRoute
/register                      RegisterPage          — GuestRoute
/dashboard                     → /accounts 리다이렉트
/accounts                      AccountsPage          — ProtectedRoute
/accounts/:id                  AccountDetailPage     — ProtectedRoute
/journal                       JournalListPage       — ProtectedRoute
/journal/chart/:stockCode      JournalChartPage      — ProtectedRoute
/competitions                  CompetitionsPage      — ProtectedRoute
/competitions/:id              CompetitionDetailPage — ProtectedRoute
/profile                       ProfilePage           — ProtectedRoute
/admin                         AdminLoginPage        — AdminEntryRoute
/admin/dashboard               AdminDashboardPage    — AdminProtectedRoute
/admin/users                   AdminUsersPage        — AdminProtectedRoute
/admin/journals                AdminJournalsPage     — AdminProtectedRoute
/admin/competitions            AdminCompetitionsPage — AdminProtectedRoute
```

### 라우트 가드 종류

| 가드 | 조건 | 리다이렉트 |
|------|------|-----------|
| `GuestRoute` | token 있으면 | `/accounts` |
| `ProtectedRoute` | token 없으면 | `/login` |
| `AdminEntryRoute` | admin token 있으면 | `/admin/dashboard` |
| `AdminProtectedRoute` | role != admin | `/admin` |

---

## 4. 구현된 페이지 상세

### 4.1 랜딩 (`/`)
- 서비스 소개 (히어로, 기능 설명)
- 로그인/회원가입 버튼

### 4.2 인증 (`/login`, `/register`)
- 로그인: 이메일 + 비밀번호 → JWT 저장 (localStorage)
- 회원가입: 닉네임 + 이메일 + 비밀번호 (+ 확인)
- 401 시 자동 로그아웃 + `/login` 리다이렉트 (Axios 인터셉터)

### 4.3 계좌 목록 (`/accounts`)
- 카드 그리드: 계좌명, 증권사, 초기자본, 현재평가, 수익률
- **수동 계좌 추가** 모달 (AccountFormModal)
- **API 연동 계좌 추가** 모달: 증권사 선택 → KIS App Key/Secret 입력
  - 국내 동기화 여부, 미국 거래소 선택 (NASD/NYSE/AMEX)
- 계좌 삭제 (대회 참가 중이면 400 차단)

### 4.4 계좌 상세 (`/accounts/:id`)
- 헤더: 계좌 정보, 수익률 배지, 동기화 버튼
- **탭 1 — 보유종목**: 종목코드, 종목명, 수량, 평균단가, 현재가, 평가손익, 수익률
  - 수동 계좌: 종목 추가/수정 가능
  - API 계좌: 동기화 전용
  - 국내/미국 시장 구분 (market_type 필드)
- **탭 2 — 매매내역**: 클라이언트 사이드 필터 (기간, 종목, 매수/매도)
  - 수동 계좌: 매매 등록 (TradeFormModal)
  - API 계좌: KIS 기간별 체결 가져오기 (fromDate~toDate)
- **탭 3 — 수익률 차트**: 일별 수익률 Line Chart (TradePnlChartPanel)
- AccountMarketFlags: 계좌 연동 시장 아이콘 표시

### 4.5 매매일지 (`/journal`)
- 목록: 카드 형태, 날짜·종목·제목·감정 태그 표시
- 작성/수정 (JournalFormPage): 제목, 날짜, 연결 계좌, 관련 종목, 태그, 본문, 반성, 감정
- 상세 (JournalDetailPage): 연결된 매매 내역 표시
- **종목 차트** (`/journal/chart/:stockCode`, JournalChartPage)
  - FinanceDataReader 기반 일별 OHLCV 캔들스틱 차트
  - 해당 종목의 매매일지 항목(JournalEntry)을 차트 위에 마커로 표시
  - 매매일지 항목 CRUD (StockSearchField, CandlestickLayer)

### 4.6 경연 대회 (`/competitions`, `/competitions/:id`)
- 목록: 상태별 (upcoming/active/ended) 카드
- 상세: 대회 정보, 리더보드, 수익률 추이 차트 (Top 5)
- 참가: 본인 계좌 선택 → `POST /competitions/:id/join`
- 내 참가 현황 패널 (AccountCompetitionPanel)
- 대회 점수 안내 (CompetitionScoringGuide)

### 4.7 프로필 (`/profile`)
- 닉네임 수정, 리더보드 공개 설정
- 회원 탈퇴

### 4.8 관리자 (`/admin/*`)
- 로그인: 어드민 전용 이메일/비밀번호
- 대시보드: 전체 통계 (사용자 수, 계좌 수, 일지 수, 대회 수)
- 사용자 목록: 이메일, 닉네임, 가입일, 삭제
- 일지 목록: 전체 일지 조회, 삭제
- 대회 관리: 대회 생성·수정·참가자 관리

---

## 5. API 연동

### 5.1 Axios 설정

```typescript
// frontend/src/api/client.ts
baseURL: `${VITE_API_URL}/api`   // VITE_API_URL이 비어있으면 상대경로 /api
// 요청: Authorization: Bearer {token}
// 응답 401: logout() + /login 리다이렉트
```

### 5.2 API 모듈 (frontend/src/api/index.ts)

| 모듈 | 함수 |
|------|------|
| `authApi` | register, login, me, updateMe, deleteMe |
| `dashboardApi` | summary |
| `brokersApi` | list |
| `accountsApi` | list, get, create, connect, sync, update, delete, upsertHolding, addTrade, importTrades |
| `journalsApi` | list, get, create, update, delete |
| `journalEntriesApi` | list, create, update, delete |
| `competitionsApi` | list, get, join, leave, leaderboard, chart, myEntries |
| `marketApi` | searchStocks, getDailyPrices |
| `adminApi` | stats, users, deleteUser, journals, deleteJournal |

### 5.3 환경 변수

| 변수 | 프로덕션 값 | 설명 |
|------|------------|------|
| `VITE_API_URL` | `""` (빈 값 → 동일 도메인) | 백엔드 URL |
| `VITE_APP_NAME` | `BULLSLONG` | 앱 이름 |
| `VITE_USE_MOCK` | `false` | Mock 모드 (개발용) |

---

## 6. UI/UX 가이드

### 6.1 수익률 표시 규칙
- 양수: `+12.34%`, 녹색
- 음수: `-5.67%`, 빨간색
- 금액: `₩1,234,567` (천 단위 콤마)

### 6.2 반응형
- Mobile: `< 768px` (햄버거 메뉴)
- Desktop: `≥ 768px` (고정 사이드바)
