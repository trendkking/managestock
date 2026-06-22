# MANAGESTOCK 프로젝트 가이드 (guide.md)

> **최종 업데이트:** 2026-06-20  
> **프로덕션:** https://bullslong.com  
> **서버:** AWS EC2 (ap-northeast-2, Amazon Linux 2023)

---

## 1. 문서 안내

| 문서 | 파일 | 내용 |
|------|------|------|
| **전체 가이드** | `guide.md` | 아키텍처, 배포 현황, 실행 방법 |
| **프론트엔드 명세** | [front.md](./front.md) | 구현된 페이지·컴포넌트·API 연동 |
| **백엔드 명세** | [backend.md](./backend.md) | REST API, 서비스 로직, 서버 설정 |
| **DB 설계 명세** | [db.md](./db.md) | 테이블 구조, 마이그레이션 이력 |

---

## 2. 프로젝트 개요

**MANAGESTOCK** — 개인 투자자를 위한 주식 계좌 관리 · 매매일지 · 수익률 경연 대회 플랫폼

| 기능 | 설명 |
|------|------|
| 계좌 관리 | 수동 계좌 등록 또는 KIS(한국투자증권) API 자동 연동 |
| 매매 내역 | 매수/매도 수동 등록 또는 KIS 체결 내역 자동 가져오기 |
| 매매일지 | Markdown 본문, 태그·감정·관련 종목 기록 |
| 종목 차트 | 캔들스틱 + 매매일지 마커 오버레이 |
| 경연 대회 | 기간별 수익률 순위 경쟁, 리더보드 |
| 관리자 | 사용자·일지·대회 관리 |

---

## 3. 기술 스택

```
┌──────────────────────────────────────────────┐
│          Browser (React 19 SPA)              │
│  Vite 8 · TypeScript 6 · React Router v7    │
│  TanStack Query · Zustand · Tailwind CSS v4 │
└──────────────────┬───────────────────────────┘
                   │ HTTPS (Nginx 리버스 프록시)
┌──────────────────▼───────────────────────────┐
│         FastAPI (Python 3.11)                │
│  SQLAlchemy 2.0 · Alembic · Uvicorn          │
│  python-jose · bcrypt · cryptography        │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│         SQLite 3 (WAL 모드)                  │
│  /var/www/bullslong/backend/data/            │
└──────────────────────────────────────────────┘
```

---

## 4. 프로젝트 구조

```
/var/www/bullslong/
├── frontend/
│   ├── src/                 # React 소스
│   ├── dist/                # 빌드 산출물 (Nginx 서빙)
│   ├── package.json
│   ├── vite.config.ts
│   └── .env                 # VITE_API_URL="" (동일 도메인)
├── backend/
│   ├── app/                 # FastAPI 앱
│   ├── alembic/             # DB 마이그레이션
│   ├── data/
│   │   └── managestock.db   # 프로덕션 SQLite DB
│   ├── venv/                # Python 가상환경
│   ├── requirements.txt
│   └── .env                 # 프로덕션 환경 변수
├── guide.md
├── front.md
├── backend.md
└── db.md
```

---

## 5. 프로덕션 배포 현황

### 5.1 서버 구성

| 구성요소 | 내용 |
|----------|------|
| 서버 | AWS EC2 (ap-northeast-2) |
| OS | Amazon Linux 2023 |
| 도메인 | bullslong.com (Route 53 → EC2 공인 IP `13.209.46.108`) |
| SSL | Let's Encrypt (Certbot, 자동 갱신) |
| 웹 서버 | Nginx 1.30.2 |
| 백엔드 | Uvicorn (workers=2), systemd 관리 |
| DB | SQLite 3 (WAL 모드) |

### 5.2 Nginx 설정 (`/etc/nginx/nginx.conf`)

```nginx
server {
    listen 443 ssl;  listen [::]:443 ssl;  http2 on;
    server_name bullslong.com www.bullslong.com;

    ssl_certificate     /etc/letsencrypt/live/bullslong.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bullslong.com/privkey.pem;

    root  /var/www/bullslong/frontend/dist;
    index index.html;

    # SPA 라우팅
    location / { try_files $uri $uri/ /index.html; }

    # FastAPI 프록시
    location /api/ { proxy_pass http://127.0.0.1:8000; }
    location /health { proxy_pass http://127.0.0.1:8000; }
    location /docs   { proxy_pass http://127.0.0.1:8000; }
}

server {
    listen 80;  listen [::]:80;
    server_name bullslong.com www.bullslong.com;
    return 301 https://bullslong.com$request_uri;
}
```

### 5.3 systemd 서비스

```bash
# 상태 확인
sudo systemctl status managestock-backend
sudo systemctl status nginx

# 재시작
sudo systemctl restart managestock-backend
sudo systemctl reload nginx

# 로그 확인
sudo journalctl -u managestock-backend -f
sudo tail -f /var/log/nginx/error.log
```

### 5.4 헬스체크

```bash
curl https://bullslong.com/health
# → {"status":"ok"}
```

---

## 6. 로컬 개발 환경 설정

### 6.1 사전 요구사항

| 도구 | 버전 |
|------|------|
| Node.js | 20 LTS 이상 |
| Python | 3.11 이상 |
| Git | 2.x |

### 6.2 백엔드 실행

```bash
cd backend

# 가상환경 생성 (최초 1회)
python3.11 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install -r requirements.txt

# .env 설정 (.env.example 참고)
cp .env.example .env
# SECRET_KEY, DATABASE_URL 등 수정

# DB 마이그레이션
alembic upgrade head

# 서버 실행
uvicorn app.main:app --reload --port 8000
```

확인: http://localhost:8000/health

