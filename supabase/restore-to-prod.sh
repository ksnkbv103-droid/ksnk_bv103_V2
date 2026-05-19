#!/usr/bin/env bash
# Restore dump (schema + data) lên Supabase prod — bỏ qua roles (Supabase đã có role sẵn).
# Usage: ./supabase/restore-to-prod.sh
# Env: NEW_DB_URL hoặc truyền URL làm đối số 1.

set -euo pipefail
cd "$(dirname "$0")"

DB_URL="${1:-${NEW_DB_URL:-}}"
if [[ -z "$DB_URL" ]]; then
  echo "Thiếu NEW_DB_URL hoặc tham số 1 (connection string pooler postgres.REF@aws-1...)."
  exit 1
fi

export PATH="/opt/homebrew/opt/libpq/bin:${PATH:-}"

echo "=== 0/4 Reset schema public (trống sạch) ==="
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE;"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "DROP EXTENSION IF EXISTS unaccent CASCADE;"
psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
CREATE EXTENSION unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SQL

echo "=== 1/4 Schema (bỏ dòng \\restrict pg_dump 18 nếu có) ==="

grep -v '^\\restrict ' schema.sql \
  | grep -v '^CREATE SCHEMA public;' \
  | grep -v '^COMMENT ON SCHEMA public IS' \
  | psql "$DB_URL" -v ON_ERROR_STOP=1

echo "=== 2/4 Data public (một phiên psql — bắt buộc cho FK auth) ==="
{ echo "SET session_replication_role = replica;"; cat data.sql; echo "SET session_replication_role = DEFAULT;"; } \
  | psql "$DB_URL" -v ON_ERROR_STOP=1

echo "=== 2b/4 Auth users (đăng nhập) ==="
if [[ -f auth-users-identities.sql ]]; then
  { echo "SET session_replication_role = replica;"; grep -v '^\\restrict' auth-users-identities.sql | grep -v '^\\unrestrict'; echo "SET session_replication_role = DEFAULT;"; } \
    | psql "$DB_URL" -v ON_ERROR_STOP=1
else
  echo "Tạo auth-users-identities.sql: pg_dump -t auth.users -t auth.identities từ DB nguồn."
fi

echo "=== 3/4 Đồng bộ lịch sử migration từ DB nguồn (cần OLD_DB_URL) ==="
if [[ -n "${OLD_DB_URL:-}" ]]; then
  MIG_SYNC="$(mktemp)"
  psql "$OLD_DB_URL" -t -A -c "SELECT format('INSERT INTO supabase_migrations.schema_migrations (version) VALUES (%L) ON CONFLICT DO NOTHING;', version) FROM supabase_migrations.schema_migrations ORDER BY version;" >"$MIG_SYNC"
  psql "$DB_URL" -c "TRUNCATE supabase_migrations.schema_migrations;"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$MIG_SYNC"
  rm -f "$MIG_SYNC"
else
  echo "Bỏ qua: đặt OLD_DB_URL rồi chạy lại bước 3, hoặc npm run mdm:migrate sau restore."
fi

echo "=== Restore xong — chạy: npm run trial:db:precheck ==="
psql "$DB_URL" -c "
SELECT 'mdm_nhan_su' AS t, count(*)::bigint AS n FROM public.mdm_nhan_su
UNION ALL SELECT 'fact_giam_sat_vst_sessions', count(*) FROM public.fact_giam_sat_vst_sessions
UNION ALL SELECT 'fact_giam_sat_vst', count(*) FROM public.fact_giam_sat_vst
UNION ALL SELECT 'fact_giam_sat_chung_sessions', count(*) FROM public.fact_giam_sat_chung_sessions;
"
