# Sunset `danh_muc_tuy_bien` - P0 Baseline Contract Map

> **Neo:** Sau sunset, danh mục lõi chỉ qua **`dm_*` + domain-registry** — [`AGENTS.md`](../../../AGENTS.md) §3.

Cập nhật: 2026-05-02

## 1) Mục tiêu P0 (đã vượt mốc)
- Khoa baseline inventory các điểm từng phụ thuộc `danh_muc_tuy_bien`.
- Chốt mapping `loai_danh_muc -> dm_*` làm source-of-truth.
- **Pha cuối (gộp một file):** [`supabase/migrations/20260511001_drop_danh_muc_tuy_bien_final.sql`](../../../supabase/migrations/20260511001_drop_danh_muc_tuy_bien_final.sql) — tạo `dm_hinh_thuc_giam_sat` + `dm_cach_thuc_giam_sat`, migrate dữ liệu, re-point + dọn `mdm_field_registry`, drop FK/policy, drop bảng hub + bảng phụ legacy, xoá permission `DM_TUY_BIEN`, cập nhật RPC `mdm_refresh_governance_suggestions`.

## 2) Mapping chốt (giữ nguyên)

| loai_danh_muc | bảng đích | trạng thái |
|---|---|---|
| `KHOI_KHOA` | `dm_khoi_khoa` | migrated |
| `KHOA_PHONG` | `dm_khoa_phong` | migrated |
| `TO_CONG_TAC` | `dm_to_cong_tac` | migrated |
| `CHUC_VU` | `dm_chuc_vu` | migrated |
| `CHUC_DANH` | `dm_chuc_danh` | migrated |
| `VAI_TRO_HE_THONG_KSNK` | `dm_vai_tro_ksnk` | migrated |
| `KHU_VUC_GIAM_SAT` | `dm_khu_vuc_giam_sat` | migrated |
| `NGHE_NGHIEP` | `dm_nghe_nghiep` | migrated |
| `LOAI_DUNG_CU` | `dm_loai_dung_cu` | migrated |
| `LOAI_SU_CO` | `dm_loai_su_co` | migrated |
| `LOAI_MAY_TIET_KHUAN` | `dm_loai_may_tiet_khuan` | migrated |
| `HINH_THUC_GIAM_SAT` | `dm_hinh_thuc_giam_sat` | migrated (SSOT, fact đang dùng text) |
| `CACH_THUC_GIAM_SAT` | `dm_cach_thuc_giam_sat` | migrated (SSOT, fact đang dùng text) |

Nguồn chốt mapping: `src/lib/master-data/domain-registry.ts`.

## 3) Trạng thái code (mốc hoàn tất)
- **Không còn** CRUD UI, import template, permission `DM_TUY_BIEN`, hay đọc runtime từ `danh_muc_tuy_bien`.
- Các file/migration cũ nhắc tên bảng hub **chỉ còn giá trị lịch sử** (replay migration từ đầu vẫn tạo rồi xóa bảng ở bước cuối).

## 4) Tiêu chí done (cập nhật)
- Trên DB sau khi chạy `20260511001_drop_danh_muc_tuy_bien_final.sql`: `to_regclass('public.danh_muc_tuy_bien')` = `NULL`.
- `dm_hinh_thuc_giam_sat`, `dm_cach_thuc_giam_sat` tồn tại; dữ liệu cũ (nếu có) đã migrate id sang.
- `mdm_field_registry` không còn dòng `source_table = 'danh_muc_tuy_bien'`.
- `permissions` không còn `module_name = 'DM_TUY_BIEN'`.
- App ưu tiên `dm_*` theo `domain-registry`; validation qua `repository.getDanhMucItemById` không còn hub.
- Script verify: `node scripts/mdm-coverage-gate.mjs`, `node scripts/mdm-fallback-audit.mjs`, `node scripts/mdm-governance-refresh.mjs` (theo môi trường).

