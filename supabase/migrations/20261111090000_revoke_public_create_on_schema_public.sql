-- Thu hồi CREATE trên schema public từ PUBLIC (prod có ACL =UC/postgres, local không có).
-- Hiện anon/authenticated/ci_migration_reader đều tạo được bảng/hàm trong public qua PUBLIC.
-- Giữ nguyên: postgres=UC (owner), anon/authenticated/service_role=U.
-- Hoàn tác: grant create on schema public to public;

revoke create on schema public from public;
