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

load_runtime_path() {
  local flags=$-
  set +e
  set +u
  export PATH="${PATH}:/usr/local/bin:/usr/bin:${HOME}/.local/bin"
  for profile in "${HOME}/.bash_profile" "${HOME}/.bashrc" "${HOME}/.profile"; do
    if [ -s "${profile}" ]; then
      # shellcheck disable=SC1090
      source "${profile}" 2>/dev/null || true
    fi
  done
  if [ -s "${HOME}/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1090
    source "${HOME}/.nvm/nvm.sh" 2>/dev/null || true
    nvm use default 2>/dev/null || nvm use node 2>/dev/null || nvm use --lts 2>/dev/null || true
  fi
  [[ "${flags}" == *e* ]] && set -e
  [[ "${flags}" == *u* ]] && set -u
}

if [ -x backend/venv/bin/pip ]; then
  PIP="${APP_DIR}/backend/venv/bin/pip"
  ALEMBIC="${APP_DIR}/backend/venv/bin/alembic"
else
  PIP="pip3"
  ALEMBIC="alembic"
fi

echo "==> [1/5] git pull origin main"
git pull --ff-only origin main

if [ -f backend/data/managestock.db ] && [ ! -f backend/data/bullslong.db ]; then
  echo "==> copy backend/data/managestock.db -> bullslong.db"
  cp -a backend/data/managestock.db backend/data/bullslong.db
fi
if [ -f backend/managestock.db ] && [ ! -f backend/bullslong.db ]; then
  echo "==> copy backend/managestock.db -> bullslong.db"
  cp -a backend/managestock.db backend/bullslong.db
fi

echo "==> [2/5] alembic upgrade head"
(cd backend && "${ALEMBIC}" upgrade head)

echo "==> [3/5] pip install -r backend/requirements.txt"
"${PIP}" install -r backend/requirements.txt

echo "==> [4/5] frontend build"
if [ "${SKIP_FRONTEND_BUILD:-0}" = "1" ]; then
  if [ -f frontend/dist/index.html ]; then
    echo "✅ frontend dist from CI"
    sudo systemctl reload nginx 2>/dev/null || true
  else
    echo "❌ ERROR: SKIP_FRONTEND_BUILD=1 but frontend/dist/index.html missing"
    exit 1
  fi
else
  load_runtime_path
  if command -v node >/dev/null 2>&1; then
    echo "node $(node -v) | npm $(npm -v 2>/dev/null || echo n/a)"
  fi
  if [ -f frontend/package.json ] && command -v npm >/dev/null 2>&1; then
    cd frontend
    if [ ! -f .env ] && [ -f .env.production.example ]; then
      cp .env.production.example .env
    fi
    export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
    if ! npm ci 2>&1; then
      echo "⚠️  npm ci failed — retry with npm install"
      npm install
    fi
    npm run build
    cd "${APP_DIR}"
    sudo systemctl reload nginx 2>/dev/null || true
    echo "✅ frontend build done"
  elif [ -f frontend/dist/index.html ]; then
    echo "⚠️  WARN: npm not found — using existing frontend/dist"
    sudo systemctl reload nginx 2>/dev/null || true
  else
    echo "❌ ERROR: npm not found and no frontend/dist — build in CI or install Node 20+"
    exit 1
  fi
fi

echo "==> [5/5] restart services"
load_runtime_path

if command -v pm2 >/dev/null 2>&1; then
  if pm2 jlist 2>/dev/null | grep -q '"pm_id"'; then
    pm2 restart all
    echo "✅ pm2 restart all"
  else
    echo "⚠️  pm2 found but no apps registered"
  fi
else
  echo "⚠️  pm2 not in PATH — trying systemd"
fi

restarted=0
for svc in bullslong-backend managestock-backend; do
  if systemctl list-unit-files "${svc}.service" 2>/dev/null | grep -qE 'enabled|disabled'; then
    if systemctl is-active --quiet "${svc}" 2>/dev/null || systemctl list-unit-files | grep -q "${svc}"; then
      sudo systemctl restart "${svc}" && restarted=1 && echo "✅ systemctl restart ${svc}" && break
    fi
  fi
done

if [ "${restarted}" -eq 0 ] && ! command -v pm2 >/dev/null 2>&1; then
  echo "❌ ERROR: pm2 not found and no systemd backend service."
  echo "→ npm install -g pm2  또는  systemctl enable bullslong-backend"
  exit 1
fi

if [ "${restarted}" -eq 0 ] && command -v pm2 >/dev/null 2>&1; then
  if ! pm2 jlist 2>/dev/null | grep -q '"pm_id"'; then
    echo "❌ ERROR: pm2 has no apps and systemd backend not found."
    exit 1
  fi
fi

echo "✅ Deploy completed successfully."
