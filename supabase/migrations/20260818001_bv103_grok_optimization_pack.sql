-- BV103 Grok optimization pack (2026-08): single-scan GSC multi RPC, MV daily rollup,
-- audit trail, RLS read supervision facts, BRIN date indexes.

-- ---------------------------------------------------------------------------
-- 1) BRIN indexes (partition-like scan for long date ranges)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS brin_gsc_sessions_ngay_giam_sat
  ON public.fact_giam_sat_chung_sessions USING BRIN (ngay_giam_sat);

CREATE INDEX IF NOT EXISTS brin_vst_sessions_ngay_giam_sat
  ON public.fact_giam_sat_vst_sessions USING BRIN (ngay_giam_sat);

-- ---------------------------------------------------------------------------
-- 2) Materialized view: GSC session daily rollup (refresh via cron or post-migrate)
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_gsc_session_daily AS
SELECT
  s.ngay_giam_sat::date AS ngay,
  coalesce(bk.ma_bk, '') AS ma_bk,
  s.khoa_id,
  count(DISTINCT s.id) AS tong_phien,
  count(r.id) AS tong_quan_sat,
  count(r.id) FILTER (WHERE r.value = 'DAT') AS tong_dat,
  count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') AS tong_khong_dat
FROM public.fact_giam_sat_chung_sessions s
LEFT JOIN public.dm_bang_kiem bk ON bk.id = s.bang_kiem_id
LEFT JOIN public.fact_giam_sat_chung_results r ON r.session_id = s.id
WHERE coalesce(s.is_active, true) = true
GROUP BY 1, 2, 3;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_gsc_session_daily
  ON public.mv_gsc_session_daily (ngay, ma_bk, khoa_id);

CREATE OR REPLACE FUNCTION public.fn_refresh_mv_gsc_session_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_gsc_session_daily;
EXCEPTION
  WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW public.mv_gsc_session_daily;
END;
$$;

GRANT SELECT ON public.mv_gsc_session_daily TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_refresh_mv_gsc_session_daily() TO service_role;

-- ---------------------------------------------------------------------------
-- 3) Audit log (thay thế fact_activity_log đã gỡ — schema chuẩn BV103)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fact_bv103_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid DEFAULT auth.uid(),
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fact_bv103_audit_log_table_record
  ON public.fact_bv103_audit_log (table_name, record_id, changed_at DESC);

ALTER TABLE public.fact_bv103_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fact_bv103_audit_log_select_authenticated ON public.fact_bv103_audit_log;
CREATE POLICY fact_bv103_audit_log_select_authenticated ON public.fact_bv103_audit_log
  FOR SELECT TO authenticated USING (changed_by = auth.uid() OR changed_by IS NULL);

CREATE OR REPLACE FUNCTION public.fn_bv103_audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  v_id := coalesce(
    to_jsonb(NEW)->>'id',
    to_jsonb(OLD)->>'id',
  );
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    INSERT INTO public.fact_bv103_audit_log (table_name, record_id, action, old_data)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_old);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    INSERT INTO public.fact_bv103_audit_log (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_old, v_new);
    RETURN NEW;
  ELSE
    v_new := to_jsonb(NEW);
    INSERT INTO public.fact_bv103_audit_log (table_name, record_id, action, new_data)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_new);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_gsc_sessions ON public.fact_giam_sat_chung_sessions;
CREATE TRIGGER trg_audit_gsc_sessions
  AFTER INSERT OR UPDATE OR DELETE ON public.fact_giam_sat_chung_sessions
  FOR EACH ROW EXECUTE FUNCTION public.fn_bv103_audit_row();

DROP TRIGGER IF EXISTS trg_audit_vst_sessions ON public.fact_giam_sat_vst_sessions;
CREATE TRIGGER trg_audit_vst_sessions
  AFTER INSERT OR UPDATE OR DELETE ON public.fact_giam_sat_vst_sessions
  FOR EACH ROW EXECUTE FUNCTION public.fn_bv103_audit_row();

-- ---------------------------------------------------------------------------
-- 4) RLS: authenticated đọc phiên giám sát (ghi vẫn qua app + service role)
-- ---------------------------------------------------------------------------
ALTER TABLE public.fact_giam_sat_chung_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_giam_sat_vst_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gsc_sessions_select_authenticated ON public.fact_giam_sat_chung_sessions;
CREATE POLICY gsc_sessions_select_authenticated ON public.fact_giam_sat_chung_sessions
  FOR SELECT TO authenticated USING (coalesce(is_active, true) = true);

DROP POLICY IF EXISTS vst_sessions_select_authenticated ON public.fact_giam_sat_vst_sessions;
CREATE POLICY vst_sessions_select_authenticated ON public.fact_giam_sat_vst_sessions
  FOR SELECT TO authenticated USING (coalesce(is_active, true) = true);

