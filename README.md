# MANAGESTOCK

주식 계좌 관리 · 매매일지 · 수익률 경연 대회 플랫폼

## 원클릭 실행

프로젝트 루트에서 **아래 명령 하나만** 입력하세요.

```bash
npm start
```

자동으로 진행되는 작업:

1. Python 가상환경 생성 (최초 1회)
2. 백엔드 pip 패키지 설치
3. 프론트엔드 npm 패키지 설치
4. `.env` 파일 생성
5. **Alembic DB 마이그레이션** (`upgrade head`) + 시드 데이터
6. 기존 서버 프로세스 정리 (포트 5173, 8000)
7. 백엔드 + 프론트엔드 동시 실행
8. 서버 준비 완료 후 브라우저 자동 열기

| URL | 설명 |
|-----|------|
| http://localhost:5173 | 프론트엔드 |
| http://localhost:8000/docs | API 문서 |

**종료:** `Ctrl + C`

Windows 더블클릭: `start.bat`

### 한국투자증권 API 계좌 연동

1. **계좌** 페이지 → **계좌 추가** → **API 연동** 탭
2. 계좌번호(8자리), 상품코드(01 등), APP KEY / APP SECRET 입력 후 저장
3. **포함할 시장**에서 국내 주식·미국 주식(나스닥/뉴욕/아멕스)을 선택합니다. 한 계좌에 둘 다 있어도 한 번만 연동합니다.
4. 연동 직후 잔고·보유종목이 동기화됩니다. 상세 화면에서 **API 동기화**로 다시 불러올 수 있습니다.

- APP KEY/SECRET은 서버 DB에 **암호화** 저장되며 API 응답·프론트에는 노출되지 않습니다.
- 백엔드 `backend/.env`: `KIS_USE_VIRTUAL=false`(실전, 기본) / `true`(모의투자 VTS)
- API 연동 계좌는 수동 **종목 추가·매매 등록**이 비활성화됩니다 (증권사 데이터 기준).

### 사전 요구사항

- Node.js 20+ (https://nodejs.org)
- Python 3.11+ (https://python.org)

---

## 수동 실행 (개별)

<details>
<summary>프론트엔드만</summary>

```bash
cd frontend
npm install
npm run dev
```

</details>

<details>
<summary>백엔드만</summary>

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload --port 8000
```

</details>

<details>
<summary>DB 마이그레이션만</summary>

```bash
npm run db:migrate
```

또는 `cd backend` 후 `python -m scripts.db_setup`

</details>

---

## 프로젝트 구조

```
MANAGESTOCK/
├── start.bat         ← 더블클릭 원클릭 실행 (Windows)
├── start.ps1         ← PowerShell 원클릭 실행
├── package.json      ← npm start
├── scripts/
│   ├── setup.mjs     # 패키지 설치·환경 설정
│   └── start.mjs     # 서버 동시 실행·브라우저 열기
├── guide.md
├── frontend/         # React + Vite
└── backend/          # FastAPI + SQLite
```

## 접속 URL

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:5173 |
| 백엔드 API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| Health | http://localhost:8000/health |

**데모 접속:** 로그인 페이지에서 테스트 계정 사용

| 항목 | 값 |
|------|-----|
| 이메일 | `test@gmail.com` |
| 비밀번호 | `123` |

**관리자** — http://localhost:5173/admin (일반 로그인과 분리)

| 항목 | 값 |
|------|-----|
| 아이디 | `admin` |
| 비밀번호 | `123` |

> 관리자 전용 로그인 페이지에서 `@` 없이 아이디만 입력합니다.

> 프론트엔드는 `VITE_USE_MOCK=false` 일 때 FastAPI 백엔드 **23개 API**와 전면 연동됩니다. (`frontend/.env`)
>
> | 기능 | API |
> |------|-----|
> | 회원가입·로그인·프로필·탈퇴 | `/api/auth/*` |
> | 대시보드 | `GET /api/dashboard/summary` |
> | 계좌·보유종목·매매 | `/api/accounts/*` |
> | 매매일지 | `/api/journals/*` |
> | 경연 대회 | `/api/competitions/*` |
>
> 로그인 후 `DataBootstrap`이 서버 데이터를 불러옵니다. 이전 mock 데이터가 보이면 브라우저 localStorage에서 `managestock-data` 키를 삭제하세요.

## 기술 스택

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Zustand, Recharts
- **Backend:** FastAPI, SQLAlchemy, SQLite

## 프로덕션 · 자동 배포

- **서비스:** https://bullslong.com
- **CI/CD:** `main` push → GitHub Actions → EC2 SSH → `deploy.sh` → PM2 재시작
- **설정 가이드:** [deploy/README.md](deploy/README.md)

GitHub Secrets: `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`
