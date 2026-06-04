-- Pilot QLCV lean: UI đã gỡ tab KPI tháng; không còn consumer app cho RPC/bảng đánh giá.
-- Giữ hoan_thanh_luc trên qlcv_fact_cong_viec cho workflow hiện tại.

DROP VIEW IF EXISTS public.fact_qlcv_danh_gia_thang CASCADE;

DROP TABLE IF EXISTS public.qlcv_fact_danh_gia_thang CASCADE;

DROP FUNCTION IF EXISTS public.touch_fact_qlcv_danh_gia_thang() CASCADE;

DROP FUNCTION IF EXISTS public.fn_qlcv_tong_hop_thang(date) CASCADE;
