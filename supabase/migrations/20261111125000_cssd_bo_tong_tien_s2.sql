-- Lát C′ S2-fix / file A: chạy TRƯỚC 20261111130000 (S2) trên prod. Local đã chạy S2 rồi → file này vô hại
-- (idempotent: bảng IF NOT EXISTS, chụp ON CONFLICT DO NOTHING giữ giá trị cũ nhất, Major 2 không còn dòng).
-- Áp trong MỘT giao dịch (psql -1).
--   Major 3: bảng sao lưu thường cssd_bak_s2_bo_tong (RLS bật, không policy, thu quyền anon/authenticated)
--            chụp mọi cột S2/core sẽ đổi, để khôi phục được (SQL khôi phục ở cuối file, dạng comment).
--            Ngoài yêu cầu tối thiểu: chụp thêm so_luong/ghi_chu/is_active của dòng trên BỘ TỔNG trong họ
--            (S2 D1 cộng so_luong vào dòng giữ trên tổng), ghi_chu dòng con, ma_qr_bo_vinh_vien quy trình,
--            trang_thai bộ con — thiếu thì khôi phục sẽ đếm đôi số lượng.
--   Major 2: dòng active nằm trên bộ con CN/KCN đã tắt (is_active IS NOT TRUE) chưa từng được tính vào tồn
--            (view realtime lọc bộ active). Tắt mềm chúng TRƯỚC S2 để S2 không cộng lên bộ tổng → tồn giữ nguyên.

-- 1. Bảng sao lưu (Major 3) ----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cssd_bak_s2_bo_tong (
  bang_nguon text NOT NULL,
  ban_ghi_id uuid NOT NULL,
  cot text NOT NULL,
  gia_tri_cu text,
  thoi_diem timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cssd_bak_s2_bo_tong_pkey PRIMARY KEY (bang_nguon, ban_ghi_id, cot)
);
COMMENT ON TABLE public.cssd_bak_s2_bo_tong IS
  'C′ S2: sao lưu giá trị trước S2 (chỉ service/postgres đọc). Khôi phục: xem cuối migration 20261111125000.';
ALTER TABLE public.cssd_bak_s2_bo_tong ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cssd_bak_s2_bo_tong FROM PUBLIC, anon, authenticated;

