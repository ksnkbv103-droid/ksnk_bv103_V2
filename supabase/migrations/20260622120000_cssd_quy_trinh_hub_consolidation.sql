-- CSSD P2: gộp BOM + lifecycle vào cssd_fact_quy_trinh (hub).
-- Drop: cssd_fact_lifecycle_event, cssd_fact_quy_trinh_thanh_phan,
--       cssd_fact_dieu_chuyen_thanh_phan, cssd_fact_kho_chi_tiet (pilot).

ALTER TABLE public.cssd_fact_quy_trinh
  ADD COLUMN IF NOT EXISTS bom_kiem_dem_at timestamptz,
  ADD COLUMN IF NOT EXISTS bom_kiem_dem_boi_id uuid REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.cssd_fact_quy_trinh.bom_kiem_dem_at IS 'Thời điểm hoàn tất Digital BOM tại trạm Đóng gói.';
COMMENT ON COLUMN public.cssd_fact_quy_trinh.bom_kiem_dem_boi_id IS 'Nhân sự xác nhận BOM (mdm_nhan_su.id).';

-- Backfill metadata.bom_lines từ bảng cấu phần cũ (nếu còn dữ liệu).
UPDATE public.cssd_fact_quy_trinh q
SET
  metadata = jsonb_set(
    coalesce(q.metadata, '{}'::jsonb),
    '{bom_lines}',
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'line_key', coalesce(tp.dm_bo_dung_cu_chi_tiet_id::text, tp.id::text),
            'chi_tiet_id', tp.dm_bo_dung_cu_chi_tiet_id,
            'ten_dung_cu_le', tp.ten_dung_cu_le,
            'so_luong_ke_hoach', tp.so_luong_ke_hoach,
            'so_luong_thuc_te', tp.so_luong_thuc_te
          )
          ORDER BY tp.ten_dung_cu_le
        )
        FROM public.cssd_fact_quy_trinh_thanh_phan tp
        WHERE tp.quy_trinh_id = q.id AND tp.is_active = true
      ),
      '[]'::jsonb
    )
  ),
  updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM public.cssd_fact_quy_trinh_thanh_phan tp
  WHERE tp.quy_trinh_id = q.id AND tp.is_active = true
)
AND (coalesce(q.metadata->'bom_lines', '[]'::jsonb) = '[]'::jsonb);

-- Backfill bom_kiem_dem_at từ lifecycle KIEM_DEM_BOM.
UPDATE public.cssd_fact_quy_trinh q
SET bom_kiem_dem_at = le.created_at,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (quy_trinh_id) quy_trinh_id, created_at
  FROM public.cssd_fact_lifecycle_event
  WHERE ma_su_kien = 'KIEM_DEM_BOM'
  ORDER BY quy_trinh_id, created_at DESC
) le
WHERE le.quy_trinh_id = q.id
  AND q.bom_kiem_dem_at IS NULL;

-- Gộp lifecycle còn lại vào metadata.ngoai_le (best-effort, giữ lịch sử truy vết).
UPDATE public.cssd_fact_quy_trinh q
SET metadata = jsonb_set(
  coalesce(q.metadata, '{}'::jsonb),
  '{ngoai_le}',
  coalesce(q.metadata->'ngoai_le', '[]'::jsonb) || coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'su_kien', le.ma_su_kien,
          'tu_tram', le.ma_tram,
          'ly_do', coalesce(le.ghi_chu, ''),
          'nguoi_thao_tac', 'Hệ thống (migrate)',
          'thoi_gian', le.created_at,
          'payload', le.payload
        )
        ORDER BY le.created_at
      )
      FROM public.cssd_fact_lifecycle_event le
      WHERE le.quy_trinh_id = q.id
        AND le.ma_su_kien IS DISTINCT FROM 'KIEM_DEM_BOM'
    ),
    '[]'::jsonb
  ),
  updated_at = now()
)
WHERE EXISTS (
  SELECT 1 FROM public.cssd_fact_lifecycle_event le
  WHERE le.quy_trinh_id = q.id AND le.ma_su_kien IS DISTINCT FROM 'KIEM_DEM_BOM'
);

-- RPC BOM checkpoint: ghi metadata.bom_lines + bom_kiem_dem_* + cycle QR.
DROP FUNCTION IF EXISTS public.rpc_cssd_persist_bom_checkpoint(uuid, jsonb, jsonb, text, uuid);

