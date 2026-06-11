#!/usr/bin/env bash
# DEPRECATED — restore pg_dump lên prod (schema/data.sql) không còn SSOT.
# Khuyến nghị: npm run mdm:migrate trên project linked + verify.
set -euo pipefail
cd "$(dirname "$0")"

echo "ERROR: restore-to-prod.sh đã ngừng dùng."
echo "  SSOT: supabase/migrations/*.sql + npm run mdm:migrate"
echo "  Archive dump cũ: supabase/archive/"
echo ""
echo "Nếu bắt buộc restore dump thủ công, dùng archive/schema-pgdump-deprecated-202606.sql"
echo "và data-pgdump-deprecated-202606.sql — sau đó chạy npm run mdm:migrate để đồng bộ delta."
exit 1
