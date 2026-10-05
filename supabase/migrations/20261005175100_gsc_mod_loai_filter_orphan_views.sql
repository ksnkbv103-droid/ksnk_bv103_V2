-- Soft local MOD-GSC — GSC-01/06/07/VST-04 views + RPC patch (FILE ONLY, chưa apply).
-- FIX-MIG-ORDER: chạy SAU GS-05 (160000) + QLCV (174000) — bản cuối 4 view GSC
-- gộp stype/hinh_thuc_id (GS-05) + loai_giam_sat + resolve orphan (GSC-01).
-- Phụ thuộc: 175000 (map orphan), 160000 (fn_session_analytics_stype).
-- 1) Cột loai_giam_sat trên phiên + backfill
-- 2) Summary view lộ loai; violations resolve criterion qua map orphan
-- 3) Patch _impl: lọc TUAN_THU; top lỗi min-N 5; ELSE NULL tỷ lệ

BEGIN;

ALTER TABLE public.gstt_fact_chung_sessions
  ADD COLUMN IF NOT EXISTS loai_giam_sat text;

COMMENT ON COLUMN public.gstt_fact_chung_sessions.loai_giam_sat IS
  'GSC-01: chụp loại lúc lưu; thống kê % chỉ TUAN_THU (null = legacy TUAN_THU).';

UPDATE public.gstt_fact_chung_sessions s
SET loai_giam_sat = bk.loai_giam_sat
FROM public.gstt_dm_bang_kiem bk
WHERE s.bang_kiem_id = bk.id
  AND s.loai_giam_sat IS NULL
  AND bk.loai_giam_sat IS NOT NULL;

-- Helper: tên tiêu chí (live hoặc orphan map) — không rơi tên.
CREATE OR REPLACE FUNCTION public.fn_gsc_resolve_criterion_label(p_criterion_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT tc.noi_dung FROM public.gstt_dm_tieu_chi_bang_kiem tc WHERE tc.id = p_criterion_id LIMIT 1),
    (SELECT m.old_noi_dung FROM public.gstt_map_tieu_chi_orphan m WHERE m.old_criterion_id = p_criterion_id LIMIT 1),
    'Tiêu chí (đã đổi mẫu)'
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_gsc_resolve_criterion_id(p_criterion_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  -- GSC-MAP-DUYET: chỉ quy đổi khi exact/fuzzy (legacy giữ id cũ).
  SELECT COALESCE(
    (SELECT m.new_criterion_id FROM public.gstt_map_tieu_chi_orphan m
      WHERE m.old_criterion_id = p_criterion_id
        AND m.new_criterion_id IS NOT NULL
        AND m.match_confidence IN ('exact', 'fuzzy')
      LIMIT 1),
    p_criterion_id
  );
$$;

CREATE OR REPLACE VIEW public.gstt_fact_gsc_dashboard_summary WITH (security_invoker = true) AS
SELECT
  s.id AS session_id,
  s.ngay_giam_sat,
  s.bang_kiem_id,
  s.khoa_id,
  s.khu_vuc_id,
  s.nghe_nghiep_id,
  public.fn_session_analytics_stype(s.hinh_thuc_id, s.nguoi_giam_sat_id, s.khoa_id) AS stype,
  s.nguoi_giam_sat_id,
  COALESCE(s.loai_giam_sat, bk.loai_giam_sat) AS loai_giam_sat,
  1::bigint AS tong_phien,
  COUNT(r.elem) FILTER (
    WHERE COALESCE(r.elem ->> 'value', '') NOT IN ('NA', '')
  )::bigint AS tong_quan_sat,
  COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'DAT')::bigint AS tong_dat,
  COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'KHONG_DAT')::bigint AS tong_vi_pham,
  s.created_at
FROM public.gstt_fact_chung_sessions s
LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = s.bang_kiem_id
LEFT JOIN LATERAL jsonb_array_elements(COALESCE(s.results_jsonb, '[]'::jsonb)) AS r(elem) ON true
WHERE COALESCE(s.is_active, true) = true
GROUP BY
  s.id, s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id, s.khu_vuc_id, s.nghe_nghiep_id,
  s.nguoi_giam_sat_id, s.created_at, s.loai_giam_sat, bk.loai_giam_sat;

