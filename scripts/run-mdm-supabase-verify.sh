#!/usr/bin/env bash
# Chạy một lượt: đẩy migrations lên DB + chạy các file SQL kiểm tra (postcheck).
#
# Yêu cầu: Supabase CLI (`npx supabase`) đã login và `supabase link` tới project,
# hoặc dùng DB local: MDM_DB_TARGET=local (cần `supabase start`).
#
# Không chạy các file trong supabase/migrations/ bằng db query — chỉ `db push` mới đúng.

set -eo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TARGET="${MDM_DB_TARGET:-linked}"
QUERY_FLAGS=(--linked)
LOCAL_FLAG=()
if [[ "$TARGET" == "local" ]]; then
  QUERY_FLAGS=(--local)
  LOCAL_FLAG=(--local)
fi

echo "[1/3] db push ${TARGET} — áp các file trong supabase/migrations/"
if [[ "${#LOCAL_FLAG[@]}" -gt 0 ]]; then
  npx supabase db push "${LOCAL_FLAG[@]}"
else
  npx supabase db push
fi

echo "[2/3] postcheck — scripts/master-data-cutover-postcheck.sql"
npx supabase db query "${QUERY_FLAGS[@]}" --agent=no -f scripts/master-data-cutover-postcheck.sql -o table

echo "[3/3] FK còn trỏ danh_muc_tuy_bien — scripts/sql/fk-public-referencing-danh-muc-tuy-bien.sql"
npx supabase db query "${QUERY_FLAGS[@]}" --agent=no -f scripts/sql/fk-public-referencing-danh-muc-tuy-bien.sql -o table

echo "Tuỳ chọn kiểm tra Node (đếm legacy): npm run mdm:fallback:audit hoặc mdm:fallback:audit:strict"
