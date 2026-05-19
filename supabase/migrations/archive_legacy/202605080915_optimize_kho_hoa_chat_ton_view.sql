-- Tổng hợp tồn kho hóa chất theo lô ở DB để tránh kéo toàn bộ giao dịch lên app.
-- AGENTS §5b / SMART_DB: đẩy tính toán aggregate nặng về DB.

CREATE OR REPLACE VIEW public.v_fact_kho_hoa_chat_ton_lo AS
SELECT
  g.dm_hoa_chat_id,
  g.ma_lo,
  g.han_su_dung,
  SUM(g.so_luong_co_dau) AS ton_so_luong
FROM public.fact_kho_hoa_chat_giao_dich g
WHERE COALESCE(g.is_active, true) = true
GROUP BY g.dm_hoa_chat_id, g.ma_lo, g.han_su_dung;

COMMENT ON VIEW public.v_fact_kho_hoa_chat_ton_lo IS
'Tồn theo lô = SUM(so_luong_co_dau) nhóm theo dm_hoa_chat_id + ma_lo + han_su_dung.';
