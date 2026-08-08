-- NKBV BA workspace hardening:
-- 1) Chống lặp mốc tiêu chuẩn (XQ/TC) tận gốc: unique (BA, ngày, criteria_key) khi active.
-- 2) RPC fn_nkbv_ba_hub gộp 5 query hub thành 1 round-trip (RLS giữ nguyên — SECURITY INVOKER).

-- ===== 1. Dedupe dữ liệu cũ trước khi tạo unique index =====
-- Giữ bản mới nhất (updated_at) cho mỗi (ma_benh_an, milestone_date, criteria_key) active.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY ma_benh_an, milestone_date, criteria_key
           ORDER BY updated_at DESC, id DESC
         ) AS rn
  FROM public.nkbv_fact_ba_timeline
  WHERE is_active = true AND criteria_key IS NOT NULL
)
UPDATE public.nkbv_fact_ba_timeline t
SET is_active = false,
    updated_at = timezone('utc'::text, now())
FROM ranked r
WHERE t.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_nkbv_ba_timeline_ba_date_criteria
  ON public.nkbv_fact_ba_timeline (ma_benh_an, milestone_date, criteria_key)
  WHERE is_active = true AND criteria_key IS NOT NULL;

COMMENT ON INDEX public.ux_nkbv_ba_timeline_ba_date_criteria IS
  'Một mốc tiêu chuẩn CDC (criteria_key) mỗi ngày mỗi BA — chặn lặp XQ/TC khi tick nhanh.';

-- ===== 2. RPC hub bệnh án: 1 round-trip thay 5 query =====
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
        SELECT id, ma_xet_nghiem, loai_benh_pham, ngay_lay_mau, tac_nhan, so_luong,
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

COMMENT ON FUNCTION public.fn_nkbv_ba_hub(text) IS
  'Hub bệnh án NKBV (stay + LIS + cases + devices + manual timeline) — 1 round-trip, RLS invoker.';

GRANT EXECUTE ON FUNCTION public.fn_nkbv_ba_hub(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_nkbv_ba_hub(text) TO service_role;
