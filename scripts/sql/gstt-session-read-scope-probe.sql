-- Probe RLS phạm vi đọc phiên VST/GSC theo vai (khớp applyVstHistoryReadScope / applyGscHistoryReadScope).
-- VST (2 bảng + 2 view _full): mọi vai kể cả CHU_NHIEM_KHOA (chủ nhiệm khoa KSNK: toàn viện, VST-026), HOI_DONG_KSNK và tổ hợp (VST-015).
-- GSC: chỉ khách/admin/NV KSNK/mạng lưới/vai khác; HOI_DONG_KSNK thuần ở GSC thuộc VST-023, CHƯA kiểm ở đây.
-- Probe KHÔNG tự nạp migration; thứ tự áp 20261108100000 → 20261114150000 → 20261114160000 (VST-026). Trước khi apply vào DB local, ghép vào cùng transaction (chạy LOCAL):
--   { echo 'BEGIN;'; cat supabase/migrations/20261114160000_gstt_vst_rls_cnk_toan_vien.sql scripts/sql/gstt-session-read-scope-probe.sql; } | docker exec -i supabase_db_ksnk_bv103 psql -q -U postgres -d postgres -v ON_ERROR_STOP=1
-- Sau khi migration đã apply: docker exec -i supabase_db_ksnk_bv103 psql -q -U postgres -d postgres -v ON_ERROR_STOP=1 < scripts/sql/gstt-session-read-scope-probe.sql
-- Mã thoát 0 = mọi dòng OK; ≠ 0 = có dòng LECH (RAISE cuối file) hoặc lỗi SQL.
-- Toàn bộ trong BEGIN…ROLLBACK: giả lập vai (mạng lưới, CNK, HĐ, tổ hợp) bằng cách đổi vai tạm một user NHAN_VIEN_KSNK có sẵn — local chưa có tài khoản CNK/HĐ/mạng lưới thật.
-- CHỈ DB LOCAL, KHÔNG BAO GIỜ chạy trên prod: probe đổi tạm sys_user_roles và mdm_nhan_su.khoa_id của user mẫu (khóa dòng của người thật) trước khi ROLLBACK.
-- Các dòng «MẪU» và «co_quyen_view_vst» chống pass rỗng: kỳ vọng 0 chỉ có nghĩa khi dữ liệu có thật và vai đó thật sự có quyền xem.
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