-- ---------------------------------------------------------------------------
-- 5) rpc_get_compliance_dashboard_multi_v2 — một lần quét sessions, N lần aggregate nhẹ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_get_compliance_dashboard_multi_v2(
  p_tu_ngay date,
  p_den_ngay date,
  p_bang_kiem_mas text[],
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_supervision_type text DEFAULT 'ALL'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ma_bk text;
  v_result jsonb := '{}'::jsonb;
  v_sub_res jsonb;
  v_sum jsonb;
  v_khoa jsonb;
  v_nghe jsonb;
  v_khu jsonb;
  v_trend jsonb;
  v_violation jsonb;
  v_source jsonb;
  v_part jsonb;
BEGIN
  IF p_bang_kiem_mas IS NULL OR array_length(p_bang_kiem_mas, 1) IS NULL THEN
    RETURN '{}'::json;
  END IF;

  IF array_length(p_bang_kiem_mas, 1) = 1 THEN
    RETURN public.rpc_get_compliance_dashboard_multi_v1(
      p_tu_ngay, p_den_ngay, p_bang_kiem_mas,
      p_khoi_ids, p_khoa_ids, p_nghe_nghiep_ids, p_khu_vuc_ids, p_supervision_type
    );
  END IF;

  CREATE TEMP TABLE _gsc_sessions_multi ON COMMIT DROP AS
    SELECT
      s.id,
      s.khoa_id,
      s.nghe_nghiep_id,
      s.khu_vuc_id,
      s.ngay_giam_sat,
      coalesce(bk.ma_bk, '') AS loai_bang_kiem,
      CASE
        WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
        WHEN (
          (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
          AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
        )
        OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
        ELSE 'CHEO'
      END AS stype
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.dm_bang_kiem bk ON bk.id = s.bang_kiem_id
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay
      AND s.ngay_giam_sat <= p_den_ngay
      AND (
        p_supervision_type = 'ALL'
        OR (
          CASE
            WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                 AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
            WHEN (
              (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
              AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
            )
            OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
            ELSE 'CHEO'
          END = p_supervision_type
        )
      )
      AND (
        bk.ma_bk = ANY (p_bang_kiem_mas)
        OR bk.id::text = ANY (p_bang_kiem_mas)
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids));

  FOREACH v_ma_bk IN ARRAY p_bang_kiem_mas
  LOOP
    SELECT jsonb_build_object(
      'tong_phien', count(DISTINCT s.id),
      'tong_quan_sat', count(r.id),
      'tong_vi_pham', count(r.id) FILTER (WHERE r.value = 'KHONG_DAT'),
      'ty_le_tuan_thu',
      CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END
    )
    INTO v_sum
    FROM _gsc_sessions_multi s
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    WHERE s.loai_bang_kiem = v_ma_bk;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb)
    INTO v_khoa
    FROM (
      SELECT k.id, k.ten_khoa AS ten, count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
      LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2
      ORDER BY 5 DESC
      LIMIT 50
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_nghe FROM (
      SELECT coalesce(n.id, md5(coalesce(n.ten_nghe_nghiep, 'unknown'))::uuid) AS id, coalesce(n.ten_nghe_nghiep, 'Không rõ') AS ten,
             count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      LEFT JOIN public.dm_nghe_nghiep n ON s.nghe_nghiep_id = n.id
      LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2 ORDER BY 3 DESC
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_khu FROM (
      SELECT coalesce(kv.id, md5(coalesce(kv.ten_khu_vuc, 'unknown'))::uuid) AS id, coalesce(kv.ten_khu_vuc, 'Không rõ') AS ten,
             count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
      LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2 ORDER BY 3 DESC
    ) t;

    SELECT coalesce(jsonb_agg(t ORDER BY min_date), '[]'::jsonb) INTO v_trend FROM (
      SELECT to_char(date_trunc('month', ngay_giam_sat), 'MM/YY') AS label, min(ngay_giam_sat) AS min_date, count(r.id) AS tong,
             count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_violation FROM (
      SELECT tc.id AS criterion_id, tc.noi_dung AS ten_tieu_chi, count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') AS so_vi_pham, count(r.id) AS tong_quan_sat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'KHONG_DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le_vi_pham
      FROM public.fact_giam_sat_chung_results r
      JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id
      JOIN _gsc_sessions_multi s ON r.session_id = s.id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2
      HAVING count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0
      ORDER BY 3 DESC LIMIT 20
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_source FROM (
      SELECT 'Khoa KSNK' AS ten, count(DISTINCT id) FILTER (WHERE stype = 'KSNK') AS so_phien FROM _gsc_sessions_multi WHERE loai_bang_kiem = v_ma_bk
      UNION ALL
      SELECT 'Giám sát chéo', count(DISTINCT id) FILTER (WHERE stype = 'CHEO') FROM _gsc_sessions_multi WHERE loai_bang_kiem = v_ma_bk
      UNION ALL
      SELECT 'Tự giám sát', count(DISTINCT id) FILTER (WHERE stype = 'TU_GIAM_SAT') FROM _gsc_sessions_multi WHERE loai_bang_kiem = v_ma_bk
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_part FROM (
      SELECT k.id, k.ten_khoa AS ten, count(DISTINCT s.id) FILTER (WHERE s.stype = 'TU_GIAM_SAT') AS so_phien
      FROM public.dm_khoa_phong k
      LEFT JOIN _gsc_sessions_multi s ON k.id = s.khoa_id AND s.loai_bang_kiem = v_ma_bk
      WHERE k.is_active = true
        AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
        AND (p_khoa_ids IS NULL OR k.id = ANY (p_khoa_ids))
      GROUP BY 1, 2
      ORDER BY 3 ASC, 2 ASC
    ) t;

    v_sub_res := jsonb_build_object(
      'summary', v_sum,
      'by_khoa', coalesce(v_khoa, '[]'::jsonb),
      'by_nghe_nghiep', coalesce(v_nghe, '[]'::jsonb),
      'by_khu_vuc', coalesce(v_khu, '[]'::jsonb),
      'trend', coalesce(v_trend, '[]'::jsonb),
      'violations', coalesce(v_violation, '[]'::jsonb),
      'supervision_sources', coalesce(v_source, '[]'::jsonb),
      'participation', coalesce(v_part, '[]'::jsonb)
    );

    v_result := v_result || jsonb_build_object(v_ma_bk, v_sub_res);
  END LOOP;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_compliance_dashboard_multi_v2(date, date, text[], uuid[], uuid[], uuid[], uuid[], text) TO authenticated, service_role;
