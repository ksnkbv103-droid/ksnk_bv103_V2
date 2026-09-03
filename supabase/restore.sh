#!/bin/bash
# DEPRECATED — dùng Supabase CLI thay cho pg_dump restore.
set -e
echo "ERROR: restore.sh đã ngừng dùng (schema pg_dump lạc hậu compat dm_*/fact_*)."
echo ""
echo "Local fresh DB:"
echo "  npx supabase db reset --local"
echo "  npm run trial:db:precheck:local"
echo ""
echo "Linked/staging/prod:"
echo "  npm run mdm:migrate"
echo "  npm run trial:db:precheck"
echo ""
echo "Archive pg_dump cũ: supabase/archive/schema-pgdump-deprecated-202606.sql"
exit 1
