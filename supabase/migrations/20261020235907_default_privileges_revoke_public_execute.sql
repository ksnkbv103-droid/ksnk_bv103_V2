-- Đã apply prod 2026-10-20 (version 20261020235907) qua MCP apply_migration.
-- Bổ sung dòng toàn cục của 20261021003002 mà prod còn thiếu: hàm mới do postgres tạo không còn EXECUTE mặc định cho PUBLIC.
-- Hàm cần cho authenticated phải GRANT EXECUTE tường minh.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
