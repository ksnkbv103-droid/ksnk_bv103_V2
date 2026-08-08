-- NKBV: cột bệnh phẩm chuẩn hóa (CDC/NHSN) cạnh loai_benh_pham LIS gốc.
-- Thuật toán BA ưu tiên loai_benh_pham_chuan; chưa chuẩn hóa → fallback chuỗi LIS.

BEGIN;

ALTER TABLE public.nkbv_fact_vi_sinh
  ADD COLUMN IF NOT EXISTS loai_benh_pham_chuan text;

COMMENT ON COLUMN public.nkbv_fact_vi_sinh.loai_benh_pham IS
  'Loại bệnh phẩm thô từ LIS / nhập tay (giữ nguyên chuỗi nguồn).';
COMMENT ON COLUMN public.nkbv_fact_vi_sinh.loai_benh_pham_chuan IS
  'Mã bệnh phẩm chuẩn hóa (nkbv-specimen-canonical) — dùng cho gợi ý hội chứng / RIT / SBAP.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nkbv_fact_vi_sinh_loai_benh_pham_chuan_chk'
  ) THEN
    ALTER TABLE public.nkbv_fact_vi_sinh
      ADD CONSTRAINT nkbv_fact_vi_sinh_loai_benh_pham_chuan_chk
      CHECK (
        loai_benh_pham_chuan IS NULL
        OR loai_benh_pham_chuan IN (
          'BLOOD_CULTURE',
          'BLOOD_NCT',
          'ETA',
          'BAL',
          'NB_BAL',
          'PBAL',
          'PSB',
          'LUNG_TISSUE',
          'SPUTUM',
          'PLEURAL',
          'URT',
          'URINE',
          'URINE_ANTIGEN',
          'BONE',
          'JOINT_FLUID',
          'PERIPROSTHETIC',
          'CSF',
          'BRAIN_TISSUE',
          'BRAIN_ABSCESS',
          'PERICARDIAL',
          'CARDIOVASCULAR',
          'STOOL',
          'PERITONEAL',
          'REPRODUCTIVE',
          'SURGICAL_SITE_FLUID',
          'DECUBITUS',
          'SKIN_ST'
        )
      );
  END IF;
END $$;

-- Hub RPC: trả thêm loai_benh_pham_chuan
CREATE OR REPLACE FUNCTION public.fn_nkbv_ba_hub(p_ma_benh_an text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'stay', (
      SELECT to_jsonb(s)
      FROM (
        SELECT id, ma_benh_an, ma_benh_nhan, ho_ten_benh_nhan, ngay_sinh, gioi_tinh,
               ngay_vao_vien, ngay_ra_vien, khoa_dieu_tri_id, ket_cuc_dieu_tri,
               ly_do_tu_vong, tu_vong_lien_quan_nkbv
        FROM public.nkbv_fact_benh_an
        WHERE ma_benh_an = p_ma_benh_an AND is_active = true
        LIMIT 1
      ) s
    ),
    'lis', COALESCE((
      SELECT jsonb_agg(to_jsonb(l))
      FROM (
        SELECT id, ma_xet_nghiem, loai_benh_pham, loai_benh_pham_chuan, ngay_lay_mau, tac_nhan, so_luong,
               ket_qua_phan_loai, ket_qua_duong_tinh, is_mdro, mdro_phenotype, metadata
        FROM public.nkbv_fact_vi_sinh
        WHERE ma_benh_an = p_ma_benh_an AND is_active = true
        ORDER BY ngay_lay_mau ASC
        LIMIT 200
      ) l
    ), '[]'::jsonb),
    'cases', COALESCE((
      SELECT jsonb_agg(to_jsonb(c))
      FROM (
        SELECT id, ma_ca, loai_ma, loai_ten, trang_thai_ma, trang_thai_ten,
               ngay_phat_hien, vi_tri_nhiem_khuan, verification_data, tac_nhan_vi_khuan
        FROM public.v_nkbv_su_kien_full
        WHERE ma_benh_an = p_ma_benh_an AND is_active = true
        ORDER BY ngay_phat_hien DESC
        LIMIT 100
      ) c
    ), '[]'::jsonb),
    'devices', COALESCE((
      SELECT jsonb_agg(to_jsonb(d))
      FROM (
        SELECT id, device_type, insertion_date, removal_date, is_active
        FROM public.nkbv_fact_device_registry
        WHERE ma_benh_an = p_ma_benh_an AND is_active = true
        LIMIT 50
      ) d
    ), '[]'::jsonb),
    'manual', COALESCE((
      SELECT jsonb_agg(to_jsonb(m))
      FROM (
        SELECT id, milestone_kind, milestone_date, title, detail, specimen_hint, criteria_key
        FROM public.nkbv_fact_ba_timeline
        WHERE ma_benh_an = p_ma_benh_an AND is_active = true
        ORDER BY milestone_date ASC
        LIMIT 200
      ) m
    ), '[]'::jsonb)
  );
$$;

COMMIT;
