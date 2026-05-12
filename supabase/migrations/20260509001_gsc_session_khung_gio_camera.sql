-- Khung giờ giám sát phiên (đặc biệt giám sát qua camera) — đồng bộ với VST sessions
ALTER TABLE public.fact_giam_sat_chung_sessions
  ADD COLUMN IF NOT EXISTS thoi_gian_bat_dau timestamptz,
  ADD COLUMN IF NOT EXISTS thoi_gian_ket_thuc timestamptz;

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.thoi_gian_bat_dau IS 'Giờ bắt đầu khung giám sát trong ngày (ưu tiên khi giám sát qua camera).';
COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.thoi_gian_ket_thuc IS 'Giờ kết thúc khung giám sát trong ngày.';