-- Dựng vai tạm cho user mẫu (chạy bằng postgres, trước SET ROLE) và đếm 4 đối tượng VST dưới RLS (chạy bằng authenticated)
CREATE FUNCTION pg_temp._probe_as(p_uid uuid, p_ns uuid, p_roles text[], p_khoa uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM sys_user_roles WHERE user_id = p_uid;
  INSERT INTO sys_user_roles(user_id, role_id) SELECT p_uid, id FROM sys_roles WHERE name = ANY(p_roles);
  UPDATE mdm_nhan_su SET khoa_id = p_khoa WHERE id = p_ns;
END $$;
CREATE FUNCTION pg_temp._probe_cnt(p_vai text, e_vs bigint, e_obs bigint, e_vvs bigint, e_vobs bigint) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO _probe
  SELECT p_vai, 'vst_sessions', count(*), e_vs FROM gstt_fact_vst_sessions
  UNION ALL SELECT p_vai, 'fact_vst', count(*), e_obs FROM gstt_fact_vst
  UNION ALL SELECT p_vai, 'v_vst_sessions_full', count(*), e_vvs FROM v_gstt_giam_sat_vst_sessions_full
  UNION ALL SELECT p_vai, 'v_vst_full', count(*), e_vobs FROM v_gstt_giam_sat_vst_full;
$$;
-- Mặc định Supabase thu hồi EXECUTE của PUBLIC trên hàm mới; authenticated cần quyền gọi hàm tạm này
GRANT EXECUTE ON FUNCTION pg_temp._probe_cnt(text, bigint, bigint, bigint, bigint) TO authenticated;

-- Kỳ vọng toàn viện (phiên is_active)
SELECT count(*) AS all_vs FROM gstt_fact_vst_sessions WHERE COALESCE(is_active, true) \gset
SELECT count(*) AS all_gsc FROM gstt_fact_chung_sessions WHERE COALESCE(is_active, true) \gset
SELECT count(*) AS all_obs FROM gstt_fact_vst v JOIN gstt_fact_vst_sessions s ON s.id = v.session_id
 WHERE COALESCE(s.is_active, true) \gset
SELECT count(*) AS admin_obs FROM gstt_fact_vst \gset
SELECT count(*) AS admin_vs FROM gstt_fact_vst_sessions \gset
SELECT count(*) AS admin_gsc FROM gstt_fact_chung_sessions \gset
-- Kỳ vọng toàn viện (is_active) cho hai view (tính bằng postgres, trước mục 1)
SELECT count(*) AS all_vvs FROM v_gstt_giam_sat_vst_sessions_full WHERE COALESCE(is_active, true) \gset
SELECT count(*) AS all_vobs FROM v_gstt_giam_sat_vst_full vf
 WHERE vf.session_id IN (SELECT id FROM gstt_fact_vst_sessions WHERE COALESCE(is_active, true)) \gset

-- 1) Khách thống kê: 0
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'guest_uid', 'role', 'authenticated')::text, true);
INSERT INTO _probe SELECT 'KHACH_THONG_KE_GSTT', 'vst_sessions', count(*), 0 FROM gstt_fact_vst_sessions;
INSERT INTO _probe SELECT 'KHACH_THONG_KE_GSTT', 'chung_sessions', count(*), 0 FROM gstt_fact_chung_sessions;
INSERT INTO _probe SELECT 'KHACH_THONG_KE_GSTT', 'fact_vst', count(*), 0 FROM gstt_fact_vst;
INSERT INTO _probe SELECT 'KHACH_THONG_KE_GSTT', 'v_vst_sessions_full', count(*), 0 FROM v_gstt_giam_sat_vst_sessions_full;
INSERT INTO _probe SELECT 'KHACH_THONG_KE_GSTT', 'v_gsc_sessions_full', count(*), 0 FROM v_gstt_giam_sat_chung_sessions_full;
INSERT INTO _probe SELECT 'KHACH_THONG_KE_GSTT', 'co_quyen_view_vst', (SELECT public.fn_sys_has_permission('GIAM_SAT_VST', 'view'))::int, 1;

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