CREATE OR REPLACE FUNCTION public.rpc_cssd_persist_bom_checkpoint(
  p_quy_trinh_id uuid,
  p_bom_lines jsonb,
  p_deltas jsonb,
  p_do_split text,
  p_operator_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_delta jsonb;
  v_loai_id uuid;
  v_bo_id uuid;
  v_so_luong_thay_doi int;
  v_ghi_chu text;
  v_loai_giao_dich text;
  v_meta jsonb;
  v_cycle json;
BEGIN
  IF p_quy_trinh_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Thiếu quy_trinh_id.');
  END IF;

  SELECT coalesce(metadata, '{}'::jsonb) INTO v_meta
  FROM public.cssd_fact_quy_trinh
  WHERE id = p_quy_trinh_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy quy trình.');
  END IF;

  v_meta := v_meta || jsonb_build_object('bom_lines', coalesce(p_bom_lines, '[]'::jsonb));
  v_meta := jsonb_set(
    v_meta,
    '{ngoai_le}',
    coalesce(v_meta->'ngoai_le', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'su_kien', 'KIEM_DEM_BOM',
        'tu_tram', 'DONG_GOI',
        'ly_do', 'Digital BOM checkpoint',
        'nguoi_thao_tac', coalesce(p_operator_id::text, 'CSSD'),
        'thoi_gian', now(),
        'payload', jsonb_build_object('do_split', p_do_split, 'so_lines', jsonb_array_length(coalesce(p_bom_lines, '[]'::jsonb)))
      )
    )
  );

  UPDATE public.cssd_fact_quy_trinh
  SET
    metadata = v_meta,
    bom_kiem_dem_at = now(),
    bom_kiem_dem_boi_id = p_operator_id,
    updated_at = now()
  WHERE id = p_quy_trinh_id;

  IF p_deltas IS NOT NULL AND jsonb_array_length(p_deltas) > 0 THEN
    FOR v_delta IN SELECT * FROM jsonb_array_elements(p_deltas) LOOP
      v_loai_id := (v_delta->>'loai_id')::uuid;
      v_bo_id := NULLIF(v_delta->>'bo_id', '')::uuid;
      v_loai_giao_dich := v_delta->>'loai_giao_dich';
      v_so_luong_thay_doi := (v_delta->>'so_luong_thay_doi')::int;
      v_ghi_chu := v_delta->>'ghi_chu';

      INSERT INTO public.cssd_fact_kho_giao_dich(
        loai_dung_cu_id,
        bo_dung_cu_id,
        quy_trinh_id,
        loai_giao_dich,
        so_luong_thay_doi,
        ghi_chu,
        nguoi_thuc_hien_id,
        created_at,
        updated_at
      ) VALUES (
        v_loai_id,
        v_bo_id,
        p_quy_trinh_id,
        v_loai_giao_dich,
        v_so_luong_thay_doi,
        v_ghi_chu,
        p_operator_id,
        now(),
        now()
      );
    END LOOP;
  END IF;

  v_cycle := public.rpc_cssd_assign_cycle_qr(p_quy_trinh_id);

  RETURN json_build_object(
    'success', true,
    'ma_cycle_qr', coalesce(v_cycle->>'ma_cycle_qr', null)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_cssd_persist_bom_checkpoint(uuid, jsonb, jsonb, text, uuid)
  TO authenticated, service_role;

-- View: thêm cột BOM checkpoint.
DROP VIEW IF EXISTS public.v_cssd_quy_trinh_full;

CREATE VIEW public.v_cssd_quy_trinh_full WITH (security_invoker = true) AS
SELECT
  q.id,
  q.ma_qr_quy_trinh,
  q.ma_cycle_qr,
  q.ma_qr_bo_vinh_vien,
  q.bo_dung_cu_id,
  q.tram_hien_tai_id,
  t.ma_tram AS ma_trang_thai_hien_tai,
  t.ten_tram AS ten_tram_hien_tai,
  q.nguoi_dang_giu_id,
  q.nguoi_tiep_nhan_id,
  q.nguoi_lam_sach_id,
  q.nguoi_kiem_tra_id,
  q.nguoi_dong_goi_id,
  q.nguoi_tiet_khuan_id,
  q.nguoi_cap_phat_id,
  q.thoi_gian_tiep_nhan,
  q.thoi_gian_lam_sach,
  q.thoi_gian_qc,
  q.thoi_gian_dong_goi,
  q.thoi_gian_tiet_khuan,
  q.thoi_gian_cap_phat,
  q.bom_kiem_dem_at,
  q.bom_kiem_dem_boi_id,
  q.lo_tiet_khuan_id,
  q.suds_count,
  q.ngay_tiet_khuan,
  q.han_su_dung,
  q.tinh_trang,
  q.is_dong_bang,
  q.quy_trinh_cha_id,
  q.ma_vai_tro_bo,
  q.metadata ->> 'ma_ca_mo_id' AS ma_ca_mo_id,
  q.ngay_het_han,
  q.is_active,
  b.ten_bo,
  b.ma_bo,
  k.ten_khoa,
  l.ten_loai AS ten_loai_dung_cu,
  q.created_at,
  q.updated_at
FROM public.cssd_fact_quy_trinh q
LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
LEFT JOIN public.cssd_dm_bo_dung_cu b ON q.bo_dung_cu_id = b.id
LEFT JOIN public.mdm_dm_khoa_phong k ON b.khoa_su_dung_id = k.id
LEFT JOIN public.cssd_dm_loai_dung_cu l ON b.loai_dung_cu_id = l.id;

GRANT SELECT ON public.v_cssd_quy_trinh_full TO anon, authenticated, service_role;

-- Drop bảng phụ (pilot — dữ liệu đã backfill vào quy_trinh.metadata).
DROP TABLE IF EXISTS public.cssd_fact_dieu_chuyen_thanh_phan CASCADE;
DROP TABLE IF EXISTS public.cssd_fact_kho_chi_tiet CASCADE;
DROP TABLE IF EXISTS public.cssd_fact_lifecycle_event CASCADE;
DROP TABLE IF EXISTS public.cssd_fact_quy_trinh_thanh_phan CASCADE;