## 5) Triển khai Supabase (khi lệch lịch sử migration)
- **Nhánh A:** project Supabase mới → `supabase link` → `supabase db push` → cập nhật `.env.local`.
- **Nhánh B:** giữ project → SQL repair (xem `scripts/repair-remote-schema-migration-20260424.sql` nếu còn version `20260424`) → `supabase db push`.
- Chi tiết gợi ý: `.env.example` (cuối file).
- Nếu CLI báo `Remote migration versions not found in local migrations directory`, **chưa** coi là lỗi migration SQL trong repo — cần sửa lịch sử trên project remote (A/B) rồi chạy lại `supabase db push` để áp `20260511001_drop_danh_muc_tuy_bien_final.sql`.

## 6) Sau deploy
1. Mở **Quản trị → Trung tâm Danh mục → Phân quyền hệ thống**: ma trận RBAC tự gọi `syncPermissionRegistry()` khi tải — đảm bảo bảng `permissions` khớp `permission-registry.ts`.
2. Smoke test từng trang `dm_*` (thêm/sửa/ẩn một bản ghi).
3. (Tuỳ chọn) `node scripts/verify-trung-tam-danh-muc-routes.mjs` kiểm tra file route tồn tại.

## 7) Giải thích dễ hiểu
- Trước: một bảng chung dễ nhầm loại UUID và khó ràng buộc FK đúng nghiệp vụ.
- Sau: mỗi danh mục lõi một bảng `dm_*`, Postgres giữ đúng kiểu tham chiếu; hub đã gỡ khỏi schema production sau migration cuối.

## 8) "Sửa tại chỗ" toàn DB vs tạo project mới — cái nào nhanh hơn?

**Không có câu trả lời chung:** phụ thuộc DB remote của bạn đang **lệch cái gì**.

| Tình huống | Nhanh hơn thường là |
|------------|---------------------|
| Chỉ **lệch bảng `schema_migrations`** (tên/version không khớp file local), còn **schema thực tế đã đúng** với repo | **Sửa tại chỗ:** chạy SQL repair (ví dụ `scripts/repair-remote-schema-migration-20260424.sql` nếu còn `version = 20260424`) → một lần `supabase db push`. Ít phút nếu đúng một lỗi. |
| **Nhiều** version mồ côi / đổi tên migration lung tung, hoặc schema tay đã sửa lệch khỏi repo | **Project mới + `db push`:** tránh đoán thủ công từng đối tượng; một lần replay toàn bộ `supabase/migrations/`. |
| **Cần giữ dữ liệu nghiệp vụ** trên project cũ | Bắt buộc **B** (repair + push từng phần / migration bù). **Không** xóa project. |
| **Chưa có dữ liệu thật / dev được reset** | **A** (project mới) gần như luôn **ít rủi ro và ít bước** hơn “rà và sửa hết” tay. |

**“Rà soát toàn bộ SQL trong repo”** (`supabase/migrations/*.sql`) là việc **đã nằm trong Git** — không thay thế việc **đồng bộ trạng thái trên cloud**. Trên Supabase, “chỉnh sửa toàn bộ database” thực chất là: (1) sửa lịch sử migration cho CLI chấp nhận, rồi `db push`; hoặc (2) DB trống + push một lượt; hoặc (3) viết migration **bù** cho drift — càng (3) càng chậm và dễ sót.

**Tôi không thể chạy SQL trên project của bạn từ đây.** Bạn làm theo thứ tự:

1. Mở Supabase **SQL Editor** (đúng project), chạy [`scripts/supabase-remote-audit.sql`](../../../scripts/supabase-remote-audit.sql) — xem `version/name`, hub còn không, vài bảng `dm_*`.
2. Nếu thấy `version = '20260424'` → chạy [`scripts/repair-remote-schema-migration-20260424.sql`](../../../scripts/repair-remote-schema-migration-20260424.sql) **một lần**, sau đó trên máy: `supabase db push`.
3. Nếu vẫn lỗi `Remote migration versions not found...` và **không cần** giữ data → tạo **project mới**, `supabase link`, `supabase db push`, cập nhật `.env.local`.
4. Sau khi push thành công, kiểm tra lại mục (1): có `20260510001`, `20260510002`; `to_regclass('public.danh_muc_tuy_bien')` = `NULL`.
