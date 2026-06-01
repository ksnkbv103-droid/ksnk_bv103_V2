# Migration Squash Runbook — BV103 Pilot Baseline

> **Phiên bản:** 1.0 (30/05/2026)  
> **Áp dụng khi:** Local đã squash 90 migration → `20260530000000_init_pilot_baseline.sql`, nhưng **linked/staging/prod** vẫn còn 90 dòng trong `supabase_migrations.schema_migrations`.

---

## 1. Tóm tắt rủi ro

| Tình huống | Hậu quả nếu làm sai |
|------------|---------------------|
| `supabase db push` blind lên DB có 90 migration cũ | CLI báo lệch version / cố apply baseline trùng schema → fail hoặc conflict |
| Xóa `schema_migrations` không backup | Mất audit trail migration trên remote |
| Repair sai version | DB schema đúng nhưng CLI không apply migration mới |

**Nguyên tắc:** Chỉ repair **sau khi** xác nhận schema remote **đã khớp** baseline (cùng bảng prefix, cùng RPC). Nếu schema lệch → restore/pg_dump trước, không repair mù.

---

## 2. Precheck (bắt buộc)

Chạy trên môi trường linked:

```bash
npm run trial:db:precheck          # hoặc trial:db:precheck:local
npm run trial:auth:precheck        # auth.users ↔ mdm_nhan_su
npx supabase migration list --linked
```

Ghi nhận:
- Số migration trên remote (kỳ vọng ~90 nếu chưa squash)
- Có/không có bảng `gstt_dm_bang_kiem`, `sys_lookup_value`, `cssd_fact_quy_trinh` (prefix mới)

---

## 3. Chiến lược A — Schema remote đã khớp baseline (khuyến nghị staging)

Dùng khi DB linked **đã apply đủ** chuỗi `20260520*`–`20260529*` và schema trùng pg_dump baseline.

### Bước 1: Backup

```bash
# Supabase Dashboard → Database → Backups (hoặc pg_dump thủ công)
pg_dump "$DATABASE_URL" -Fc -f bv103-pre-squash-$(date +%Y%m%d).dump
```

### Bước 2: Repair migration history

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>

# Đánh dấu TOÀN BỘ migration cũ là reverted (không đụng schema)
npx supabase migration repair --status reverted 20260520000000
# ... lặp cho từng version cũ HOẶC script batch (xem §5)

# Đánh dấu baseline mới là applied
npx supabase migration repair --status applied 20260530000000
```

### Bước 3: Verify

```bash
npx supabase migration list --linked   # chỉ còn 20260530000000 applied
npm run verify:mdm                     # hoặc verify:mdm:local
npm run verify:engineering
```

### Bước 4: Seed RBAC pilot (optional trên staging)

Staging **không** tự nạp `01-pilot-nhan-su.sql` auth local trừ khi chủ đích. Chỉ dùng `00-rbac.sql` logic hoặc sync qua UI **Phân quyền → Đồng bộ registry**.

---

## 4. Chiến lược B — Schema remote lệch / chưa đủ migration

1. **Không** repair.
2. Apply nốt migration còn thiếu từ archive: giải nén `docs/archive/pilot_chain_20260520_20260529.tar.gz`.
3. Khi schema khớp baseline → quay lại Chiến lược A.
4. Nếu không thể: restore backup + làm sạch branch deploy.

---

## 5. Script batch repair (staging)

Tạo file danh sách version cũ từ archive:

```bash
tar -tzf docs/archive/pilot_chain_20260520_20260529.tar.gz | head \
  | sed 's/.*\///;s/_.*//' \
  | sort -u > /tmp/old_versions.txt
```

Repair từng dòng (review trước khi chạy):

```bash
while read ver; do
  npx supabase migration repair --status reverted "$ver"
done < /tmp/old_versions.txt

npx supabase migration repair --status applied 20260530000000
```

---

## 6. Local developer workflow (sau squash)

```bash
npx supabase db reset --local
# Nạp: seed.sql → seeds/00-rbac.sql → seeds/01-pilot-nhan-su.sql
# Login local: ksnkbv103@gmail.com / Pilot@103
npm run verify:engineering
```

---

## 7. Rollback

| Mức | Hành động |
|-----|-----------|
| Repair sai, schema OK | Sửa lại `schema_migrations` bằng repair ngược |
| Schema hỏng | Restore pg_dump §3 Bước 1 |
| App lỗi view alias | Migration `20260530100000_drop_view_compat_aliases.sql` chỉ DROP alias — rollback bằng re-apply baseline hoặc CREATE VIEW alias lại từ archive `20260526000010` |

---

## 8. Liên quan

- Archive chain: `docs/archive/pilot_chain_20260520_20260529.tar.gz`
- Baseline SSOT: `supabase/migrations/20260530000000_init_pilot_baseline.sql`
- View alias Step 2: `docs/archive/baselines/view-rename-mapping-20260526.md`
- Mapping changelog: `docs/core/implementation-mapping.md`
