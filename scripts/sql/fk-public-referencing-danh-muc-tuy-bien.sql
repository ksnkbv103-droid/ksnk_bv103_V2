-- Liệt kê FK ở schema public vẫn trỏ tới public.danh_muc_tuy_bien (PostgreSQL introspection).
-- Sau khi hub đã drop: kết quả mong đợi là **0 dòng** — không có FK nào còn trỏ bảng không tồn tại.
-- Greenfield / post-sunset: script vẫn chạy được; output rỗng = OK.

SELECT
  tc.table_name AS fk_from_table,
  kcu.column_name AS fk_from_column,
  tc.constraint_name,
  ccu.table_name AS references_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'danh_muc_tuy_bien'
ORDER BY tc.table_name, kcu.ordinal_position;
