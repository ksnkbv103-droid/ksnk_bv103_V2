#!/bin/bash
set -e

DB_URL="$1"

echo "=== 1. Restore roles ==="
psql "$DB_URL" -f roles.sql

echo "=== 2. Restore schema ==="
psql "$DB_URL" -f schema.sql

echo "=== 3. Restore data (tắt RLS tạm thời) ==="
psql "$DB_URL" -c "SET session_replication_role = replica;"
psql "$DB_URL" -f data.sql
psql "$DB_URL" -c "SET session_replication_role = DEFAULT;"

echo "=== RESTORE HOÀN TẤT 100% ==="
echo "New DB sẵn sàng. Update env vars trong app ngay."
