# 자동 배포 (GitHub Actions → EC2 + PM2)

`main` 브랜치 push 시 GitHub Actions가 EC2에 SSH 접속 후 `deploy.sh`를 실행합니다.

## GitHub Secrets (등록 완료)

| Secret | 설명 |
|--------|------|
| `SERVER_HOST` | EC2 공인 IP 또는 도메인 |
| `SERVER_USER` | SSH 사용자 (예: `ec2-user`) |
| `SERVER_SSH_KEY` | PEM 키 전체 내용 |

## 서버 경로

```
/var/www/bullslong
```

## deploy.sh 실행 순서

1. `git pull origin main`
2. `alembic upgrade head`
3. `pip install -r backend/requirements.txt`
4. `pm2 restart all`

## 수동 배포

```bash
cd /var/www/bullslong
bash deploy.sh
```

## Actions 확인

GitHub → **Actions** → **Deploy** 워크플로에서 성공/실패 로그를 확인합니다.
