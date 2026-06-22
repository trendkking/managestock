# 자동 배포 설정 (GitHub Actions → EC2)

`main` 브랜치에 push되면 테스트 통과 후 EC2 서버에 자동 배포됩니다.

## 1. 서버 사전 준비 (최초 1회)

EC2 (`/var/www/bullslong`)에서:

```bash
git clone https://github.com/trendkking/managestock.git /var/www/bullslong
cd /var/www/bullslong

# 백엔드 환경 변수
cp backend/.env.example backend/.env
# SECRET_KEY, DATABASE_URL, CORS_ORIGINS 등 프로덕션 값으로 수정

# 프론트엔드 빌드용 환경 변수
cp frontend/.env.production.example frontend/.env

# systemd 서비스 등록 (최초 1회)
sudo cp deploy/systemd/managestock-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable managestock-backend
```

## 2. GitHub Secrets 등록

저장소 **Settings → Secrets and variables → Actions** 에 추가:

| Secret | 예시 | 설명 |
|--------|------|------|
| `EC2_HOST` | `13.209.46.108` | EC2 공인 IP 또는 도메인 |
| `EC2_USER` | `ec2-user` | SSH 사용자 (Amazon Linux) |
| `EC2_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | EC2 접속용 PEM 전체 내용 |

## 3. GitHub Environment (선택)

**Settings → Environments → production** 을 만들면 배포 승인 규칙을 추가할 수 있습니다.

## 4. 수동 배포

서버에서 직접:

```bash
cd /var/www/bullslong
bash scripts/deploy.sh
```

GitHub Actions에서 **Actions → CI and Deploy → Run workflow** 로도 실행할 수 있습니다.

## 5. 배포 후 확인

```bash
curl https://bullslong.com/health
# → {"status":"ok"}
```
