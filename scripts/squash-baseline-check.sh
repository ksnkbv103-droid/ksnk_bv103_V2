#!/usr/bin/env bash
# Lát 4a — .claude/plans/KH_APPKSNK_20261118_squash-migration.md §3.
# Dựng DB sạch trong project Supabase THẢI BỎ (project_id ksnk_sq4a, cổng 554xx) và so:
#   DB-0 = chỉ pg_cron (mốc nền tảng)            DB-1 = pg_cron + mọi *.sql trực tiếp trong supabase/migrations/
#   DB-2 = pg_cron + baseline nháp sinh từ DB-1 bằng pg_dump (không viết tay)
# KHÔNG chạm stack local chính (supabase_*_ksnk_bv103) và KHÔNG sửa supabase/migrations/.
#
# Dùng:  SQUASH_WORK=<thư mục> bash scripts/squash-baseline-check.sh all    # dựng + so, in kết quả
#        SQUASH_WORK=<thư mục> bash scripts/squash-baseline-check.sh down   # dừng + xóa stack thải bỏ
# Kết quả lần chạy 2026-11-18: dừng ở bước dựng DB-1 (chuỗi 316 file không dựng được từ DB sạch) — xem plan §5.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${SQUASH_WORK:-${TMPDIR:-/tmp}/ksnk-squash-4a}"
PID="ksnk_sq4a"
DBC="supabase_db_${PID}"
PROJ="$WORK/proj"
OUT="$WORK/out"
SB="npx supabase"   # chạy từ thư mục repo để npx dùng bản CLI của dự án

# Chốt an toàn: chỉ làm việc với project thải bỏ.
case "$PID" in ksnk_bv103*) echo "PID trùng stack chính — dừng" >&2; exit 2 ;; esac

sb() {
  grep -q "^project_id = \"$PID\"" "$PROJ/supabase/config.toml" || { echo "config.toml không phải project $PID — dừng" >&2; exit 2; }
  $SB --workdir "$PROJ" "$@"
}
q() { docker exec -i "$DBC" psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 -tA "$@"; }
filt() { grep -v -E '^\\(un)?restrict '; }   # pg_dump 17.6 in \restrict <khóa ngẫu nhiên>

setup() {
  rm -rf "$PROJ" "$OUT"; mkdir -p "$PROJ/supabase/migrations" "$OUT"
  cat > "$PROJ/supabase/config.toml" <<EOF
project_id = "$PID"
[api]
port = 55421
[db]
port = 55422
shadow_port = 55420
major_version = 17
[db.pooler]
enabled = false
[db.seed]
enabled = false
[studio]
enabled = false
[inbucket]
enabled = false
[analytics]
enabled = false
[edge_runtime]
enabled = false
[auth]
enabled = true
[storage]
enabled = true
EOF
  echo "CREATE EXTENSION IF NOT EXISTS pg_cron;" > "$WORK/00000000000000_pg_cron.sql"
  echo ">> start stack thải bỏ $PID"
  sb start -x studio,imgproxy,edge-runtime,logflare,vector,mailpit,postgres-meta,supavisor,realtime
}

