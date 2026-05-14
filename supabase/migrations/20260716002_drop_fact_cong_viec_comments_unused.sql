-- QLCV: bỏ bảng bình luận legacy (app không còn đọc/ghi).
DROP TABLE IF EXISTS public.fact_cong_viec_comments CASCADE;
