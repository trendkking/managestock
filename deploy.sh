#!/usr/bin/env bash
# BULLSLONG 프로덕션 배포 — /var/www/bullslong 에서 실행
set -euo pipefail

on_error() {
  echo "❌ ERROR: deploy failed at line ${1}"
  exit 1
}
trap 'on_error ${LINENO}' ERR

APP_DIR="/var/www/bullslong"
cd "${APP_DIR}"

export PATH="${PATH}:/usr/local/bin:${HOME}/.local/bin"
if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  source "${HOME}/.nvm/nvm.sh"
fi

if [ -x backend/venv/bin/pip ]; then
  PIP="${APP_DIR}/backend/venv/bin/pip"
  ALEMBIC="${APP_DIR}/backend/venv/bin/alembic"
else
  PIP="pip3"
  ALEMBIC="alembic"
fi

echo "==> [1/4] git pull origin main"
git pull --ff-only origin main

if [ -f backend/data/managestock.db ] && [ ! -f backend/data/bullslong.db ]; then
  echo "==> copy backend/data/managestock.db -> bullslong.db"
  cp -a backend/data/managestock.db backend/data/bullslong.db
fi
if [ -f backend/managestock.db ] && [ ! -f backend/bullslong.db ]; then
  echo "==> copy backend/managestock.db -> bullslong.db"
  cp -a backend/managestock.db backend/bullslong.db
fi

echo "==> [2/4] alembic upgrade head"
(cd backend && "${ALEMBIC}" upgrade head)

echo "==> [3/4] pip install -r backend/requirements.txt"
"${PIP}" install -r backend/requirements.txt

echo "==> [4/4] pm2 restart"
if ! command -v pm2 >/dev/null 2>&1; then
  echo "❌ ERROR: pm2 not found. Run: npm install -g pm2"
  exit 1
fi

if pm2 jlist 2>/dev/null | grep -q '"pm_id"'; then
  pm2 restart all
else
  echo "⚠️  WARN: no pm2 apps — skip restart"
fi

echo "✅ Deploy completed successfully."
