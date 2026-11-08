-- Probe RLS phạm vi đọc phiên VST/GSC theo vai (khớp applyVstHistoryReadScope / applyGscHistoryReadScope).
-- Probe KHÔNG tự nạp migration. Trước khi migration vào DB local, ghép nó vào cùng transaction (chạy LOCAL):
--   { echo 'BEGIN;'; cat supabase/migrations/20261108100000_gstt_session_read_scope_rls.sql scripts/sql/gstt-session-read-scope-probe.sql; } | docker exec -i supabase_db_ksnk_bv103 psql -U postgres -d postgres
-- Sau khi migration đã apply: docker exec -i supabase_db_ksnk_bv103 psql -U postgres -d postgres < scripts/sql/gstt-session-read-scope-probe.sql
-- Toàn bộ trong BEGIN…ROLLBACK: giả lập MANG_LUOI_KSNK bằng cách đổi vai tạm một user NHAN_VIEN_KSNK có sẵn.
-- Mỗi dòng: vai | bảng | thấy | kỳ_vọng. Khác nhau = lỗi.
\set ON_ERROR_STOP 1
BEGIN;

-- Chọn user mẫu (postgres, bypass RLS)
SELECT ns.auth_user_id AS guest_uid FROM mdm_nhan_su ns
  JOIN sys_user_roles ur ON ur.user_id = ns.auth_user_id JOIN sys_roles r ON r.id = ur.role_id
 WHERE r.name = 'KHACH_THONG_KE_GSTT' AND ns.is_active LIMIT 1 \gset
SELECT ns.auth_user_id AS admin_uid FROM mdm_nhan_su ns
  JOIN sys_user_roles ur ON ur.user_id = ns.auth_user_id JOIN sys_roles r ON r.id = ur.role_id
 WHERE r.name = 'ADMIN' AND ns.is_active LIMIT 1 \gset
SELECT ns.auth_user_id AS other_uid FROM mdm_nhan_su ns
  JOIN sys_user_roles ur ON ur.user_id = ns.auth_user_id JOIN sys_roles r ON r.id = ur.role_id
 WHERE r.name = 'TO_TRUONG_CSSD_TEST' AND ns.is_active LIMIT 1 \gset
-- NHAN_VIEN_KSNK không kiêm ADMIN, có nhiều phiên giám sát nhất → dùng làm NV KSNK và (sau) làm mạng lưới
SELECT ns.id AS mlk_ns, ns.auth_user_id AS mlk_uid FROM mdm_nhan_su ns
 WHERE ns.is_active AND ns.auth_user_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM sys_user_roles ur JOIN sys_roles r ON r.id = ur.role_id
                WHERE ur.user_id = ns.auth_user_id AND r.name = 'NHAN_VIEN_KSNK')
   AND NOT EXISTS (SELECT 1 FROM sys_user_roles ur JOIN sys_roles r ON r.id = ur.role_id
                    WHERE ur.user_id = ns.auth_user_id AND r.name <> 'NHAN_VIEN_KSNK')
 ORDER BY (SELECT count(*) FROM gstt_fact_vst_sessions s WHERE s.nguoi_giam_sat_id = ns.id) DESC LIMIT 1 \gset
-- Khoa lâm sàng nhiều phiên VST nhất (khác khoa của user mạng lưới)
SELECT s.khoa_id AS mlk_khoa FROM gstt_fact_vst_sessions s
 WHERE s.khoa_id IS NOT NULL AND s.khoa_id <> (SELECT khoa_id FROM mdm_nhan_su WHERE id = :'mlk_ns')
 GROUP BY 1 ORDER BY count(*) DESC LIMIT 1 \gset

CREATE TEMP TABLE _probe(vai text, bang text, thay bigint, ky_vong bigint);
GRANT INSERT, SELECT ON _probe TO authenticated;

-- Kỳ vọng toàn viện (phiên is_active)
SELECT count(*) AS all_vs FROM gstt_fact_vst_sessions WHERE COALESCE(is_active, true) \gset
SELECT count(*) AS all_gsc FROM gstt_fact_chung_sessions WHERE COALESCE(is_active, true) \gset
SELECT count(*) AS all_obs FROM gstt_fact_vst v JOIN gstt_fact_vst_sessions s ON s.id = v.session_id
 WHERE COALESCE(s.is_active, true) \gset
SELECT count(*) AS admin_obs FROM gstt_fact_vst \gset
SELECT count(*) AS admin_vs FROM gstt_fact_vst_sessions \gset
SELECT count(*) AS admin_gsc FROM gstt_fact_chung_sessions \gset

