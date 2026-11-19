# ADR 20261119 — NEN-012: khôi phục migration 20261114180000 và gỡ tác dụng bằng migration mới

Dòng sổ lỗi: NEN-012 (PO 19/11 P4 = A). Migration: `supabase/migrations/20261119170000_nen_012_go_rls_hoi_dong_identity.sql`. File được khôi phục nguyên văn từ `main`: `supabase/migrations/20261114180000_nkbv_fact_select_rls_hoi_dong_identity.sql`.

## Bối cảnh

- `20261114180000` (NKBV-035) tạo hàm `fn_nkbv_actor_identity_denied()` và sáu policy RESTRICTIVE `*_select_hoi_dong_deny` trên `nkbv_fact_*` để Hội đồng KSNK thuần không đọc danh tính. Có ở `main` (commit `6807091d`).
- PO 17/11 K5: Hội đồng KSNK được thấy danh tính, không áp lên prod. `aecd3eb6` xóa file khỏi `integrate/2026-11`.
- Luật bất biến (PO 19/11, `guard-migrations.mjs --bat-bien --base origin/main`): file migration có ở `main` không được xóa. Xóa file làm `db-dung.yml` đỏ khi PR integrate → main.
- Prod (list_migrations 19/11, chỉ đọc): không có bản ghi `nkbv_fact_select_rls_hoi_dong_identity`; bản ghi cuối `20261118213521`. File chưa áp prod.

## Phương án

- A. Khôi phục file nguyên văn từ `main` + migration mới gỡ policy/hàm (chọn, PO P4 = A).
- B. Ngoại lệ trong guard cho riêng file này.
- C. Squash chuỗi migration (kế hoạch squash 18/11).

## Phản biện

- B: sửa hàng rào bất biến để lách chính nó; mọi lần sau lại xin ngoại lệ.
- C: lớn, lệch ledger local 28 file (plan squash §7), policy `Authenticated users can read dm_khoa_phong` trên prod nằm ngoài migration nên có nguy cơ mất khi squash; không thuộc lát này.
- A: chuỗi dựng từ đầu (`db:dung`) tạo rồi gỡ ngay, kết quả như chưa có NKBV-035. Trên prod migration mới là no-op (`DROP ... IF EXISTS`), không đổi quyền ai. Không thêm hàm SECURITY DEFINER nên `acl-snapshot` không đổi so với trạng thái local hiện tại (đã gỡ 19/11).

## Chọn

Phương án A. Kiểm chứng: `node scripts/guard-migrations.mjs --bat-bien --base origin/main` hết FAIL; `npm run db:dung` dựng cả chuỗi; sau dựng, `pg_policies` không còn `*_select_hoi_dong_deny` và `to_regprocedure('public.fn_nkbv_actor_identity_denied()')` là NULL. Hoàn tác: chạy lại nội dung `20261114180000`.