-- 2. Chụp (trước mọi thay đổi) -----------------------------------------------------------------------------------
-- 2a. Dòng chi tiết trên bộ con CN/KCN (mọi trạng thái) và trên bộ tổng của họ có con CN/KCN.
INSERT INTO public.cssd_bak_s2_bo_tong (bang_nguon, ban_ghi_id, cot, gia_tri_cu)
SELECT 'cssd_dm_bo_dung_cu_chi_tiet', c.id, v.cot, v.gia_tri
  FROM public.cssd_dm_bo_dung_cu_chi_tiet c
  JOIN public.cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
 CROSS JOIN LATERAL (VALUES
   ('bo_dung_cu_id', c.bo_dung_cu_id::text),
   ('is_active', c.is_active::text),
   ('so_luong', c.so_luong::text),
   ('ghi_chu', c.ghi_chu)) v(cot, gia_tri)
 WHERE (b.parent_bo_id IS NOT NULL AND b.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET'))
    OR (b.parent_bo_id IS NULL AND EXISTS (
          SELECT 1 FROM public.cssd_dm_bo_dung_cu k
           WHERE k.parent_bo_id = b.id AND k.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')))
ON CONFLICT DO NOTHING;

-- 2b. Giao dịch kho trỏ bộ con CN/KCN.
INSERT INTO public.cssd_bak_s2_bo_tong (bang_nguon, ban_ghi_id, cot, gia_tri_cu)
SELECT 'cssd_fact_kho_giao_dich', g.id, 'bo_dung_cu_id', g.bo_dung_cu_id::text
  FROM public.cssd_fact_kho_giao_dich g
  JOIN public.cssd_dm_bo_dung_cu b ON b.id = g.bo_dung_cu_id
 WHERE b.parent_bo_id IS NOT NULL AND b.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
ON CONFLICT DO NOTHING;

-- 2c. Quy trình trên bộ con CN/KCN.
INSERT INTO public.cssd_bak_s2_bo_tong (bang_nguon, ban_ghi_id, cot, gia_tri_cu)
SELECT 'cssd_fact_quy_trinh', q.id, v.cot, v.gia_tri
  FROM public.cssd_fact_quy_trinh q
  JOIN public.cssd_dm_bo_dung_cu b ON b.id = q.bo_dung_cu_id
 CROSS JOIN LATERAL (VALUES
   ('bo_dung_cu_id', q.bo_dung_cu_id::text),
   ('ma_qr_quy_trinh', q.ma_qr_quy_trinh::text),
   ('ma_qr_bo_vinh_vien', q.ma_qr_bo_vinh_vien),
   ('is_active', q.is_active::text)) v(cot, gia_tri)
 WHERE b.parent_bo_id IS NOT NULL AND b.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
ON CONFLICT DO NOTHING;

-- 2d. Bộ con CN/KCN.
INSERT INTO public.cssd_bak_s2_bo_tong (bang_nguon, ban_ghi_id, cot, gia_tri_cu)
SELECT 'cssd_dm_bo_dung_cu', b.id, v.cot, v.gia_tri
  FROM public.cssd_dm_bo_dung_cu b
 CROSS JOIN LATERAL (VALUES ('is_active', b.is_active::text), ('trang_thai', b.trang_thai::text)) v(cot, gia_tri)
 WHERE b.parent_bo_id IS NOT NULL AND b.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
ON CONFLICT DO NOTHING;

-- 3. Tắt mềm dòng active trên bộ con CN/KCN đã tắt (Major 2) ---------------------------------------------------
-- Guard trg_cssd_bom_chi_tiet_guard_ho bỏ qua dòng NEW.is_active=false → không khóa, không chặn.
DO $$
DECLARE
  v_r record;
  v_n int := 0;
BEGIN
  FOR v_r IN
    WITH u AS (
      UPDATE public.cssd_dm_bo_dung_cu_chi_tiet c
         SET is_active = false,
             ghi_chu = concat_ws(' · ', NULLIF(btrim(COALESCE(c.ghi_chu, '')), ''), 'S2-tiền: tắt (bộ con đã tắt)'),
             updated_at = now()
        FROM public.cssd_dm_bo_dung_cu b
       WHERE b.id = c.bo_dung_cu_id
         AND c.is_active
         AND b.parent_bo_id IS NOT NULL
         AND b.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
         AND b.is_active IS NOT TRUE
      RETURNING c.id, b.ma_bo, c.loai_dung_cu_id, c.so_luong
    )
    SELECT u.id, u.ma_bo, l.ma_loai, u.so_luong
      FROM u LEFT JOIN public.cssd_dm_loai_dung_cu l ON l.id = u.loai_dung_cu_id
     ORDER BY u.ma_bo, l.ma_loai
  LOOP
    v_n := v_n + 1;
    RAISE NOTICE 'S2-tiền tắt dòng trên bộ con đã tắt: % / loại % / sl % / dòng %', v_r.ma_bo, v_r.ma_loai, v_r.so_luong, v_r.id;
  END LOOP;
  RAISE NOTICE 'S2-tiền: % dòng active trên bộ con đã tắt đã tắt mềm', v_n;
END $$;

-- CHƯA APPLY PROD — chờ PO. Thứ tự prod: 20261111100000 → 110000 → 120000 → 125000 (file này) → 130000 (S2) → 140000.
-- Rủi ro: Major 2 đổi thành phần hiệu lực của họ (core/view hiệu lực tính dòng trên con bất kể con active) → một họ
-- có thể hết điều kiện tách ở lần đồng bộ sau; đo trước bằng (2)(3) dưới đây.
--
-- Kiểm prod (chỉ đọc, chạy TRƯỚC file này):
--   SHOW max_locks_per_transaction; SHOW max_connections;
--   SELECT
--     -- (1) dòng trên con EO trùng loại với dòng active của bộ tổng/con CN/KCN cùng họ (Major 1)
--     (SELECT count(*) FROM cssd_dm_bo_dung_cu_chi_tiet e JOIN cssd_dm_bo_dung_cu eb ON eb.id = e.bo_dung_cu_id
--       WHERE e.is_active AND eb.vai_tro_tach = 'KHONG_CHIU_NHIET_EO' AND EXISTS (
--         SELECT 1 FROM cssd_dm_bo_dung_cu_chi_tiet c JOIN cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
--          WHERE c.is_active AND c.loai_dung_cu_id = e.loai_dung_cu_id
--            AND (b.id = eb.parent_bo_id OR (b.parent_bo_id = eb.parent_bo_id AND b.vai_tro_tach IN ('CHIU_NHIET','KHONG_CHIU_NHIET'))))) AS dong_eo_trung_loai_ho,
--     -- (2) dòng active trên bộ con CN/KCN đã tắt (Major 2 sẽ tắt mềm)
--     (SELECT count(*) FROM cssd_dm_bo_dung_cu_chi_tiet c JOIN cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
--       WHERE c.is_active AND b.parent_bo_id IS NOT NULL AND b.vai_tro_tach IN ('CHIU_NHIET','KHONG_CHIU_NHIET')
--         AND b.is_active IS NOT TRUE) AS dong_active_tren_con_da_tat,
--     -- (3) nhóm trùng (bộ tổng, loại) có ít nhất một dòng trên con đã tắt
--     (SELECT count(*) FROM (SELECT b.parent_bo_id, c.loai_dung_cu_id
--        FROM cssd_dm_bo_dung_cu_chi_tiet c JOIN cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
--       WHERE c.is_active AND c.loai_dung_cu_id IS NOT NULL AND b.parent_bo_id IS NOT NULL
--         AND b.vai_tro_tach IN ('CHIU_NHIET','KHONG_CHIU_NHIET') AND b.is_active IS NOT TRUE
--         AND (SELECT count(*) FROM cssd_dm_bo_dung_cu_chi_tiet c2 JOIN cssd_dm_bo_dung_cu b2 ON b2.id = c2.bo_dung_cu_id
--               WHERE c2.is_active AND c2.loai_dung_cu_id = c.loai_dung_cu_id
--                 AND (b2.id = b.parent_bo_id OR (b2.parent_bo_id = b.parent_bo_id AND b2.vai_tro_tach IN ('CHIU_NHIET','KHONG_CHIU_NHIET')))) > 1
--       GROUP BY 1, 2) x) AS nhom_trung_co_con_da_tat,
--     current_setting('max_locks_per_transaction') AS max_locks_per_transaction;
--
-- KHÔI PHỤC từ bảng sao lưu (chỉ khi PO quyết; chạy một giao dịch, sau khi đã gỡ S2/140000 nếu cần).
-- Quy trình do core tạo SAU thoi_diem trên bộ con không có trong bảng → vô hiệu tay theo created_at nếu cần.
--   BEGIN;
--   SET CONSTRAINTS ALL IMMEDIATE;
--   ALTER TABLE cssd_dm_bo_dung_cu_chi_tiet DISABLE TRIGGER trg_cssd_bom_chi_tiet_guard_ho;
--   ALTER TABLE cssd_fact_kho_giao_dich DISABLE TRIGGER trg_cssd_kho_gd_quy_ve_bo_tong;
--   ALTER TABLE cssd_fact_quy_trinh DISABLE TRIGGER trg_cssd_qt_bo_con_dong_bo_tach_nhiet;
--   ALTER TABLE cssd_dm_bo_dung_cu DISABLE TRIGGER trg_cssd_bo_tong_bat_tat_dong_bo;
--   -- quy trình
--   UPDATE cssd_fact_quy_trinh q SET
--       bo_dung_cu_id = (SELECT gia_tri_cu::uuid FROM cssd_bak_s2_bo_tong k WHERE k.bang_nguon='cssd_fact_quy_trinh' AND k.ban_ghi_id=q.id AND k.cot='bo_dung_cu_id'),
--       ma_qr_quy_trinh = (SELECT gia_tri_cu FROM cssd_bak_s2_bo_tong k WHERE k.bang_nguon='cssd_fact_quy_trinh' AND k.ban_ghi_id=q.id AND k.cot='ma_qr_quy_trinh'),
--       ma_qr_bo_vinh_vien = (SELECT gia_tri_cu FROM cssd_bak_s2_bo_tong k WHERE k.bang_nguon='cssd_fact_quy_trinh' AND k.ban_ghi_id=q.id AND k.cot='ma_qr_bo_vinh_vien'),
--       is_active = (SELECT gia_tri_cu::boolean FROM cssd_bak_s2_bo_tong k WHERE k.bang_nguon='cssd_fact_quy_trinh' AND k.ban_ghi_id=q.id AND k.cot='is_active'),
--       updated_at = now()
--    WHERE q.id IN (SELECT ban_ghi_id FROM cssd_bak_s2_bo_tong WHERE bang_nguon='cssd_fact_quy_trinh');
--   -- bộ con
--   UPDATE cssd_dm_bo_dung_cu b SET
--       is_active = (SELECT gia_tri_cu::boolean FROM cssd_bak_s2_bo_tong k WHERE k.bang_nguon='cssd_dm_bo_dung_cu' AND k.ban_ghi_id=b.id AND k.cot='is_active'),
--       trang_thai = (SELECT gia_tri_cu FROM cssd_bak_s2_bo_tong k WHERE k.bang_nguon='cssd_dm_bo_dung_cu' AND k.ban_ghi_id=b.id AND k.cot='trang_thai'),
--       updated_at = now()
--    WHERE b.id IN (SELECT ban_ghi_id FROM cssd_bak_s2_bo_tong WHERE bang_nguon='cssd_dm_bo_dung_cu');
--   -- dòng chi tiết
--   UPDATE cssd_dm_bo_dung_cu_chi_tiet c SET
--       bo_dung_cu_id = (SELECT gia_tri_cu::uuid FROM cssd_bak_s2_bo_tong k WHERE k.bang_nguon='cssd_dm_bo_dung_cu_chi_tiet' AND k.ban_ghi_id=c.id AND k.cot='bo_dung_cu_id'),
--       is_active = (SELECT gia_tri_cu::boolean FROM cssd_bak_s2_bo_tong k WHERE k.bang_nguon='cssd_dm_bo_dung_cu_chi_tiet' AND k.ban_ghi_id=c.id AND k.cot='is_active'),
--       so_luong = (SELECT gia_tri_cu::int FROM cssd_bak_s2_bo_tong k WHERE k.bang_nguon='cssd_dm_bo_dung_cu_chi_tiet' AND k.ban_ghi_id=c.id AND k.cot='so_luong'),
--       ghi_chu = (SELECT gia_tri_cu FROM cssd_bak_s2_bo_tong k WHERE k.bang_nguon='cssd_dm_bo_dung_cu_chi_tiet' AND k.ban_ghi_id=c.id AND k.cot='ghi_chu'),
--       updated_at = now()
--    WHERE c.id IN (SELECT ban_ghi_id FROM cssd_bak_s2_bo_tong WHERE bang_nguon='cssd_dm_bo_dung_cu_chi_tiet');
--   -- sổ kho
--   UPDATE cssd_fact_kho_giao_dich g SET bo_dung_cu_id = k.gia_tri_cu::uuid, updated_at = now()
--     FROM cssd_bak_s2_bo_tong k WHERE k.bang_nguon='cssd_fact_kho_giao_dich' AND k.ban_ghi_id=g.id AND k.cot='bo_dung_cu_id';
--   ALTER TABLE cssd_dm_bo_dung_cu_chi_tiet ENABLE TRIGGER trg_cssd_bom_chi_tiet_guard_ho;
--   ALTER TABLE cssd_fact_kho_giao_dich ENABLE TRIGGER trg_cssd_kho_gd_quy_ve_bo_tong;
--   ALTER TABLE cssd_fact_quy_trinh ENABLE TRIGGER trg_cssd_qt_bo_con_dong_bo_tach_nhiet;
--   ALTER TABLE cssd_dm_bo_dung_cu ENABLE TRIGGER trg_cssd_bo_tong_bat_tat_dong_bo;
--   COMMIT;