-- 1) Khách thống kê: 0
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'guest_uid', 'role', 'authenticated')::text, true);
INSERT INTO _probe SELECT 'KHACH_THONG_KE_GSTT', 'vst_sessions', count(*), 0 FROM gstt_fact_vst_sessions;
INSERT INTO _probe SELECT 'KHACH_THONG_KE_GSTT', 'chung_sessions', count(*), 0 FROM gstt_fact_chung_sessions;
INSERT INTO _probe SELECT 'KHACH_THONG_KE_GSTT', 'fact_vst', count(*), 0 FROM gstt_fact_vst;
INSERT INTO _probe SELECT 'KHACH_THONG_KE_GSTT', 'v_vst_sessions_full', count(*), 0 FROM v_gstt_giam_sat_vst_sessions_full;
INSERT INTO _probe SELECT 'KHACH_THONG_KE_GSTT', 'v_gsc_sessions_full', count(*), 0 FROM v_gstt_giam_sat_chung_sessions_full;

-- 2) Admin: toàn bộ (Admin full access gồm cả is_active=false)
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin_uid', 'role', 'authenticated')::text, true);
INSERT INTO _probe SELECT 'ADMIN', 'vst_sessions', count(*), :admin_vs FROM gstt_fact_vst_sessions;
INSERT INTO _probe SELECT 'ADMIN', 'chung_sessions', count(*), :admin_gsc FROM gstt_fact_chung_sessions;
INSERT INTO _probe SELECT 'ADMIN', 'fact_vst', count(*), :admin_obs FROM gstt_fact_vst;

-- 3) NHAN_VIEN_KSNK: toàn viện (is_active)
SELECT set_config('request.jwt.claims', json_build_object('sub', :'mlk_uid', 'role', 'authenticated')::text, true);
INSERT INTO _probe SELECT 'NHAN_VIEN_KSNK', 'vst_sessions', count(*), :all_vs FROM gstt_fact_vst_sessions;
INSERT INTO _probe SELECT 'NHAN_VIEN_KSNK', 'chung_sessions', count(*), :all_gsc FROM gstt_fact_chung_sessions;
INSERT INTO _probe SELECT 'NHAN_VIEN_KSNK', 'fact_vst', count(*), :all_obs FROM gstt_fact_vst;

-- 4) Vai khác có quyền view (không mạng lưới, không khách): toàn viện — khớp `!isMangLuoiKsnk → return query`
SELECT set_config('request.jwt.claims', json_build_object('sub', :'other_uid', 'role', 'authenticated')::text, true);
INSERT INTO _probe SELECT 'TO_TRUONG_CSSD_TEST', 'vst_sessions', count(*), :all_vs FROM gstt_fact_vst_sessions;
INSERT INTO _probe SELECT 'TO_TRUONG_CSSD_TEST', 'chung_sessions', count(*), :all_gsc FROM gstt_fact_chung_sessions;

-- 5) MANG_LUOI_KSNK (giả lập): đổi vai tạm user NV KSNK, gán khoa mlk_khoa
RESET ROLE;
DELETE FROM sys_user_roles WHERE user_id = :'mlk_uid';
INSERT INTO sys_user_roles(user_id, role_id) SELECT :'mlk_uid', id FROM sys_roles WHERE name = 'MANG_LUOI_KSNK';
UPDATE mdm_nhan_su SET khoa_id = :'mlk_khoa' WHERE id = :'mlk_ns';
SELECT count(*) AS mlk_vs FROM gstt_fact_vst_sessions
 WHERE COALESCE(is_active, true) AND (nguoi_giam_sat_id = :'mlk_ns' OR khoa_id = :'mlk_khoa') \gset
SELECT count(*) AS mlk_gsc FROM gstt_fact_chung_sessions
 WHERE COALESCE(is_active, true) AND (nguoi_giam_sat_id = :'mlk_ns' OR khoa_id = :'mlk_khoa') \gset
SELECT count(*) AS mlk_obs FROM gstt_fact_vst v JOIN gstt_fact_vst_sessions s ON s.id = v.session_id
 WHERE COALESCE(s.is_active, true) AND (s.nguoi_giam_sat_id = :'mlk_ns' OR s.khoa_id = :'mlk_khoa') \gset
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'mlk_uid', 'role', 'authenticated')::text, true);
INSERT INTO _probe SELECT 'MANG_LUOI_KSNK', 'vst_sessions', count(*), :mlk_vs FROM gstt_fact_vst_sessions;
INSERT INTO _probe SELECT 'MANG_LUOI_KSNK', 'chung_sessions', count(*), :mlk_gsc FROM gstt_fact_chung_sessions;
INSERT INTO _probe SELECT 'MANG_LUOI_KSNK', 'fact_vst', count(*), :mlk_obs FROM gstt_fact_vst;
INSERT INTO _probe SELECT 'MANG_LUOI_KSNK', 'v_vst_sessions_full', count(*), :mlk_vs FROM v_gstt_giam_sat_vst_sessions_full;

RESET ROLE;
SELECT vai, bang, thay, ky_vong, CASE WHEN thay = ky_vong THEN 'OK' ELSE 'LECH' END AS kq FROM _probe;
ROLLBACK;
