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
#  6. gen types: src/lib/database.types.ts phải bằng output `supabase gen types typescript --db-url …:55622` (§10 #2, Lát 1b).
#  7. e2e smoke VST+GSC (§8 Lát 1c): chỉ khi DB_DUNG_E2E=1; build + start Next trỏ stack này, Playwright e2e/gsc-vst-supervision.spec.ts.
# Chạy đủ các bước rồi mới thoát; bước nào đỏ thì exit 1.
# Biến: MIGRATION_BASE · DB_DUNG_GHI_MOC=1 (ghi lại mốc lint) · DB_DUNG_GHI_TYPES=1 (sinh lại database.types.ts) · DB_DUNG_GIU=1 (giữ stack để soi) · DB_DUNG_E2E=1 (thêm bước 7) · SUPABASE_CLI (mặc định npx supabase).
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
PID="ksnk_dd"
DBC="supabase_db_$PID"
SB="${SUPABASE_CLI:-npx supabase}"
STUB="20260729121000_bang_muc_tieu_cu_da_go.sql"
ORIG_REF="f44b7705^:supabase/migrations/20260729121000_ksnk_dm_muc_tieu_kpi.sql"
MOC="$REPO/scripts/data/db-lint-baseline.json"
# Khóa chạy đồng thời (NEN-015): PID/cổng cố định nên hai phiên chạy cùng lúc sẽ tắt stack của nhau. mkdir nguyên tử;
# đặt TRƯỚC mktemp và trap để phiên bị từ chối không tắt stack hay xóa thư mục của phiên đang chạy.
LOCK="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/ksnk_dd.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  holder="$(cat "$LOCK/pid" 2>/dev/null || true)"
  if [ -n "$holder" ] && kill -0 "$holder" 2>/dev/null; then
    echo "[db:dung] đang có phiên khác chạy (pid $holder, khóa $LOCK) — chờ nó xong rồi chạy lại" >&2; exit 2
  fi
  rm -rf "$LOCK"   # khóa mồ côi (phiên trước bị kill -9 hoặc mất điện)
  mkdir "$LOCK" 2>/dev/null || { echo "[db:dung] không lấy được khóa $LOCK (phiên khác vừa giành)" >&2; exit 2; }
fi
echo $$ > "$LOCK/pid"
TMP="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/db-dung.XXXXXX")"
WD="$TMP/$PID"
fail=""

