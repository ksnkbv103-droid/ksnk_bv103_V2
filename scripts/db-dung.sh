#!/usr/bin/env bash
# npm run db:dung — kiểm chuỗi migration của repo dựng được DB sạch. Plan .claude/plans/de-xuat-mot-con-duong-20261119.md
# §6, §8 Lát 1, §10 #4 #6. Chạy local và trong CI (.github/workflows/db-dung.yml).
# Stack Supabase THẢI BỎ (project ksnk_dd, cổng 556xx): không đụng stack chính ksnk_bv103 (:54322), xóa volume khi xong.
#  1. Bất biến migration: guard-migrations.mjs --bat-bien so với MIGRATION_BASE (mặc định nhánh upstream, không có thì HEAD).
#  2. supabase start áp cả chuỗi + seed; stub 20260729121000 thay ở bản sao bằng nội dung trước f44b7705, cùng tên file
#     (PO 18/11, như scripts/db-reset-local.sh); ledger phải bằng số file.
#  3. db lint --level error không vượt mốc scripts/data/db-lint-baseline.json (lỗi cũ ghi trong mốc; chỉ chặn lỗi mới).
#  4. audit:views (0 view không ai dùng).
#  5. pgTAP: `supabase test db` chạy supabase/tests/** (§10 #1, Lát 1b).
#  6. gen types: src/lib/database.types.ts phải bằng output `supabase gen types typescript --local` (§10 #2, Lát 1b).
# Chạy đủ các bước rồi mới thoát; bước nào đỏ thì exit 1.
# Biến: MIGRATION_BASE · DB_DUNG_GHI_MOC=1 (ghi lại mốc lint) · DB_DUNG_GHI_TYPES=1 (sinh lại database.types.ts) · DB_DUNG_GIU=1 (giữ stack để soi) · SUPABASE_CLI (mặc định npx supabase).
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
PID="ksnk_dd"
DBC="supabase_db_$PID"
SB="${SUPABASE_CLI:-npx supabase}"
STUB="20260729121000_bang_muc_tieu_cu_da_go.sql"
ORIG_REF="f44b7705^:supabase/migrations/20260729121000_ksnk_dm_muc_tieu_kpi.sql"
MOC="$REPO/scripts/data/db-lint-baseline.json"
TMP="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/db-dung.XXXXXX")"
WD="$TMP/$PID"
fail=""

sb() { $SB --workdir "$WD" "$@"; }
q() { docker exec -i "$DBC" psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 -tA "$@"; }
don() {
  if [ "${DB_DUNG_GIU:-}" = 1 ]; then echo "[db:dung] giữ stack $PID (db :55622); tắt: $SB stop --project-id $PID --no-backup"
  else $SB stop --project-id "$PID" --no-backup >/dev/null 2>&1 || true; fi
  rm -rf "$TMP"
}
trap don EXIT

# 1. Bất biến
base="${MIGRATION_BASE:-}"
# Push nhánh mới (before toàn 0) / chạy local: merge-base với upstream, không có thì với origin/main; không rơi về HEAD (diff rỗng = qua giả).
case "$base" in ""|0000000000000000000000000000000000000000)
  base="$(git -C "$REPO" merge-base HEAD '@{upstream}' 2>/dev/null || git -C "$REPO" merge-base HEAD origin/main 2>/dev/null)" ;; esac
[ -n "$base" ] || { echo "[db:dung] không tìm được base bất biến (đặt MIGRATION_BASE=<ref>)" >&2; exit 2; }
node "$REPO/scripts/guard-migrations.mjs" --bat-bien --base "$base" || fail="$fail · bất biến migration"

