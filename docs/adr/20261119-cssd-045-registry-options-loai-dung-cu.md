# ADR 20261119 — CSSD-045: rpc_get_registry_options nhánh LOAI_DUNG_CU đọc đúng cột

Dòng sổ lỗi: CSSD-045 (DA_XAC_MINH). Migration: `supabase/migrations/20261119130000_cssd_045_registry_options_loai_dung_cu.sql`. Định nghĩa gốc `20260704100000_drop_ipac_zone_color_system.sql` (dòng 28–81) đã áp prod nên không sửa, thêm migration mới.

## Bối cảnh

- Nhánh `WHEN 'LOAI_DUNG_CU'` của `public.rpc_get_registry_options` đọc `ten_loai_dung_cu`, `ma_loai_dung_cu` từ `public.cssd_dm_loai_dung_cu`; bảng hiện chỉ có `ten_loai`, `ma_loai` (`\d` trên DB local). Gọi RPC với `LOAI_DUNG_CU` lỗi `42703`; `supabase db lint --level error` báo đúng một lỗi này (mốc `scripts/data/db-lint-baseline.json`, `so_loi: 1`).
- Nơi gọi hiện tại (`master-data-gateway.actions.ts`, `nhan-su-read.actions.ts`, `giam-sat-chung-read.actions.ts`) không truyền `LOAI_DUNG_CU`, nên chưa có màn hình nào hỏng; lỗi là bẫy cho người gọi sau và chặn hạ mốc lint.

## Phương án

- A. `CREATE OR REPLACE` cùng chữ ký, chỉ đổi nhánh `LOAI_DUNG_CU` sang `ten_loai AS ten, ma_loai AS ma`; giữ `SECURITY DEFINER`, `search_path`, các nhánh khác và ACL.
- B. Bỏ nhánh `LOAI_DUNG_CU` khỏi RPC (không ai gọi).
- C. Thêm cột sinh `ten_loai_dung_cu`/`ma_loai_dung_cu` vào bảng.

## Phản biện

- B đổi hợp đồng RPC (khóa danh mục im lặng trả rỗng thay vì dữ liệu), trái `domain-registry.ts` vẫn khai báo `LOAI_DUNG_CU` với `ma_loai`/`ten_loai`.
- C thêm cột trùng lặp, trái quy tắc không de-normalization.
- A nhỏ nhất, shape trả về `{id, ten, ma}` giữ như cũ, lọc `is_active = true` như cũ.

## Chọn

Phương án A. Kiểm chứng: `supabase/tests/database/cssd_045_registry_options_loai_dung_cu.test.sql` (không lỗi `42703`, mỗi phần tử có `id/ten/ma`, chỉ dòng `is_active`, nhánh `KHOA_PHONG` vẫn chạy, ACL không đổi) và `supabase db lint --level error` về 0 lỗi. Hoàn tác: `CREATE OR REPLACE` lại thân hàm như `20260704100000` (nhánh `LOAI_DUNG_CU` dùng tên cột cũ).