-- Violations: criterion_id gốc giữ; thêm resolved_id + ten_tieu_chi (map).
CREATE OR REPLACE VIEW public.gstt_fact_gsc_violations_summary WITH (security_invoker = true) AS
SELECT
  s.id AS session_id,
  (r.elem ->> 'criterion_id')::uuid AS criterion_id,
  public.fn_gsc_resolve_criterion_id((r.elem ->> 'criterion_id')::uuid) AS resolved_criterion_id,
  public.fn_gsc_resolve_criterion_label((r.elem ->> 'criterion_id')::uuid) AS ten_tieu_chi,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.gstt_dm_tieu_chi_bang_kiem tc
      WHERE tc.id = (r.elem ->> 'criterion_id')::uuid
    ) THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.gstt_map_tieu_chi_orphan m
      WHERE m.old_criterion_id = (r.elem ->> 'criterion_id')::uuid
    ) THEN true
    ELSE true
  END AS is_orphan_criterion,
  s.ngay_giam_sat,
  s.bang_kiem_id,
  s.khoa_id,
  s.khu_vuc_id,
  s.nghe_nghiep_id,
  public.fn_session_analytics_stype(s.hinh_thuc_id, s.nguoi_giam_sat_id, s.khoa_id) AS stype,
  s.nguoi_giam_sat_id,
  COALESCE(s.loai_giam_sat, bk.loai_giam_sat) AS loai_giam_sat,
  COUNT(r.elem) FILTER (
    WHERE COALESCE(r.elem ->> 'value', '') NOT IN ('NA', '')
  )::bigint AS tong_quan_sat,
  COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'KHONG_DAT')::bigint AS tong_vi_pham,
  s.created_at
FROM public.gstt_fact_chung_sessions s
LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = s.bang_kiem_id
INNER JOIN LATERAL jsonb_array_elements(COALESCE(s.results_jsonb, '[]'::jsonb)) AS r(elem) ON true
WHERE COALESCE(s.is_active, true) = true
  AND r.elem ->> 'criterion_id' IS NOT NULL
  AND COALESCE(r.elem ->> 'value', '') NOT IN ('NA', '')
GROUP BY
  s.id, (r.elem ->> 'criterion_id')::uuid, s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id,
  s.khu_vuc_id, s.nghe_nghiep_id, s.nguoi_giam_sat_id, s.created_at,
  s.loai_giam_sat, bk.loai_giam_sat;

CREATE OR REPLACE VIEW public.fact_gsc_dashboard_summary WITH (security_invoker = true) AS
  SELECT * FROM public.gstt_fact_gsc_dashboard_summary;

CREATE OR REPLACE VIEW public.fact_gsc_violations_summary WITH (security_invoker = true) AS
  SELECT * FROM public.gstt_fact_gsc_violations_summary;

-- Patch thân _impl (giống pattern ROUND 20260917): lọc loai + min-N top lỗi + ELSE NULL tỷ lệ.
DO $$
DECLARE
  fname text;
  def text;
  new_def text;
BEGIN
  FOREACH fname IN ARRAY ARRAY[
    'rpc_dashboard_gsc_strategic_analytics_impl',
    'rpc_gsc_checklist_detail_impl',
    'rpc_gsc_compare_matrices_impl'
  ]
  LOOP
    SELECT pg_get_functiondef(p.oid) INTO def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = fname
    LIMIT 1;
    IF def IS NULL THEN
      RAISE NOTICE 'skip missing %', fname;
      CONTINUE;
    END IF;
    new_def := def;
    -- GSC-01: chỉ TUAN_THU (null = legacy) trong CTE đọc summary — chèn sau FROM summary nếu chưa có.
    IF position('loai_giam_sat IS NULL OR loai_giam_sat' IN new_def) = 0
       AND position('gstt_fact_gsc_dashboard_summary' IN new_def) > 0 THEN
      new_def := replace(
        new_def,
        'FROM public.gstt_fact_gsc_dashboard_summary',
        'FROM public.gstt_fact_gsc_dashboard_summary WHERE (loai_giam_sat IS NULL OR loai_giam_sat = ''TUAN_THU'')'
      );
      -- tránh WHERE WHERE nếu đã có WHERE ngay sau
      new_def := replace(
        new_def,
        'WHERE (loai_giam_sat IS NULL OR loai_giam_sat = ''TUAN_THU'') WHERE',
        'WHERE (loai_giam_sat IS NULL OR loai_giam_sat = ''TUAN_THU'') AND'
      );
    END IF;
    -- GSC-06: min-N 5 cho top_violations (HAVING SUM(tong_vi_pham) > 0 → thêm quan_sat)
    new_def := replace(
      new_def,
      'HAVING SUM(tong_vi_pham) > 0',
      'HAVING SUM(tong_vi_pham) > 0 AND SUM(tong_quan_sat) >= 5'
    );
    -- GSC-07: ELSE 0 END trên tỷ lệ → ELSE NULL END (chỉ khi trong biểu thức ROUND/CASE tỷ lệ)
    new_def := regexp_replace(
      new_def,
      'ELSE 0(\.0)?::numeric END',
      'ELSE NULL END',
      'g'
    );
    new_def := regexp_replace(
      new_def,
      'ELSE 0 END',
      'ELSE NULL END',
      'g'
    );
    IF new_def IS DISTINCT FROM def THEN
      EXECUTE new_def;
      RAISE NOTICE 'patched %', fname;
    ELSE
      RAISE NOTICE 'no change %', fname;
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