use_migrations() {  # $@ = các file .sql sẽ thành chuỗi migration
  rm -f "$PROJ"/supabase/migrations/*.sql
  cp "$@" "$PROJ/supabase/migrations/"
}

reset_timed() {  # $1 = nhãn; ghi giây vào timing.txt
  local t0 t1
  t0=$(date +%s)
  sb db reset --local
  t1=$(date +%s)
  echo "$1 $((t1 - t0))" >> "$OUT/timing.txt"
  echo ">> $1: db reset $((t1 - t0)) giây"
}

capture() {  # $1 = db0|db1|db2
  local n="$1"
  docker exec "$DBC" pg_dump -U postgres -d postgres --schema-only --exclude-schema=supabase_migrations | filt > "$OUT/schema-$n.sql"
  docker exec "$DBC" pg_dump -U postgres -d postgres --schema-only -N public -N supabase_migrations | filt > "$OUT/nonpublic-$n.sql"
  # Dữ liệu: mọi bảng public (count + md5 nội dung đã sắp), số dòng vài bảng auth/storage
  q <<'SQL' > "$OUT/data-$n.txt"
SELECT t.table_schema||'.'||t.table_name||'|'||
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', t.table_schema, t.table_name), false, true, '')))[1]::text||'|'||
  (xpath('/row/c/text()', query_to_xml(format('select md5(coalesce(string_agg(x::text, E''\n'' order by x::text), '''')) as c from %I.%I x', t.table_schema, t.table_name), false, true, '')))[1]::text
FROM information_schema.tables t WHERE t.table_type='BASE TABLE' AND t.table_schema='public' ORDER BY 1;
SELECT t.table_schema||'.'||t.table_name||'|'||
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', t.table_schema, t.table_name), false, true, '')))[1]::text
FROM information_schema.tables t WHERE (t.table_schema, t.table_name) IN (('auth','users'),('auth','identities'),('storage','buckets'),('storage','objects')) ORDER BY 1;
SELECT 'seq|'||schemaname||'.'||sequencename||'|'||coalesce(last_value::text,'null') FROM pg_sequences WHERE schemaname='public' ORDER BY 1;
SQL
  q -c "SELECT 'cron|'||jobname||'|'||schedule||'|'||command||'|'||active||'|'||database||'|'||username FROM cron.job ORDER BY jobname" > "$OUT/cron-$n.txt"
  # Mọi thứ pg_dump -s không phủ: role, thành viên role, cấu hình role, extension, default ACL, ACL schema
  q <<'SQL' > "$OUT/catalog-$n.txt"
SELECT 'role|'||rolname||'|'||rolsuper||rolinherit||rolcreaterole||rolcreatedb||rolcanlogin||rolreplication||rolbypassrls FROM pg_roles WHERE rolname !~ '^pg_' ORDER BY 1;
SELECT 'member|'||r.rolname||'|'||m.rolname FROM pg_auth_members am JOIN pg_roles r ON r.oid=am.roleid JOIN pg_roles m ON m.oid=am.member ORDER BY 1;
SELECT 'rolecfg|'||coalesce(r.rolname,'-')||'|'||array_to_string(s.setconfig, ',') FROM pg_db_role_setting s LEFT JOIN pg_roles r ON r.oid=s.setrole ORDER BY 1;
SELECT 'ext|'||extname||'|'||extversion||'|'||n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace ORDER BY 1;
SELECT 'defacl|'||coalesce(r.rolname,'')||'|'||coalesce(n.nspname,'')||'|'||d.defaclobjtype::text||'|'||d.defaclacl::text FROM pg_default_acl d LEFT JOIN pg_roles r ON r.oid=d.defaclrole LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace ORDER BY 1;
SELECT 'nspacl|'||nspname||'|'||coalesce(nspacl::text,'') FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname<>'information_schema' ORDER BY 1;
SQL
  echo ">> capture $n: $(wc -l < "$OUT/schema-$n.sql") dòng schema, $(grep -c '^public\.' "$OUT/data-$n.txt") bảng public, $(wc -l < "$OUT/cron-$n.txt") cron job"
}

make_baseline() {  # từ DB-1 đang chạy
  local f="$OUT/baseline_draft.sql"
  {
    echo "-- BASELINE NHÁP (lát 4a) — sinh tự động bởi scripts/squash-baseline-check.sh từ DB sạch áp đủ chuỗi migration. KHÔNG sửa tay."
    echo "-- Phần 1: extension migration thêm so với image trống (DB-0)"
    comm -13 <(grep '^ext|' "$OUT/catalog-db0.txt" | cut -d'|' -f2,4 | sort) <(grep '^ext|' "$OUT/catalog-db1.txt" | cut -d'|' -f2,4 | sort) \
      | awk -F'|' '{printf "CREATE EXTENSION IF NOT EXISTS \"%s\" WITH SCHEMA \"%s\";\n", $1, $2}'
    echo "-- Phần 2: schema public + dữ liệu (pg_dump -n public --column-inserts)"
    docker exec "$DBC" pg_dump -U postgres -d postgres -n public --column-inserts --rows-per-insert=100 \
      | filt | sed 's/^CREATE SCHEMA public;$/CREATE SCHEMA IF NOT EXISTS public;/'
    echo "-- Phần 3: lịch pg_cron (chỉ khi extension có sẵn, giống các migration gốc)"
    echo 'DO $cron$ BEGIN'
    echo "  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN"
    q -c "SELECT format('    PERFORM cron.schedule(%L, %L, %L);', jobname, schedule, command) FROM cron.job ORDER BY jobname"
    echo "  END IF;"
    echo 'END $cron$;'
  } > "$f"
  echo ">> baseline nháp: $(wc -l < "$f") dòng, $(wc -c < "$f") byte -> $f"
}

compare() {
  local bad=0 n
  : > "$OUT/summary.txt"
  say() { echo "$@" | tee -a "$OUT/summary.txt"; }
  local a b
  for pair in "schema:sql" "data:txt" "cron:txt" "catalog:txt"; do
    a="$OUT/${pair%%:*}-db1.${pair##*:}"; b="$OUT/${pair%%:*}-db2.${pair##*:}"
    diff "$a" "$b" > "$OUT/diff-${pair%%:*}.txt" || true
    n=$(wc -l < "$OUT/diff-${pair%%:*}.txt" | tr -d ' ')
    say "diff ${pair%%:*} DB-1 vs DB-2: $n dòng"; [ "$n" = 0 ] || bad=1
  done
  say "bảng public: $(grep -c '^public\.' "$OUT/data-db1.txt") (DB-1) / $(grep -c '^public\.' "$OUT/data-db2.txt") (DB-2); bảng lệch count/md5: $(diff <(grep '^public\.' "$OUT/data-db1.txt") <(grep '^public\.' "$OUT/data-db2.txt") | grep -c '^<' || true)"
  say "delta ngoài public (DB-0 -> DB-1, phần baseline phải mang tay): $(diff "$OUT/nonpublic-db0.sql" "$OUT/nonpublic-db1.sql" | grep -c '^[<>]' || true) dòng"
  say "thời gian dựng: $(tr '\n' ';' < "$OUT/timing.txt")"
  [ "$bad" = 0 ] && say "KẾT LUẬN: KHỚP" || say "KẾT LUẬN: LỆCH (xem $OUT/diff-*.txt)"
}

case "${1:-}" in
  all)
    setup; : > "$OUT/timing.txt"
    use_migrations "$WORK/00000000000000_pg_cron.sql"; reset_timed db0-chi-pg_cron; capture db0
    use_migrations "$WORK/00000000000000_pg_cron.sql" "$REPO"/supabase/migrations/*.sql
    # Thử giả thuyết thứ tự: SQUASH_REVERSION="<tên file>=<version mới> ..." đổi version BẢN SAO trong project thải bỏ (repo không đổi).
    for kv in ${SQUASH_REVERSION:-}; do
      old="${kv%%=*}"; new="${kv##*=}"
      mv "$PROJ/supabase/migrations/$old" "$PROJ/supabase/migrations/${new}_${old#*_}"
      echo ">> đổi version bản sao: $old -> ${new}_${old#*_}"
    done
    echo ">> DB-1: $(ls "$PROJ"/supabase/migrations/*.sql | wc -l) file (gồm pg_cron)"
    reset_timed db1-316-file; capture db1
    make_baseline
    cp "$OUT/baseline_draft.sql" "$WORK/00000000000001_baseline_draft.sql"
    use_migrations "$WORK/00000000000000_pg_cron.sql" "$WORK/00000000000001_baseline_draft.sql"
    reset_timed db2-baseline-nhap; capture db2
    compare
    ;;
  down)
    sb stop --no-backup || true
    ;;
  *) echo "Dùng: $0 all|down" >&2; exit 1 ;;
esac
