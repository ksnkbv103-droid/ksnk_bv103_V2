-- QLCV Track A: đánh giá tháng + RPC tổng hợp KPI (phiếu gốc, §4.2 QUAN_LY_CONG_VIEC_PLAN.md)
-- Phạm vi tháng: tạo / cập nhật / hạn rơi trong tháng lịch (UTC date_trunc month của p_thang).

CREATE TABLE IF NOT EXISTS public.fact_qlcv_danh_gia_thang (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nhan_su_id uuid NOT NULL REFERENCES public.mdm_nhan_su (id) ON DELETE CASCADE,
  thang date NOT NULL,
  on_time_rate numeric(6, 2) NOT NULL DEFAULT 0,
  completion_rate numeric(6, 2) NOT NULL DEFAULT 0,
  quality_score smallint,
  final_score numeric(6, 2),
  manager_comment text,
  evaluated_by uuid REFERENCES public.mdm_nhan_su (id),
  evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fact_qlcv_danh_gia_thang_thang_first_day CHECK (thang = date_trunc('month', thang)::date),
  CONSTRAINT fact_qlcv_danh_gia_thang_quality_ck CHECK (
    quality_score IS NULL OR (quality_score >= 1 AND quality_score <= 5)
  ),
  CONSTRAINT fact_qlcv_danh_gia_thang_uq UNIQUE (nhan_su_id, thang)
);

CREATE INDEX IF NOT EXISTS idx_fact_qlcv_dgt_thang ON public.fact_qlcv_danh_gia_thang (thang DESC);
CREATE INDEX IF NOT EXISTS idx_fact_qlcv_dgt_nhan_su ON public.fact_qlcv_danh_gia_thang (nhan_su_id);

CREATE OR REPLACE FUNCTION public.touch_fact_qlcv_danh_gia_thang()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fact_qlcv_danh_gia_thang_touch ON public.fact_qlcv_danh_gia_thang;
CREATE TRIGGER trg_fact_qlcv_danh_gia_thang_touch
  BEFORE UPDATE ON public.fact_qlcv_danh_gia_thang
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_fact_qlcv_danh_gia_thang();

COMMENT ON TABLE public.fact_qlcv_danh_gia_thang IS
  'Điểm đánh giá tháng QLCV (on_time_rate, completion_rate snapshot + chất lượng 1–5 + final_score).';

COMMENT ON COLUMN public.fact_qlcv_danh_gia_thang.thang IS 'Ngày đầu tháng (YYYY-MM-01).';

-- RPC: KPI theo nhân sự (chỉ phiếu gốc, có người phụ trách)
CREATE OR REPLACE FUNCTION public.fn_qlcv_tong_hop_thang(p_thang date)
RETURNS TABLE (
  nhan_su_id uuid,
  ho_ten text,
  phieu_trong_thang bigint,
  hoan_thanh_trong_thang bigint,
  dung_han bigint,
  on_time_pct numeric,
  completion_pct numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      date_trunc('month', p_thang::timestamp)::date AS ms_date,
      (date_trunc('month', p_thang::timestamp) + interval '1 month')::date AS me_date,
      date_trunc('month', p_thang::timestamp)::timestamptz AS ms_tz,
      (date_trunc('month', p_thang::timestamp) + interval '1 month')::timestamptz AS me_tz
  ),
  roots AS (
    SELECT
      cv.*,
      b.ms_tz,
      b.me_tz
    FROM public.fact_cong_viec cv
    CROSS JOIN bounds b
    WHERE cv.cong_viec_cha_id IS NULL
      AND cv.nguoi_phu_trach_id IS NOT NULL
      AND (
        (cv.created_at >= b.ms_tz AND cv.created_at < b.me_tz)
        OR (cv.updated_at >= b.ms_tz AND cv.updated_at < b.me_tz)
        OR (
          cv.han_hoan_thanh IS NOT NULL
          AND cv.han_hoan_thanh >= b.ms_date
          AND cv.han_hoan_thanh < b.me_date
        )
      )
  ),
  agg AS (
    SELECT
      r.nguoi_phu_trach_id AS sid,
      count(*)::bigint AS phieu_trong_thang,
      count(*) FILTER (
        WHERE r.trang_thai = 'HOAN_THANH'
          AND r.updated_at >= r.ms_tz
          AND r.updated_at < r.me_tz
      )::bigint AS hoan_thanh_trong_thang,
      count(*) FILTER (
        WHERE r.trang_thai = 'HOAN_THANH'
          AND r.updated_at >= r.ms_tz
          AND r.updated_at < r.me_tz
          AND (r.han_hoan_thanh IS NULL OR r.updated_at::date <= r.han_hoan_thanh)
      )::bigint AS dung_han
    FROM roots r
    GROUP BY r.nguoi_phu_trach_id
  )
  SELECT
    a.sid AS nhan_su_id,
    coalesce(ns.ho_ten, '')::text AS ho_ten,
    a.phieu_trong_thang,
    a.hoan_thanh_trong_thang,
    a.dung_han,
    CASE
      WHEN a.hoan_thanh_trong_thang > 0 THEN round(100.0 * a.dung_han / a.hoan_thanh_trong_thang, 2)
      ELSE 0::numeric
    END AS on_time_pct,
    CASE
      WHEN a.phieu_trong_thang > 0 THEN round(100.0 * a.hoan_thanh_trong_thang / a.phieu_trong_thang, 2)
      ELSE 0::numeric
    END AS completion_pct
  FROM agg a
  LEFT JOIN public.mdm_nhan_su ns ON ns.id = a.sid
  WHERE a.phieu_trong_thang > 0
  ORDER BY completion_pct DESC NULLS LAST, on_time_pct DESC NULLS LAST, ho_ten ASC;
$$;

COMMENT ON FUNCTION public.fn_qlcv_tong_hop_thang(date) IS
  'QLCV: KPI tháng theo người phụ trách — chỉ phiếu gốc; phạm vi = tạo/cập nhật/hạn trong tháng.';

REVOKE ALL ON FUNCTION public.fn_qlcv_tong_hop_thang(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_tong_hop_thang(date) TO service_role;

ALTER TABLE public.fact_qlcv_danh_gia_thang ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fact_qlcv_danh_gia_thang_select_authenticated ON public.fact_qlcv_danh_gia_thang;
CREATE POLICY fact_qlcv_danh_gia_thang_select_authenticated ON public.fact_qlcv_danh_gia_thang
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.mdm_nhan_su m
      WHERE m.auth_user_id = auth.uid()
    )
  );

GRANT SELECT ON public.fact_qlcv_danh_gia_thang TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fact_qlcv_danh_gia_thang TO service_role;
