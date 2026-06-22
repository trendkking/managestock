#!/usr/bin/env bash
# EC2 프로덕션 배포 스크립트 — /var/www/bullslong 에서 실행
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/bullslong}"
BRANCH="${BRANCH:-main}"
HEALTH_URL="${HEALTH_URL:-https://bullslong.com/health}"

echo "==> Deploy MANAGESTOCK (${BRANCH}) in ${APP_DIR}"

cd "${APP_DIR}"

echo "==> Pull latest code"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git reset --hard "origin/${BRANCH}"

echo "==> Build frontend"
cd frontend
if [ ! -f .env ] && [ -f .env.production.example ]; then
  cp .env.production.example .env
fi
npm ci
npm run build
cd ..

echo "==> Update backend"
cd backend
if [ ! -d venv ]; then
  python3.11 -m venv venv
fi
venv/bin/pip install -r requirements.txt -q
venv/bin/alembic upgrade head
cd ..

echo "==> Reload services"
sudo systemctl reload nginx
sudo systemctl restart managestock-backend

echo "==> Health check"
sleep 2
curl -fsS "${HEALTH_URL}" >/dev/null
echo "Deploy complete."