### 6.3 프론트엔드 실행

```bash
cd frontend

npm install

# .env 설정
cp .env.example .env
# VITE_API_URL=http://localhost:8000

npm run dev
```

확인: http://localhost:5173

### 6.4 환경 변수

**backend/.env (로컬)**
```env
APP_ENV=development
DATABASE_URL=sqlite:///./managestock.db
SECRET_KEY=dev-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173
UPLOAD_DIR=./uploads
SQLITE_WAL=true
KIS_USE_VIRTUAL=false
```

**frontend/.env (로컬)**
```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=MANAGESTOCK
VITE_USE_MOCK=false
```

---

## 7. 프로덕션 배포 방법 (업데이트 시)

### 자동 배포 (권장)

`main` 브랜치에 push하면 GitHub Actions가 테스트 후 EC2에 배포합니다.  
설정: [deploy/README.md](deploy/README.md)

### 수동 배포

```bash
# 1. 코드 반영
cd /var/www/bullslong
git pull

# 또는 배포 스크립트 한 번에
bash scripts/deploy.sh
```

```bash
# 2. 프론트엔드 빌드
cd frontend
npm install
npm run build
cd ..

# 3. Nginx 리로드 (정적 파일 반영)
sudo systemctl reload nginx

# 4. 백엔드 의존성 추가 시
cd backend
venv/bin/pip install -r requirements.txt

# 5. DB 마이그레이션 (스키마 변경 시)
venv/bin/alembic upgrade head

# 6. 백엔드 재시작 (코드 변경 시)
sudo systemctl restart managestock-backend
```

---

## 8. 핵심 비즈니스 규칙

### 8.1 계좌·매매

| 규칙 | 설명 |
|------|------|
| 초기 현금 | 계좌 생성 시 `cash_balance = initial_capital` |
| 매수 | 현금 차감, 보유종목 수량·가중평균 단가 갱신 |
| 매도 | 보유 수량 초과 시 400 오류 |
| 평가금액 | `cash_balance + Σ(quantity × current_price)` |
| 수익률 | `(평가금액 - initial_capital) / initial_capital × 100` |

### 8.2 KIS API 연동

| 항목 | 내용 |
|------|------|
| App Key/Secret | Fernet 암호화 → `account_credentials` 저장 |
| 동기화 | `/accounts/{id}/sync` → 잔고·보유종목 갱신 |
| 체결 가져오기 | `/accounts/{id}/trades/import` (날짜 범위) |
| 모의투자 | `KIS_USE_VIRTUAL=true` 설정 |

### 8.3 경연 대회

| 규칙 | 설명 |
|------|------|
| 참가 자격 | 본인 소유 계좌, 1인 1대회 1계좌 |
| 기준금액 | 참가 시점 `entry_value` 고정 |
| 대회 수익률 | `(current_value - entry_value) / entry_value × 100` |
| 입출금 보정 | `account_cash_flows` 기록 → Modified Dietz 방식 |
| 상태 | `upcoming → active → ended` |

---

## 9. API 개요

Base URL: `https://bullslong.com/api`  
Swagger: `https://bullslong.com/docs`

| 그룹 | Prefix | 설명 |
|------|--------|------|
| 인증 | `/auth` | register, login, me |
| 계좌 | `/accounts` | CRUD, sync, holdings, trades |
| 증권사 | `/brokers` | 지원 증권사 목록 |
| 일지 | `/journals` | CRUD |
| 일지 항목 | `/journal-entries` | 차트 마커용 |
| 대회 | `/competitions` | list, join, leaderboard |
| 대시보드 | `/dashboard` | summary |
| 시장 | `/market` | 종목 검색, 일별 주가 |
| 관리자 | `/admin` | 통계, 사용자, 일지 관리 |

---

## 10. 테스트

```bash
# 백엔드 단위·통합 테스트
cd backend
venv/bin/pytest -v
venv/bin/pytest --cov=app --cov-report=term-missing

# 프론트엔드 빌드 타입 검사
cd frontend
npm run build    # tsc -b 포함
```

### 수동 통합 테스트 체크리스트

- [ ] 회원가입 → 로그인
- [ ] 수동 계좌 생성 (초기자본 1,000만)
- [ ] 종목 매수 등록
- [ ] 보유종목 확인 + 수익률 표시
- [ ] KIS 계좌 연동 (App Key/Secret 입력)
- [ ] KIS 잔고 동기화
- [ ] 매매일지 작성 + 종목 연결
- [ ] 종목 차트 + 매매일지 마커 확인
- [ ] 경연 대회 참가 → 리더보드 순위
- [ ] 관리자 로그인 → 대회 생성

---

## 11. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 502 Bad Gateway | 백엔드 다운 | `sudo systemctl restart managestock-backend` |
| CORS 오류 | Origin 미등록 | `backend/.env` CORS_ORIGINS에 도메인 추가 |
| 401 Unauthorized | 토큰 만료 | 재로그인 (24h 만료) |
| SQLite locked | 동시 쓰기 | WAL 모드 확인 (`SQLITE_WAL=true`) |
| KIS 동기화 실패 | 토큰 만료 | 자동 재발급, App Key/Secret 재확인 |
| 빌드 후 변경 미반영 | 브라우저 캐시 | `Ctrl+Shift+R` 강제 새로고침 |

---

## 12. 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-05-31 | 1.0.0 | 초기 명세 작성 |
| 2026-06-18 | 1.1.0 | 백엔드 FastAPI 구현 완료, DB 마이그레이션 001~010 |
| 2026-06-20 | 1.2.0 | AWS EC2 프로덕션 배포 완료 (bullslong.com, Nginx+SSL) |
