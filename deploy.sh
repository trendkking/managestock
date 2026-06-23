#!/usr/bin/env bash
# BULLSLONG 프로덕션 배포 — /var/www/bullslong 에서 실행
set -euo pipefail

APP_DIR="/var/www/bullslong"
cd "${APP_DIR}"

if [ -x backend/venv/bin/pip ]; then
  PIP="${APP_DIR}/backend/venv/bin/pip"
  ALEMBIC="${APP_DIR}/backend/venv/bin/alembic"
else
  PIP="pip3"
  ALEMBIC="alembic"
fi

echo "==> [1/4] git pull origin main"
git pull origin main

echo "==> [2/4] alembic upgrade head"
(cd backend && "${ALEMBIC}" upgrade head)

echo "==> [3/4] pip install -r backend/requirements.txt"
"${PIP}" install -r backend/requirements.txt

echo "==> [4/4] pm2 restart all"
pm2 restart all

echo "==> Deploy completed successfully."
