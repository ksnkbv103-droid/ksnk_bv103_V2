-- CSSD-004: đưa việc đổi tên 6 bộ vi phẫu (đã sửa tay trên DB local) vào chuỗi migration.
-- Chỉ cập nhật theo đúng mã và chỉ khi tên còn lệch; không có dòng thì không làm gì (chạy lại an toàn).
update public.cssd_dm_bo_dung_cu b
set ten_bo = v.ten
from (values
  ('B01.SET.09',     'Bộ dụng cụ phẫu thuật vi phẫu chấn thương - 1'),
  ('B01.SET.09-CN',  'Bộ dụng cụ phẫu thuật vi phẫu chấn thương - 1 (chịu nhiệt)'),
  ('B01.SET.09-KCN', 'Bộ dụng cụ phẫu thuật vi phẫu chấn thương - 1 (không chịu nhiệt)'),
  ('B01.SET.20',     'Bộ dụng cụ phẫu thuật vi phẫu chấn thương - 2'),
  ('B04.SET.09',     'Bộ dụng cụ phẫu thuật vi phẫu nhãn khoa - 1'),
  ('B04.SET.10',     'Bộ dụng cụ phẫu thuật vi phẫu nhãn khoa - 2')
) as v(ma, ten)
where b.ma_bo = v.ma and b.ten_bo is distinct from v.ten;
