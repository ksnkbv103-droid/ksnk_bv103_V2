-- Lát K1 (rà soát kho dụng cụ 2026-10-12): khóa hàm nội bộ ghi sổ + ràng buộc dấu số lượng.
-- CHƯA APPLY PROD — chờ PO duyệt (prod qua MCP apply_migration).
--
-- Lỗi: baseline cấp EXECUTE mặc định cho anon/authenticated; migration 20260925010536 chỉ REVOKE FROM PUBLIC
-- nên 9 hàm SECURITY DEFINER bên trong vẫn gọi được qua PostgREST /rpc. Hàm `fn_cssd_apply_instrument_ledger_tx`
-- không tự kiểm quyền → ghi sổ, đổi kho dự phòng, sửa metadata.bom_lines bỏ qua rpc_* bọc ngoài.
-- Ba hàm rpc_* đã khóa ở 20261011090000. App gọi qua service_role; các hàm này chỉ được gọi từ hàm DEFINER khác.

BEGIN;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname = ANY (ARRAY[
        'fn_cssd_set_thuc_te',
        'fn_cssd_assert_ledger_write',
        'fn_cssd_resolve_ledger_actor',
        'fn_cssd_append_chi_tiet_issue_note',
        'fn_cssd_ensure_bom_lines',
        'fn_cssd_transfer_bom_metadata',
        'fn_cssd_apply_instrument_ledger_tx',
        'fn_cssd_apply_instrument_lines_tx',
        'fn_cssd_ensure_chi_tiet_for_ledger'
      ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- Dấu số lượng theo loại: hỏng/mất/trả kho là trừ, bổ sung là cộng; điều chuyển có cả hai chiều (nguồn −, đích +).
-- NOT VALID: chỉ áp cho dòng mới, không quét/ném lỗi dữ liệu cũ.
ALTER TABLE public.cssd_fact_kho_giao_dich
  DROP CONSTRAINT IF EXISTS cssd_fact_kho_giao_dich_dau_so_luong_check;
ALTER TABLE public.cssd_fact_kho_giao_dich
  ADD CONSTRAINT cssd_fact_kho_giao_dich_dau_so_luong_check
  CHECK (
    loai_giao_dich = 'DIEU_CHUYEN'
    OR (loai_giao_dich = 'BO_SUNG' AND so_luong_thay_doi > 0)
    OR (loai_giao_dich IN ('BAO_HONG', 'BAO_MAT', 'NHAP_KHO') AND so_luong_thay_doi < 0)
  ) NOT VALID;

COMMIT;
