-- Sửa rpc_get_dashboard_ksnk_staff_supervision_stats:
-- 1) Danh sách nhân sự: khoa KSNK HOẶC vai_tro_he_thong_ksnk gợi ý KSNK (tránh thiếu khi MDM khoa chưa chuẩn).
-- 2) Đếm VST + GSC: mọi phiên/cơ hội do người đó là nguoi_giam_sat (đủ bộ lọc), không giới hạn stype = KSNK
--    (trước đây bỏ sót Tự giám sát / chéo dù vẫn là nhân viên KSNK đi giám sát).

CREATE OR REPLACE FUNCTION public.rpc_get_dashboard_ksnk_staff_supervision_stats(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    WITH ksnk_staff AS (
      SELECT DISTINCT ON (ns.id)
        ns.id,
        COALESCE(NULLIF(btrim(ns.ho_ten), ''), NULLIF(btrim(ns.ma_nv), ''), ns.id::text) AS ho_ten,
        COALESCE(NULLIF(btrim(ns.ma_nv), ''), '—') AS ma_nv
      FROM public.mdm_nhan_su ns
      LEFT JOIN public.dm_khoa_phong k ON ns.khoa_id = k.id
      WHERE COALESCE(ns.is_active, true)
        AND (
          (
            k.id IS NOT NULL
            AND (k.ma_khoa IN ('KSNK', 'C18') OR k.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
          )
          OR (
            NULLIF(btrim(COALESCE(ns.vai_tro_he_thong_ksnk, '')), '') IS NOT NULL
            AND (
              upper(ns.vai_tro_he_thong_ksnk) LIKE '%KSNK%'
              OR upper(ns.vai_tro_he_thong_ksnk) LIKE '%NHAN_VIEN%'
              OR upper(ns.vai_tro_he_thong_ksnk) LIKE '%MANG_LUOI%'
              OR upper(ns.vai_tro_he_thong_ksnk) LIKE '%TO_TRUONG%'
              OR upper(ns.vai_tro_he_thong_ksnk) LIKE '%THANH_VIEN%'
              OR ns.vai_tro_he_thong_ksnk ILIKE '%Kiểm soát%'
              OR lower(unaccent(COALESCE(ns.vai_tro_he_thong_ksnk, ''))) LIKE '%kiem soat%'
            )
          )
        )
      ORDER BY ns.id
    ),
    vst_sess0 AS (
      SELECT
        s.id,
        s.khoa_id,
        s.khu_vuc_id,
        s.nguoi_giam_sat_id
      FROM public.fact_giam_sat_vst_sessions s
      LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
      WHERE s.is_active = true
        AND s.ngay_giam_sat >= p_tu_ngay
        AND s.ngay_giam_sat <= p_den_ngay
        AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
        AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
    ),
    vst_opp AS (
      SELECT
        d.id,
        d.session_id,
        s.nguoi_giam_sat_id
      FROM public.fact_giam_sat_vst d
      INNER JOIN vst_sess0 s ON d.session_id = s.id AND s.nguoi_giam_sat_id IS NOT NULL
      INNER JOIN ksnk_staff ks ON ks.id = s.nguoi_giam_sat_id
      WHERE (p_khoa_ids IS NULL OR COALESCE(d.khoa_id, s.khoa_id) = ANY (p_khoa_ids))
        AND (
          p_khoi_ids IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.dm_khoa_phong ke
            WHERE ke.id = COALESCE(d.khoa_id, s.khoa_id)
              AND ke.khoi_id IS NOT NULL
              AND ke.khoi_id = ANY (p_khoi_ids)
          )
        )
        AND (
          p_nghe_nghiep_ids IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.dm_nghe_nghiep nn
            WHERE nn.id = ANY (p_nghe_nghiep_ids)
              AND nn.is_active IS NOT FALSE
              AND d.nghe_nghiep IS NOT NULL
              AND btrim(d.nghe_nghiep) <> ''
              AND nn.ten_nghe_nghiep = d.nghe_nghiep
          )
        )
    ),
    vst_agg AS (
      SELECT
        o.nguoi_giam_sat_id AS ns_id,
        count(*)::bigint AS so_co_hoi_vst,
        count(DISTINCT o.session_id)::bigint AS so_phien_vst
      FROM vst_opp o
      GROUP BY 1
    ),
    gsc_sess AS (
      SELECT s.id, s.nguoi_giam_sat_id
      FROM public.fact_giam_sat_chung_sessions s
      LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
      INNER JOIN ksnk_staff ks ON ks.id = s.nguoi_giam_sat_id
      WHERE s.is_active = true
        AND s.ngay_giam_sat >= p_tu_ngay
        AND s.ngay_giam_sat <= p_den_ngay
        AND s.nguoi_giam_sat_id IS NOT NULL
        AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
        AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
        AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
        AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
    ),
    gsc_agg AS (
      SELECT g.nguoi_giam_sat_id AS ns_id, count(*)::bigint AS so_phien_gsc
      FROM gsc_sess g
      GROUP BY 1
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', ks.id,
          'ho_ten', ks.ho_ten,
          'ma_nv', ks.ma_nv,
          'so_co_hoi_vst', COALESCE(v.so_co_hoi_vst, 0),
          'so_phien_vst', COALESCE(v.so_phien_vst, 0),
          'so_phien_gsc', COALESCE(g.so_phien_gsc, 0)
        )
        ORDER BY
          (COALESCE(v.so_co_hoi_vst, 0) + COALESCE(v.so_phien_vst, 0) + COALESCE(g.so_phien_gsc, 0)) DESC,
          ks.ho_ten
      ),
      '[]'::jsonb
    )
    FROM ksnk_staff ks
    LEFT JOIN vst_agg v ON v.ns_id = ks.id
    LEFT JOIN gsc_agg g ON g.ns_id = ks.id
  );
END;
$$;

COMMENT ON FUNCTION public.rpc_get_dashboard_ksnk_staff_supervision_stats(date, date, uuid[], uuid[], uuid[], uuid[]) IS
  'Command Center: nhân sự KSNK (khoa KSNK hoặc vai_tro_he_thong_ksnk) — toàn bộ cơ hội/phiên VST + phiên GSC do họ là người giám sát (theo bộ lọc), mọi phân loại nguồn.';

GRANT EXECUTE ON FUNCTION public.rpc_get_dashboard_ksnk_staff_supervision_stats(date, date, uuid[], uuid[], uuid[], uuid[])
  TO anon, authenticated, service_role;