# 2. Dựng
mkdir -p "$WD/supabase/migrations"
for f in seed.sql seeds tests; do ln -s "$REPO/supabase/$f" "$WD/supabase/$f"; done
{ echo "project_id = \"$PID\""
  awk '/^\[api\]$/ { print; print "port = 55621"; next }
       /^\[db\]$/  { print; print "shadow_port = 55620"; next }
       /^port = 54322$/ { print "port = 55622"; next } { print }' "$REPO/supabase/config.toml"
  printf '\n[inbucket]\nport = 55624\n\n[analytics]\nport = 55627\n'
} > "$WD/supabase/config.toml"
n=0
for src in "$REPO"/supabase/migrations/*.sql; do ln -s "$src" "$WD/supabase/migrations/"; n=$((n + 1)); done
[ -L "$WD/supabase/migrations/$STUB" ] || { echo "[db:dung] không thấy $STUB — sửa script sau squash" >&2; exit 2; }
rm "$WD/supabase/migrations/$STUB"
git -C "$REPO" show "$ORIG_REF" > "$WD/supabase/migrations/$STUB" || { echo "[db:dung] không đọc được $ORIG_REF (cần lịch sử git đầy đủ)" >&2; exit 2; }

$SB stop --project-id "$PID" --no-backup >/dev/null 2>&1 || true
t0=$(date +%s)
if ! sb start -x imgproxy,edge-runtime,postgres-meta,supavisor; then
  echo "[db:dung] ĐỎ: supabase start lỗi (xem log trên)${fail}" >&2; exit 1
fi
led="$(q -c "select count(*) from supabase_migrations.schema_migrations")"
echo "[db:dung] dựng xong sau $(( $(date +%s) - t0 )) giây; $n migration, ledger $led; bản thay: $STUB <- $ORIG_REF"
[ "$led" = "$n" ] || fail="$fail · ledger $led ≠ $n file"

# 3. db lint có mốc
sb db lint --local --level error > "$TMP/lint.json" 2> "$TMP/lint.err" || { cat "$TMP/lint.err" >&2; fail="$fail · db lint không chạy được"; }
node - "$TMP/lint.json" "$MOC" "${DB_DUNG_GHI_MOC:-}" <<'JS' || fail="$fail · db lint vượt mốc"
const fs = require("node:fs");
const [file, moc, ghi] = process.argv.slice(2);
const raw = fs.readFileSync(file, "utf8").trim();
if (!raw) { console.error("[db:dung] db lint không in JSON (CLI đổi định dạng?)"); process.exit(1); }
const j = JSON.parse(raw);
if (j._tag === "Error") { console.error(`[db:dung] db lint lỗi: ${j.error?.message}`); process.exit(1); }
const ds = Array.isArray(j) ? j : j.results || []; // CLI 2.122: { results: [{ function, issues }], message }
const loi = ds.flatMap((d) => (d.issues || []).filter((i) => i.level === "error").map((i) => `${d.function}: ${String(i.message).split("\n")[0]}`)).sort();
if (ghi === "1") {
  fs.writeFileSync(moc, JSON.stringify({ cap: "error", so_loi: loi.length, ghi_ngay: new Date().toISOString().slice(0, 10), cach_ghi: "DB_DUNG_GHI_MOC=1 npm run db:dung", loi }, null, 2) + "\n");
  console.log(`[db:dung] ghi mốc lint: ${loi.length} lỗi -> ${moc}`);
  process.exit(0);
}
if (!fs.existsSync(moc)) { console.error(`[db:dung] chưa có mốc ${moc}; ghi bằng DB_DUNG_GHI_MOC=1`); process.exit(1); }
const m = JSON.parse(fs.readFileSync(moc, "utf8"));
const cu = new Set(m.loi);
const moi = loi.filter((k) => !cu.has(k));
if (moi.length || loi.length > m.so_loi) {
  console.error(`[db:dung] db lint ${loi.length} lỗi (mốc ${m.so_loi}), ${moi.length} lỗi ngoài mốc:\n- ${moi.join("\n- ")}`);
  process.exit(1);
}
console.log(`[db:dung] db lint ${loi.length} lỗi ≤ mốc ${m.so_loi}${loi.length < m.so_loi ? " (giảm: hạ mốc bằng DB_DUNG_GHI_MOC=1)" : ""}`);
JS

# 4. audit:views
AUDIT_VIEWS_PSQL="docker exec -i $DBC psql -U postgres -d postgres -X" node "$REPO/scripts/audit-view-usage.mjs" > "$TMP/views.json" \
  || { cat "$TMP/views.json"; fail="$fail · audit:views"; }
tail -1 "$TMP/views.json"

# 5. pgTAP: supabase/tests/** (RLS theo vai; dựng dữ liệu trong giao dịch rồi ROLLBACK)
sb test db > "$TMP/pgtap.log" 2>&1 || { tail -40 "$TMP/pgtap.log" >&2; fail="$fail · pgTAP"; }
tail -3 "$TMP/pgtap.log"

# 6. Kiểu TypeScript sinh từ schema: file đã commit phải bằng output `gen types` của chính chuỗi migration này
TYPES="$REPO/src/lib/database.types.ts"
if sb gen types typescript --local --schema public > "$TMP/database.types.ts" 2> "$TMP/types.err"; then
  if [ "${DB_DUNG_GHI_TYPES:-}" = 1 ]; then
    cp "$TMP/database.types.ts" "$TYPES"; echo "[db:dung] ghi $TYPES ($(wc -l < "$TYPES") dòng)"
  elif ! cmp -s "$TMP/database.types.ts" "$TYPES"; then
    echo "[db:dung] $TYPES lệch schema thật (migration đổi mà chưa sinh lại): DB_DUNG_GHI_TYPES=1 npm run db:dung" >&2
    diff "$TYPES" "$TMP/database.types.ts" | head -20 >&2
    fail="$fail · gen types lệch"
  else echo "[db:dung] gen types khớp $(basename "$TYPES")"; fi
else cat "$TMP/types.err" >&2; fail="$fail · gen types không chạy được"; fi

if [ -n "$fail" ]; then echo "[db:dung] ĐỎ${fail}" >&2; exit 1; fi
echo "[db:dung] XANH (base bất biến: $base)"
