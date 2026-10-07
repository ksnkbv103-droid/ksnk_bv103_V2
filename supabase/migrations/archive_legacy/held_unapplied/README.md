Ba file này chưa có trên production. Không đưa lên `supabase/migrations/` cho đến khi có migration mới thay thế.

- `20260722100000_gstt_bang_kiem_rls_drop_permissive.sql` — xóa SELECT bảng kiểm mà dashboard đang dùng.
- `20260824120000_cssd_fact_su_co_write_rls.sql` — thêm INSERT sự cố CSSD bằng JWT.
- `20260910123000_nkbv_fn_major_type_ch17.sql` — CREATE OR REPLACE cũ hơn bản `20261005033000` đã apply.
