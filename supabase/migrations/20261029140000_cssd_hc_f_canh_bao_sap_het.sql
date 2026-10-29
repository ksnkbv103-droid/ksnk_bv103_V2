-- HC-F (PO 2026-10-29): tham số cảnh báo «sắp hết» do ADMIN đặt theo mặt hàng.
-- ty_le_canh_bao_pct: báo khi tồn ≤ % lượng nhập đã duyệt 30 ngày gần nhất (mặc định 20).
-- so_ngay_cho_hang:   báo khi số ngày dùng được (tồn / xuất «Cấp sử dụng» TB ngày) < số ngày chờ hàng (mặc định 14).
-- Additive; idempotent. View v_cssd_hoa_chat_full thêm 2 cột ở CUỐI.

BEGIN;

ALTER TABLE public.cssd_dm_hoa_chat
  ADD COLUMN IF NOT EXISTS ty_le_canh_bao_pct numeric(5,2) NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS so_ngay_cho_hang integer NOT NULL DEFAULT 14;

ALTER TABLE public.cssd_dm_hoa_chat
  DROP CONSTRAINT IF EXISTS cssd_dm_hoa_chat_ty_le_canh_bao_chk,
  DROP CONSTRAINT IF EXISTS cssd_dm_hoa_chat_so_ngay_cho_hang_chk;
ALTER TABLE public.cssd_dm_hoa_chat
  ADD CONSTRAINT cssd_dm_hoa_chat_ty_le_canh_bao_chk CHECK (ty_le_canh_bao_pct >= 0 AND ty_le_canh_bao_pct <= 100),
  ADD CONSTRAINT cssd_dm_hoa_chat_so_ngay_cho_hang_chk CHECK (so_ngay_cho_hang >= 0 AND so_ngay_cho_hang <= 365);

CREATE OR REPLACE VIEW public.v_cssd_hoa_chat_full
WITH (security_invoker = true) AS
SELECT hc.id,
       hc.ma_hoa_chat,
       hc.ten_hoa_chat,
       hc.loai_hoa_chat,
       hc.don_vi_tinh,
       hc.specs ->> 'quy_cach'::text AS quy_cach,
       hc.specs ->> 'nong_do'::text AS nong_do,
       hc.han_su_dung,
       hc.specs ->> 'ghi_chu'::text AS ghi_chu,
       hc.nguong_ton_toi_thieu,
       hc.is_active,
       hc.created_at,
       hc.updated_at,
       hc.specs,
       hc.nhom_id,
       n.ten AS nhom_ten,
       hc.ty_le_canh_bao_pct,
       hc.so_ngay_cho_hang
FROM public.cssd_dm_hoa_chat hc
LEFT JOIN public.cssd_dm_hoa_chat_nhom n ON n.id = hc.nhom_id;

COMMIT;

-- CHƯA APPLY PROD — chờ PO.
-- Rollback: DROP VIEW + tạo lại 16 cột (định nghĩa HC-D 20261028110000); ALTER TABLE DROP COLUMN 2 cột + 2 constraint.