-- 4) Vai khác có quyền view (không mạng lưới, không khách): toàn viện — khớp `!isMangLuoiKsnk → return query` (kiểm đủ 4 đối tượng VST)
SELECT set_config('request.jwt.claims', json_build_object('sub', :'other_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('TO_TRUONG_CSSD_TEST', :all_vs, :all_obs, :all_vvs, :all_vobs);
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

-- === VST-015/VST-026: CHU_NHIEM_KHOA (toàn viện), HOI_DONG_KSNK và tổ hợp (khớp vst-read-scope.ts) ===
-- User mẫu mlk tự giám sát nhiều phiên NGOÀI khoa mlk_khoa và thuộc khoa mlk_khoa → thử riêng từng điều kiện «tự giám sát» và «cùng khoa».
RESET ROLE;
SELECT count(*) AS ngoai_khoa FROM gstt_fact_vst_sessions
 WHERE COALESCE(is_active, true) AND nguoi_giam_sat_id = :'mlk_ns' AND khoa_id IS DISTINCT FROM :'mlk_khoa' \gset
-- Phạm vi KHOA mlk_khoa (không cộng phiên tự giám sát ở khoa khác): không còn là kỳ vọng của vai nào (CNK đã toàn viện, VST-026);
-- chỉ dùng chứng minh dữ liệu mẫu hẹp hơn toàn viện (các dòng MẪU), để CNK «toàn viện» không pass nhầm khi policy còn lọc khoa.
SELECT count(*) AS khoa_vs FROM gstt_fact_vst_sessions WHERE COALESCE(is_active, true) AND khoa_id = :'mlk_khoa' \gset
SELECT count(*) AS khoa_obs FROM gstt_fact_vst v JOIN gstt_fact_vst_sessions s ON s.id = v.session_id
 WHERE COALESCE(s.is_active, true) AND s.khoa_id = :'mlk_khoa' \gset
SELECT count(*) AS khoa_vvs FROM v_gstt_giam_sat_vst_sessions_full WHERE COALESCE(is_active, true) AND khoa_id = :'mlk_khoa' \gset
SELECT count(*) AS khoa_vobs FROM v_gstt_giam_sat_vst_full vf
 WHERE vf.session_id IN (SELECT id FROM gstt_fact_vst_sessions WHERE COALESCE(is_active, true) AND khoa_id = :'mlk_khoa') \gset
-- Kỳ vọng mạng lưới (tự giám sát HOẶC cùng khoa) cho hai view
SELECT count(*) AS mlk_vvs FROM v_gstt_giam_sat_vst_sessions_full
 WHERE COALESCE(is_active, true) AND (nguoi_giam_sat_id = :'mlk_ns' OR khoa_id = :'mlk_khoa') \gset
SELECT count(*) AS mlk_vobs FROM v_gstt_giam_sat_vst_full vf
 WHERE vf.session_id IN (SELECT id FROM gstt_fact_vst_sessions
                          WHERE COALESCE(is_active, true) AND (nguoi_giam_sat_id = :'mlk_ns' OR khoa_id = :'mlk_khoa')) \gset
-- Kiểm mẫu: nếu dữ liệu không đủ để phân biệt các nhánh thì probe không được pass rỗng.
-- Mỗi dòng cộng 4 chỉ báo (phiên, quan sát, 2 view) nên kỳ vọng 4; đối tượng nào rỗng/không hẹp hơn thì dòng này LECH.
INSERT INTO _probe VALUES ('MẪU', 'tu_giam_sat_ngoai_khoa_co_du_lieu', LEAST(:ngoai_khoa, 1), 1);
INSERT INTO _probe VALUES ('MẪU', 'toan_vien_co_du_lieu_4_doi_tuong',
  LEAST(:all_vs, 1) + LEAST(:all_obs, 1) + LEAST(:all_vvs, 1) + LEAST(:all_vobs, 1), 4);
INSERT INTO _probe VALUES ('MẪU', 'khoa_mlk_co_du_lieu_4_doi_tuong',
  LEAST(:khoa_vs, 1) + LEAST(:khoa_obs, 1) + LEAST(:khoa_vvs, 1) + LEAST(:khoa_vobs, 1), 4);
INSERT INTO _probe VALUES ('MẪU', 'khoa_mlk_hep_hon_toan_vien_4_doi_tuong',
  LEAST(GREATEST(:all_vs - :khoa_vs, 0), 1) + LEAST(GREATEST(:all_obs - :khoa_obs, 0), 1)
  + LEAST(GREATEST(:all_vvs - :khoa_vvs, 0), 1) + LEAST(GREATEST(:all_vobs - :khoa_vobs, 0), 1), 4);
-- Phạm vi mạng lưới cũng phải hẹp hơn toàn viện, nếu không MANG_LUOI+CNK (kỳ vọng toàn viện) không phân biệt được với mạng lưới thuần.
INSERT INTO _probe VALUES ('MẪU', 'mlk_hep_hon_toan_vien_4_doi_tuong',
  LEAST(GREATEST(:all_vs - :mlk_vs, 0), 1) + LEAST(GREATEST(:all_obs - :mlk_obs, 0), 1)
  + LEAST(GREATEST(:all_vvs - :mlk_vvs, 0), 1) + LEAST(GREATEST(:all_vobs - :mlk_vobs, 0), 1), 4);

-- 6) CHU_NHIEM_KHOA (chủ nhiệm khoa KSNK = TK_KSNK, M01 dòng 22): toàn viện, không giới hạn khoa (VST-026)
SELECT pg_temp._probe_as(:'mlk_uid'::uuid, :'mlk_ns'::uuid, ARRAY['CHU_NHIEM_KHOA'], :'mlk_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'mlk_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('CHU_NHIEM_KHOA', :all_vs, :all_obs, :all_vvs, :all_vobs);

-- 7) HOI_DONG_KSNK thuần: 0 (ẩn danh, R1.34) dù tự giám sát nhiều phiên và cùng khoa
RESET ROLE;
SELECT pg_temp._probe_as(:'mlk_uid'::uuid, :'mlk_ns'::uuid, ARRAY['HOI_DONG_KSNK'], :'mlk_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'mlk_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('HOI_DONG_KSNK', 0, 0, 0, 0);
INSERT INTO _probe SELECT 'HOI_DONG_KSNK', 'co_quyen_view_vst', (SELECT public.fn_sys_has_permission('GIAM_SAT_VST', 'view'))::int, 1;

-- 8) CNK + HĐ: có CHU_NHIEM_KHOA → toàn viện (khớp hasHospitalWideVstRead; isHoiDongOnly = sai)
RESET ROLE;
SELECT pg_temp._probe_as(:'mlk_uid'::uuid, :'mlk_ns'::uuid, ARRAY['CHU_NHIEM_KHOA', 'HOI_DONG_KSNK'], :'mlk_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'mlk_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('CNK+HOI_DONG', :all_vs, :all_obs, :all_vvs, :all_vobs);

-- 9) HĐ + vai khác không rộng (TO_TRUONG_CSSD_TEST), không CNK: vẫn 0 (isHoiDongOnly = đúng)
RESET ROLE;
SELECT pg_temp._probe_as(:'mlk_uid'::uuid, :'mlk_ns'::uuid, ARRAY['HOI_DONG_KSNK', 'TO_TRUONG_CSSD_TEST'], :'mlk_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'mlk_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('HOI_DONG+TO_TRUONG', 0, 0, 0, 0);
INSERT INTO _probe SELECT 'HOI_DONG+TO_TRUONG', 'co_quyen_view_vst', (SELECT public.fn_sys_has_permission('GIAM_SAT_VST', 'view'))::int, 1;

-- 10) MANG_LUOI + CNK: CNK (toàn viện) thắng phạm vi mạng lưới (khớp hasHospitalWideVstRead trước nhánh mạng lưới)
RESET ROLE;
SELECT pg_temp._probe_as(:'mlk_uid'::uuid, :'mlk_ns'::uuid, ARRAY['MANG_LUOI_KSNK', 'CHU_NHIEM_KHOA'], :'mlk_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'mlk_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('MANG_LUOI+CNK', :all_vs, :all_obs, :all_vvs, :all_vobs);

-- 11) MANG_LUOI + HĐ: có vai rộng (mạng lưới) nên HĐ không còn «thuần» → phạm vi mạng lưới
RESET ROLE;
SELECT pg_temp._probe_as(:'mlk_uid'::uuid, :'mlk_ns'::uuid, ARRAY['MANG_LUOI_KSNK', 'HOI_DONG_KSNK'], :'mlk_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'mlk_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('MANG_LUOI+HOI_DONG', :mlk_vs, :mlk_obs, :mlk_vvs, :mlk_vobs);

-- 12) NHAN_VIEN_KSNK + CNK: NV KSNK thắng → toàn viện
RESET ROLE;
SELECT pg_temp._probe_as(:'mlk_uid'::uuid, :'mlk_ns'::uuid, ARRAY['NHAN_VIEN_KSNK', 'CHU_NHIEM_KHOA'], :'mlk_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'mlk_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('NV_KSNK+CNK', :all_vs, :all_obs, :all_vvs, :all_vobs);

-- 13) CNK chưa gán khoa (khoa_id NULL): vẫn toàn viện (VST-026) — không còn rơi về 0 như nhánh «khoa mình» cũ
RESET ROLE;
SELECT pg_temp._probe_as(:'mlk_uid'::uuid, :'mlk_ns'::uuid, ARRAY['CHU_NHIEM_KHOA'], NULL::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'mlk_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('CNK_khoa_NULL', :all_vs, :all_obs, :all_vvs, :all_vobs);
INSERT INTO _probe SELECT 'CNK_khoa_NULL', 'co_quyen_view_vst', (SELECT public.fn_sys_has_permission('GIAM_SAT_VST', 'view'))::int, 1;

RESET ROLE;
SELECT vai, bang, thay, ky_vong, CASE WHEN thay = ky_vong THEN 'OK' ELSE 'LECH' END AS kq FROM _probe;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM _probe WHERE thay <> ky_vong;
  IF n > 0 THEN RAISE EXCEPTION 'PROBE: % dòng LECH (xem bảng kết quả phía trên)', n; END IF;
END $$;
ROLLBACK;
