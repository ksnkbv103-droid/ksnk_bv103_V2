-- Role chỉ đọc cho CI (job «sync-check» trong .github/workflows/ci.yml):
-- chỉ SELECT (version, name) trên supabase_migrations.schema_migrations.
-- Thay cho PAT Supabase toàn tài khoản (security-auditor 2026-11-10, mức Cao).
--
-- Tạo NOLOGIN, không mật khẩu trong migration. PO tự bật đăng nhập trên prod:
--   alter role ci_migration_reader with login password '<mật khẩu tự sinh>';
-- rồi đặt chuỗi kết nối (pooler) làm secret GitHub SYNC_CHECK_DB_URL.
-- Thu hồi: alter role ci_migration_reader with nologin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'ci_migration_reader') then
    create role ci_migration_reader
      nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls
      connection limit 3;
  end if;
end
$$;

alter role ci_migration_reader set statement_timeout = '10s';
alter role ci_migration_reader set default_transaction_read_only = on;

grant usage on schema supabase_migrations to ci_migration_reader;
grant select (version, name) on supabase_migrations.schema_migrations to ci_migration_reader;
