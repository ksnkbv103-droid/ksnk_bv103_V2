-- PO 2026-11-16: bảng «mục tiêu viện» (lớp A) đã bỏ khỏi dự án.
-- File này giữ nguyên version 20260729121000 để chuỗi migration không lệch số, nhưng không còn tạo bảng.
-- DB đã có bảng cũ: được gỡ bằng 20261116100000_drop_bang_muc_tieu_cu.sql.
-- DB dựng mới từ đầu: bảng không bao giờ được tạo, câu DROP IF EXISTS ở file kia không làm gì.
-- Nội dung cũ (bảng + seed 85.0 + RLS + GRANT) nằm trong lịch sử git trước 2026-11-16.
SELECT 1;
