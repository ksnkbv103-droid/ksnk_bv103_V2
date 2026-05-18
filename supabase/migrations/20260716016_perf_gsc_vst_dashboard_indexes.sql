-- Index bổ sung cho RPC dashboard / lịch sử (đo EXPLAIN trước khi thêm MV).

CREATE INDEX IF NOT EXISTS idx_gsc_sessions_ngay_bang_kiem_active
  ON public.fact_giam_sat_chung_sessions (ngay_giam_sat, bang_kiem_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_vst_sessions_ngay_khoa_active
  ON public.fact_giam_sat_vst_sessions (ngay_giam_sat, khoa_id)
  WHERE coalesce(is_active, true) = true;

CREATE INDEX IF NOT EXISTS idx_vst_obs_session_id
  ON public.fact_giam_sat_vst (session_id);

CREATE INDEX IF NOT EXISTS idx_gsc_results_session_id
  ON public.fact_giam_sat_chung_results (session_id);
