-- Báo cáo sau migration 20260716009 — chạy trên Supabase SQL Editor (read-only).
-- Mục tiêu: không mất dữ liệu; theo dõi hàng chưa map được FK.

SELECT 'vst_obs_total' AS metric, count(*)::bigint AS value
FROM public.fact_giam_sat_vst
UNION ALL
SELECT 'vst_obs_missing_khu_vuc_id_but_has_text',
  count(*)::bigint
FROM public.fact_giam_sat_vst
WHERE khu_vuc_id IS NULL AND trim(coalesce(khu_vuc, '')) <> ''
UNION ALL
SELECT 'vst_obs_missing_nghe_nghiep_id_but_has_text',
  count(*)::bigint
FROM public.fact_giam_sat_vst
WHERE nghe_nghiep_id IS NULL AND trim(coalesce(nghe_nghiep, '')) <> ''
UNION ALL
SELECT 'vst_sessions_missing_khu_vuc_id',
  count(*)::bigint
FROM public.fact_giam_sat_vst_sessions
WHERE khu_vuc_id IS NULL AND is_active = true
UNION ALL
SELECT 'gsc_results_criterion_orphan',
  count(*)::bigint
FROM public.fact_giam_sat_chung_results r
WHERE r.criterion_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.dm_tieu_chi_bang_kiem tc WHERE tc.id = r.criterion_id
  );

-- Mẫu 20 dòng VST chưa map khu vực (để map tay / bổ sung dm)
SELECT id, session_id, khu_vuc, vi_tri, created_at
FROM public.fact_giam_sat_vst
WHERE khu_vuc_id IS NULL AND trim(coalesce(khu_vuc, '')) <> ''
ORDER BY created_at DESC
LIMIT 20;
