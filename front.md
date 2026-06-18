# 프론트엔드 명세서 (front.md)

## 1. 개요

### 1.1 프로젝트명
**MANAGESTOCK** — 주식 계좌 관리 · 매매일지 · 수익률 경연 대회 플랫폼

### 1.2 목적
사용자가 주식 계좌를 등록·관리하고, 매매 내역을 일지 형태로 기록하며, 다른 사용자와 수익률을 비교하는 경연 대회에 참가할 수 있는 웹 애플리케이션의 프론트엔드를 구현한다.

### 1.3 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | React 18+ |
| 빌드 도구 | Vite |
| 언어 | TypeScript |
| 라우팅 | React Router v6 |
| 상태 관리 | TanStack Query (서버 상태) + Zustand (클라이언트 UI 상태) |
| HTTP 클라이언트 | Axios |
| UI 라이브러리 | shadcn/ui + Tailwind CSS |
| 차트 | Recharts |
| 폼 | React Hook Form + Zod |
| 날짜 | date-fns |
| 아이콘 | Lucide React |

### 1.4 디렉터리 구조 (권장)

```
frontend/
├── public/
├── src/
│   ├── api/              # Axios 인스턴스, API 함수
│   ├── components/
│   │   ├── ui/           # shadcn 공통 컴포넌트
│   │   ├── layout/       # Header, Sidebar, Footer
│   │   └── features/     # 도메인별 컴포넌트
│   ├── hooks/
│   ├── pages/
│   ├── stores/           # Zustand
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 2. 사용자 역할 및 권한

| 역할 | 설명 | 접근 범위 |
|------|------|-----------|
| 비로그인 | 회원가입·로그인만 가능 | `/`, `/login`, `/register` |
| 일반 사용자 | 본인 계좌·일지·대회 참가 | 인증 필요 전 페이지 |
| 관리자 | 대회 생성·수정·참가자 관리 | `/admin/*` |

---

## 3. 화면 구성 (Sitemap)

```
/                          랜딩 (서비스 소개)
/login                     로그인
/register                  회원가입
/dashboard                 대시보드 (요약)
/accounts                  계좌 목록
/accounts/:id              계좌 상세
/accounts/:id/trades       매매 내역
/journal                   매매일지 목록
/journal/new               매매일지 작성
/journal/:id               매매일지 상세·수정
/competitions              경연 대회 목록
/competitions/:id          대회 상세·리더보드
/competitions/:id/join     대회 참가 (계좌 선택)
/profile                   내 프로필·설정
/admin/competitions        [관리자] 대회 관리
```

---

## 4. 페이지별 상세 명세

### 4.1 공통 레이아웃

#### Header
- 로고 → `/dashboard`
- 네비게이션: 대시보드, 계좌, 매매일지, 경연 대회
- 사용자 아바타 드롭다운: 프로필, 로그아웃
- 관리자일 경우 "관리" 메뉴 표시

#### Sidebar (데스크톱) / Drawer (모바일)
- 현재 섹션 하이라이트
- 반응형: `md` 이상 고정 사이드바, 미만 햄버거 메뉴

#### 공통 UX
- 로딩: Skeleton UI
- 에러: Toast + 재시도 버튼
- 빈 상태: 일러스트 + CTA 버튼
- 페이지네이션: 목록 20건 기본

---

### 4.2 인증 (`/login`, `/register`)

#### 로그인
| 필드 | 타입 | 검증 |
|------|------|------|
| 이메일 | email | 필수, 이메일 형식 |
| 비밀번호 | password | 필수, 8자 이상 |

- "로그인" 클릭 → `POST /api/auth/login`
- 성공 시 JWT를 `localStorage` 또는 `httpOnly cookie`(백엔드 정책에 따름) 저장
- `/dashboard` 리다이렉트
- "회원가입" 링크

#### 회원가입
| 필드 | 타입 | 검증 |
|------|------|------|
| 닉네임 | text | 필수, 2~20자, 중복 불가 |
| 이메일 | email | 필수, 중복 불가 |
| 비밀번호 | password | 필수, 8자 이상 |
| 비밀번호 확인 | password | 비밀번호 일치 |

- 성공 시 자동 로그인 또는 로그인 페이지 이동

---

### 4.3 대시보드 (`/dashboard`)

**목적:** 사용자 자산·수익·최근 활동 한눈에 표시

#### 위젯 구성
1. **자산 요약 카드**
   - 총 평가금액, 총 손익, 총 수익률(%)
   - 전일 대비 변동 (가능 시)

2. **계좌별 수익률 미니 차트** (Bar 또는 Pie)

3. **최근 매매 5건** 테이블
   - 종목명, 매수/매도, 수량, 일시

4. **참가 중인 대회** 카드
   - 대회명, 내 순위, 현재 수익률

5. **최근 매매일지 3건** 미리보기

#### API
- `GET /api/dashboard/summary`

---

### 4.4 계좌 관리 (`/accounts`, `/accounts/:id`)

#### 계좌 목록
- 카드 그리드: 계좌명, 증권사, 초기자본, 현재평가, 수익률
- "계좌 추가" 버튼 → 모달

**계좌 추가/수정 모달**
| 필드 | 타입 | 검증 |
|------|------|------|
| 계좌명 | text | 필수, 1~50자 |
| 증권사 | select | 필수 (KB, 미래에셋, NH, 기타 등) |
| 초기자본 | number | 필수, 0 이상 |
| 설명 | textarea | 선택 |

- `POST /api/accounts`, `PATCH /api/accounts/:id`
- 삭제: 확인 다이얼로그 → `DELETE /api/accounts/:id`

#### 계좌 상세
- 헤더: 계좌 정보 + 수익률 배지
- 탭: **보유종목** | **매매내역** | **수익률 차트**

**보유종목 탭**
- 테이블: 종목코드, 종목명, 수량, 평균단가, 현재가(수동입력), 평가손익, 수익률
- "종목 추가/수정" 모달

**매매내역 탭**
- 필터: 기간, 종목, 매수/매도
- 테이블 + "매매 등록" 버튼
- `GET /api/accounts/:id/trades`

**수익률 차트 탭**
- 일별/월별 수익률 Line Chart
- `GET /api/accounts/:id/performance`

---

### 4.5 매매 등록 (모달 또는 `/accounts/:id/trades/new`)

| 필드 | 타입 | 검증 |
|------|------|------|
| 종목코드 | text | 필수, 6자리 |
| 종목명 | text | 필수 |
| 유형 | select | 매수 / 매도 |
| 수량 | number | 필수, 양수 정수 |
| 단가 | number | 필수, 양수 |
| 수수료·세금 | number | 선택, 기본 0 |
| 매매일시 | datetime | 필수, 기본 현재 |
| 메모 | textarea | 선택 |

- 저장 시 보유종목·수익률 자동 갱신 (백엔드 처리)
- `POST /api/accounts/:id/trades`

---

### 4.6 매매일지 (`/journal`)

#### 목록
- 카드 또는 테이블: 제목, 작성일, 연결 계좌, 태그, 미리보기
- 검색: 제목·종목·태그
- 필터: 기간, 계좌
- `GET /api/journals?page=&limit=&q=`

#### 작성/수정 (`/journal/new`, `/journal/:id`)
| 필드 | 타입 | 검증 |
|------|------|------|
| 제목 | text | 필수, 1~100자 |
| 작성일 | date | 필수 |
| 연결 계좌 | select | 선택 |
| 관련 종목 | multi-select | 선택 |
| 태그 | tag input | 선택, 최대 10개 |
| 매매 근거 | rich text 또는 markdown | 필수 |
| 반성·교훈 | textarea | 선택 |
| 감정 상태 | select | 선택 (자신감, 불안, FOMO, 냉정 등) |
| 첨부 이미지 | file | 선택, jpg/png, 최대 5MB |

- Markdown 에디터 권장: `@uiw/react-md-editor` 또는 TipTap
- `POST /api/journals`, `PATCH /api/journals/:id`

#### 상세 (`/journal/:id`)
- 본문 렌더링 (Markdown → HTML)
- 연결된 매매 내역 링크
- 수정·삭제 버튼

---

### 4.7 경연 대회 (`/competitions`)

#### 대회 목록
- 탭: **진행 중** | **예정** | **종료**
- 카드: 대회명, 기간, 참가자 수, 내 참가 여부
- `GET /api/competitions?status=`

#### 대회 상세 (`/competitions/:id`)
1. **대회 정보**
   - 이름, 설명, 시작일~종료일, 규칙 요약
   - 참가 조건 (최소 초기자본 등)

2. **리더보드**
   - 순위, 닉네임, 수익률(%), 평가금액, 참가 계좌명
   - 내 순위 하이라이트
   - 정렬: 수익률 내림차순
   - `GET /api/competitions/:id/leaderboard`

3. **수익률 추이 차트**
   - Top 5 참가자 Line Chart (일별)
   - `GET /api/competitions/:id/chart`

4. **참가하기**
   - 참가 가능 계좌 선택 (해당 대회 미참가 계좌만)
   - `POST /api/competitions/:id/join`

#### 참가 규칙 (UI 표시)
- 대회 시작일 이후 매매만 반영 여부는 백엔드 정책 따름
- 1 사용자 · 1 대회 · 1 계좌 원칙

---

### 4.8 프로필 (`/profile`)

| 섹션 | 내용 |
|------|------|
| 기본 정보 | 닉네임, 이메일 (읽기 전용), 가입일 |
| 비밀번호 변경 | 현재·신규·확인 |
| 공개 설정 | 리더보드 닉네임 표시 여부 |
| 계정 삭제 | 확인 후 탈퇴 |

---

### 4.9 관리자 — 대회 관리 (`/admin/competitions`)

- 대회 CRUD 테이블
- 필드: 이름, 설명, 시작일, 종료일, 상태, 참가자 수
- 상태 수동 변경: 예정 → 진행 → 종료
- 참가자 목록 조회·제외

---

## 5. API 연동 규격 (프론트 관점)

### 5.1 Axios 설정

```typescript
// baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
// Request: Authorization: Bearer {token}
// Response 401: 토큰 삭제 → /login 리다이렉트
```

### 5.2 공통 응답 타입

```typescript
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ApiError {
  detail: string | { msg: string; type: string }[];
}
```

### 5.3 TanStack Query Key Convention

```
['accounts']
['accounts', accountId]
['accounts', accountId, 'trades', filters]
['journals', filters]
['journals', journalId]
['competitions', status]
['competitions', competitionId, 'leaderboard']
['dashboard', 'summary']
```

---

## 6. UI/UX 가이드

### 6.1 디자인 토큰

| 토큰 | 값 |
|------|-----|
| Primary | `#2563EB` (blue-600) |
| Success (수익) | `#16A34A` (green-600) |
| Danger (손실) | `#DC2626` (red-600) |
| Background | `#F8FAFC` |
| Card | `#FFFFFF` |
| Font | Pretendard 또는 Noto Sans KR |

### 6.2 수익률 표시 규칙
- 양수: `+12.34%`, 녹색
- 음수: `-5.67%`, 빨간색
- 0: `0.00%`, 회색
- 금액: `₩1,234,567` (천 단위 콤마)

### 6.3 반응형 Breakpoint
- Mobile: `< 768px`
- Tablet: `768px ~ 1024px`
- Desktop: `> 1024px`

---

## 7. 라우트 가드

```typescript
// ProtectedRoute: token 없으면 /login
// AdminRoute: role !== 'admin' 이면 /dashboard
// GuestRoute: token 있으면 /dashboard
```

---

## 8. 환경 변수

| 변수 | 설명 | 예시 |
|------|------|------|
| `VITE_API_URL` | 백엔드 API URL | `http://localhost:8000` |
| `VITE_APP_NAME` | 앱 이름 | `MANAGESTOCK` |

---

## 9. 비기능 요구사항

| 항목 | 기준 |
|------|------|
| 초기 로딩 | LCP < 2.5s (로컬) |
| 접근성 | 키보드 네비게이션, aria-label |
| 브라우저 | Chrome, Edge, Firefox 최신 2버전 |
| i18n | 1차 한국어, 구조만 i18n-ready |

---

## 10. 개발 우선순위 (MVP)

| Phase | 기능 |
|-------|------|
| P0 | 인증, 계좌 CRUD, 매매 등록, 보유종목·수익률 표시 |
| P1 | 매매일지 CRUD, 대시보드 |
| P2 | 경연 대회 목록·참가·리더보드 |
| P3 | 관리자 대회 관리, 차트 고도화, 이미지 첨부 |

---

## 11. 테스트

| 유형 | 도구 | 범위 |
|------|------|------|
| 단위 | Vitest | utils, hooks |
| 컴포넌트 | Testing Library | 폼 검증, 버튼 동작 |
| E2E | Playwright (선택) | 로그인 → 계좌 생성 → 매매 등록 |

---

## 12. 산출물

- [ ] React + Vite + TypeScript 프로젝트
- [ ] 위 Sitemap 전 페이지 구현
- [ ] API 연동 완료
- [ ] 반응형 UI
- [ ] README (실행 방법, env 설명)
