#!/usr/bin/env bash
# DEPRECATED — restore pg_dump lên prod (schema/data.sql) không còn SSOT.
# Khuyến nghị: Không db push lên prod — migration prod đi qua Lead/MCP (apply_migration); local: npm run mdm:migrate:local. + verify.
set -euo pipefail
cd "$(dirname "$0")"

echo "ERROR: restore-to-prod.sh đã ngừng dùng."
echo "  SSOT: supabase/migrations/*.sql — Không db push lên prod — migration prod đi qua Lead/MCP (apply_migration); local: npm run mdm:migrate:local."
echo "  Archive dump cũ: supabase/archive/"
echo ""
echo "Nếu bắt buộc restore dump thủ công, dùng archive/schema-pgdump-deprecated-202606.sql"
echo "và data-pgdump-deprecated-202606.sql — sau đó liên hệ quản trị để apply migration (Lead/MCP)."
exit 1