sb() { $SB --workdir "$WD" "$@"; }
q() { docker exec -i "$DBC" psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 -tA "$@"; }
don() {
  [ -n "${E2E_PID:-}" ] && kill "$E2E_PID" 2>/dev/null
  if [ "${DB_DUNG_GIU:-}" = 1 ]; then echo "[db:dung] giữ stack $PID (db :55622); tắt: $SB stop --project-id $PID --no-backup"
  else $SB stop --project-id "$PID" --no-backup >/dev/null 2>&1 || true; fi
  rm -rf "$TMP" "$LOCK"
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
# CLI tự chọn định dạng theo môi trường (phiên agent: JSON; ngoài agent: text, stdout rỗng khi 0 lỗi): ép JSON để mốc đọc được ở mọi nơi.
sb db lint --local --level error --output-format json > "$TMP/lint.json" 2> "$TMP/lint.err" || { cat "$TMP/lint.err" >&2; fail="$fail · db lint không chạy được"; }
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
# --db-url + sslmode=disable: `--local` tới DB cổng 55622 lỗi TLS ("server does not support SSL"); lỗi CLI in JSON ra stdout nên in cả hai khi đỏ.
if sb gen types typescript --db-url "postgresql://postgres:postgres@127.0.0.1:55622/postgres?sslmode=disable" --schema public > "$TMP/database.types.ts" 2> "$TMP/types.err"; then
  if [ "${DB_DUNG_GHI_TYPES:-}" = 1 ]; then
    cp "$TMP/database.types.ts" "$TYPES"; echo "[db:dung] ghi $TYPES ($(wc -l < "$TYPES") dòng)"
  elif ! cmp -s "$TMP/database.types.ts" "$TYPES"; then
    echo "[db:dung] $TYPES lệch schema thật (migration đổi mà chưa sinh lại): DB_DUNG_GHI_TYPES=1 npm run db:dung" >&2
    diff "$TYPES" "$TMP/database.types.ts" | head -20 >&2
    fail="$fail · gen types lệch"
  else echo "[db:dung] gen types khớp $(basename "$TYPES")"; fi
else cat "$TMP/types.err" >&2; head -c 600 "$TMP/database.types.ts" >&2; fail="$fail · gen types không chạy được"; fi

# 7. e2e smoke VST+GSC trên chính stack này (§8 Lát 1c, §10 #5). Chỉ chạy khi DB_DUNG_E2E=1 (CI bật; local mặc định tắt cho nhanh).
#    Build + start Next trỏ stack ksnk_dd (cổng 3100, distDir .next-e2e: không đè .next/.next-local của dev server), đăng nhập bằng
#    tài khoản seed local (supabase/seeds/01-pilot-nhan-su.sql, chỉ có trong stack thải bỏ). Không secret.
#    Xanh giả: spec tự test.skip khi thiếu credential và Playwright vẫn exit 0 → đòi số «passed» + «flaky» = tổng số ca, 0 failed/skipped.
if [ "${DB_DUNG_E2E:-}" = 1 ]; then
  E2E_SPEC="e2e/gsc-vst-supervision.spec.ts"
  E2E_PORT=3100
  kv="$(sb status -o env 2> "$TMP/status.err")" || { cat "$TMP/status.err" >&2; fail="$fail · e2e: supabase status lỗi"; kv=""; }
  kvget() { printf '%s\n' "$kv" | sed -n "s/^$1=\"\{0,1\}\(.*[^\"]\)\"\{0,1\}$/\1/p" | head -1; }
  api="$(kvget API_URL)"; anon="$(kvget ANON_KEY)"; srv="$(kvget SERVICE_ROLE_KEY)"
  if [ -n "$api" ] && [ -n "$anon" ] && [ -n "$srv" ]; then
    export NEXT_DIST_DIR=.next-e2e NEXT_PUBLIC_SUPABASE_URL="$api" NEXT_PUBLIC_SUPABASE_ANON_KEY="$anon" SUPABASE_SERVICE_ROLE_KEY="$srv"
    t1=$(date +%s)
    if ! (cd "$REPO" && npx next build) > "$TMP/e2e-build.log" 2>&1; then
      tail -40 "$TMP/e2e-build.log" >&2; fail="$fail · e2e: next build lỗi"
    else
      echo "[db:dung] e2e: build xong sau $(( $(date +%s) - t1 )) giây"
      (cd "$REPO" && exec "$REPO/node_modules/.bin/next" start -p "$E2E_PORT") > "$TMP/e2e-start.log" 2>&1 &
      E2E_PID=$!
      up=""; for _ in $(seq 1 60); do curl -fs -o /dev/null "http://localhost:$E2E_PORT/login" && { up=1; break; }; sleep 1; done
      if [ -z "$up" ]; then tail -20 "$TMP/e2e-start.log" >&2; fail="$fail · e2e: next start không lên :$E2E_PORT"
      else
        export PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL="http://localhost:$E2E_PORT"
        # Tài khoản seed ADMIN pilot: email lấy từ DB của stack, mật khẩu từ dòng «Password mặc định local» của file seed (không ghi cứng ở đây).
        export E2E_USER_EMAIL="${E2E_USER_EMAIL:-$(q -c "select email from auth.users where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001'")}"
        export E2E_USER_PASSWORD="${E2E_USER_PASSWORD:-$(sed -n 's/^-- Password mặc định local: \([^ ]*\).*/\1/p' "$REPO/supabase/seeds/01-pilot-nhan-su.sql")}"
        total="$(cd "$REPO" && npx playwright test "$E2E_SPEC" --list 2>/dev/null | sed -n 's/^Total: \([0-9]*\) test.*/\1/p')"
        (cd "$REPO" && npx playwright test "$E2E_SPEC" --reporter=list --output "$TMP/e2e-results") > "$TMP/e2e.log" 2>&1; rc=$?
        tail -120 "$TMP/e2e.log"
        # Workdir tạm bị xóa khi thoát: đỏ thì in ảnh chụp cây trang (error-context.md) ra log để chẩn đoán được trên CI.
        if [ "$rc" != 0 ]; then for f in "$TMP"/e2e-results/*/error-context.md; do [ -f "$f" ] && { echo "--- $(basename "$(dirname "$f")")"; head -200 "$f"; }; done; fi
        n() { sed -n "s/^ *\([0-9][0-9]*\) $1.*/\1/p" "$TMP/e2e.log" | tail -1; }
        ok=$(( ${total:-0} > 0 )) ; p="$(n passed)"; fl="$(n flaky)"
        if [ "$rc" != 0 ] || [ -n "$(n failed)" ] || [ -n "$(n skipped)" ] || [ -n "$(n 'did not run')" ] || [ "$ok" != 1 ] \
           || [ "$(( ${p:-0} + ${fl:-0} ))" != "$total" ]; then
          fail="$fail · e2e (passed ${p:-0}${fl:+ + flaky $fl}/${total:-?}, exit $rc)"
        else echo "[db:dung] e2e ${p:-0}/$total ca xanh${fl:+ (flaky $fl)}"; fi
      fi
    fi
  else fail="$fail · e2e: thiếu API_URL/ANON_KEY/SERVICE_ROLE_KEY từ supabase status"; fi
fi

if [ -n "$fail" ]; then echo "[db:dung] ĐỎ${fail}" >&2; exit 1; fi
echo "[db:dung] XANH (base bất biến: $base)"
