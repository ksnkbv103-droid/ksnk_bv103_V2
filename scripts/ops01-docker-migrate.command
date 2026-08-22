#!/bin/bash
# Double-click hoặc chạy trong Terminal (ngoài Cursor) khi Docker socket bị TCC chặn.
set -euo pipefail
cd "$(dirname "$0")/.."
LOG=/tmp/ksnk-ops01-migrate.log
exec > >(tee -a "$LOG") 2>&1
echo "=== OPS-01 start $(date) ==="

# Writable HOME — tránh EPERM ~/.supabase/telemetry.json từ môi trường hạn chế
export HOME="${TMPDIR:-/tmp}/ksnk-supabase-home-$$"
mkdir -p "$HOME/.supabase"
export SUPABASE_INTERNAL_DISABLE_TELEMETRY=1
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

echo "=== Docker check ==="
if ! docker info >/dev/null 2>&1; then
  echo "Đang mở Docker Desktop..."
  open "/Applications/Docker.app/Contents/MacOS/Docker Desktop.app" 2>/dev/null || true
  for i in $(seq 1 90); do
    if docker info >/dev/null 2>&1; then
      echo "DOCKER_OK sau ~$((i*2))s"
      break
    fi
    sleep 2
  done
fi

if ! docker info >/dev/null 2>&1; then
  echo "DOCKER_FAIL — mở Docker Desktop thủ công, đợi xanh, rồi chạy lại."
  read -r -p "Nhấn Enter để đóng..."
  exit 1
fi

echo "=== supabase status / start ==="
if ! npx supabase status >/dev/null 2>&1; then
  npx supabase start
else
  npx supabase status
fi

echo "=== mdm:migrate:local (db-url bypass nếu cần) ==="
if ! npm run mdm:migrate:local; then
  echo "Fallback: db push --db-url"
  npx supabase db push --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" --yes
fi

echo "=== local:golden:verify ==="
npm run local:golden:verify

echo "=== OPS-01 DONE $(date) ==="
read -r -p "Nhấn Enter để đóng cửa sổ..."
