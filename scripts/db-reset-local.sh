#!/usr/bin/env bash
# Dựng lại DB local (stack supabase_*_ksnk_bv103) từ chuỗi migration của repo — KHÔNG sửa supabase/migrations/.
# Lý do: chuỗi repo không dựng được DB sạch (perf_rls_initplan guard altered=139, 20261004194907) vì commit f44b7705
# đã stub migration đã áp 20260729121000. PO duyệt 2026-11-18 «thay ở bản sao» (.claude/plans/KH_APPKSNK_20261118_squash-migration.md §7).
# Cách làm: workdir tạm tên đúng `ksnk_bv103` (config.toml không có project_id → CLI lấy tên thư mục), migrations = symlink
# tới mọi *.sql của repo, riêng file stub thay bằng nội dung trước f44b7705 dưới CÙNG tên file (ledger khớp repo).
# CHƯA phải baseline từ prod: DB này còn lệch prod ở các migration bị sửa sau khi áp (KH squash §7: 27 file).
# Dùng: bash scripts/db-reset-local.sh      (xóa dữ liệu DB local; sau đó tùy chọn: npx tsx scripts/admin-rbac-sync.ts --local --with-presets)
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
STUB="20260729121000_bang_muc_tieu_cu_da_go.sql"
ORIG_REF="f44b7705^:supabase/migrations/20260729121000_ksnk_dm_muc_tieu_kpi.sql"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/ksnk-reset.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
WD="$TMP/ksnk_bv103"
mkdir -p "$WD/supabase/migrations"
for f in config.toml seed.sql seeds; do ln -s "$REPO/supabase/$f" "$WD/supabase/$f"; done

n=0
for src in "$REPO"/supabase/migrations/*.sql; do
  ln -s "$src" "$WD/supabase/migrations/$(basename "$src")"
  n=$((n + 1))
done
[ -L "$WD/supabase/migrations/$STUB" ] || { echo "không thấy $STUB trong repo — dừng" >&2; exit 2; }
rm "$WD/supabase/migrations/$STUB"
git -C "$REPO" show "$ORIG_REF" > "$WD/supabase/migrations/$STUB"
echo "[db-reset-local] $n migration, thay ở bản sao: $STUB <- $ORIG_REF"

cd "$REPO"
start=$(date +%s)
npx supabase db reset --local --workdir "$WD"
echo "[db-reset-local] xong sau $(( $(date +%s) - start )) giây; ledger phải có $n dòng"
