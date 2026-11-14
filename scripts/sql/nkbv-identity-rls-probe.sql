-- Probe RLS NKBV (NKBV-035): Hội đồng KSNK THUẦN không đọc được sáu bảng nkbv_fact_* có họ tên / mã bệnh nhân / ngày sinh qua PostgREST
-- (benh_an, device_registry, labid_event, mau_so_phau_thuat, su_kien, vi_sinh). Khớp isNkbvHoiDongOnly (src/modules/giam-sat-nkbv/lib/nkbv-khoa-scope.ts, NKBV-032/034):
--   HOI_DONG_KSNK và KHÔNG có CHU_NHIEM_KHOA / ADMIN / NHAN_VIEN_KSNK / MANG_LUOI_KSNK → 0 dòng; mọi vai khác giữ đúng hành vi trước migration.
-- SSOT: M03 cột BGĐ «Xa» = chỉ xem ẩn danh; HĐ ≈ BGĐ là GIẢ ĐỊNH chờ PO (NKBV-034). Thống kê NKBV đọc bằng admin client nên không bị ảnh hưởng.
-- Probe KHÔNG tự nạp migration. Thứ tự áp: 20261111170000 (NKBV-003, phạm vi khoa) → 20261114180000 (NKBV-035, chặn HĐ thuần).
--   Chưa áp migration NKBV-035 (kỳ vọng ĐỎ: HĐ thuần đọc > 0 dòng):
--     docker exec -i supabase_db_ksnk_bv103 psql -q -U postgres -d postgres -v ON_ERROR_STOP=1 < scripts/sql/nkbv-identity-rls-probe.sql
--   Đã áp migration (kỳ vọng XANH): cùng lệnh trên. Ghép thử không áp thật (migration chạy trong cùng BEGIN, tự ROLLBACK ở cuối probe):
--     { echo 'BEGIN;'; cat supabase/migrations/20261114180000_nkbv_fact_select_rls_hoi_dong_identity.sql scripts/sql/nkbv-identity-rls-probe.sql; } | docker exec -i supabase_db_ksnk_bv103 psql -q -U postgres -d postgres -v ON_ERROR_STOP=1
-- Mã thoát 0 = mọi dòng OK; ≠ 0 = có dòng LECH (RAISE cuối file) hoặc lỗi SQL.
-- Toàn bộ trong BEGIN…ROLLBACK: giả lập vai bằng cách đổi vai tạm MỘT user NHAN_VIEN_KSNK có sẵn — local chưa có tài khoản HĐ/mạng lưới thật.
-- CHỈ DB LOCAL, KHÔNG BAO GIỜ chạy trên prod: probe đổi tạm sys_user_roles và mdm_nhan_su.khoa_id của user mẫu (khóa dòng của người thật) trước khi ROLLBACK.
-- Hai bảng device_registry và labid_event rỗng ở seed local nên probe chèn dòng mẫu (trong transaction, postgres bỏ qua RLS) để «0 dòng» của HĐ có nghĩa.
-- Các dòng «MẪU», «co_quyen_view_nkbv» chống pass rỗng: kỳ vọng 0 chỉ có nghĩa khi dữ liệu có thật và vai đó thật sự có quyền xem.
-- Dòng GHI_NHAN = hiện trạng cố ý chưa đổi (cổng PO): HĐ kiêm Mạng lưới / NV KSNK / CNK vẫn đọc rộng (khớp app: wide = HĐ trong resolveNkbvKhoaRestriction).
-- Mỗi dòng: vai | bảng | thấy | kỳ_vọng. Khác nhau = lỗi.
\set ON_ERROR_STOP 1
BEGIN;

-- Chọn user mẫu: NHAN_VIEN_KSNK thuần, còn hoạt động (postgres, bỏ qua RLS)
SELECT ns.id AS u_ns, ns.auth_user_id AS u_uid FROM mdm_nhan_su ns
 WHERE ns.is_active AND ns.auth_user_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM sys_user_roles ur JOIN sys_roles r ON r.id = ur.role_id
                WHERE ur.user_id = ns.auth_user_id AND r.name = 'NHAN_VIEN_KSNK')
   AND NOT EXISTS (SELECT 1 FROM sys_user_roles ur JOIN sys_roles r ON r.id = ur.role_id
                    WHERE ur.user_id = ns.auth_user_id AND r.name <> 'NHAN_VIEN_KSNK')
 ORDER BY ns.id LIMIT 1 \gset
-- Khoa điều trị có nhiều bệnh án nhất (làm khoa của vai Mạng lưới) và một mã bệnh án thuộc khoa đó
SELECT khoa_dieu_tri_id AS k_khoa FROM nkbv_fact_benh_an
 WHERE khoa_dieu_tri_id IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 1 \gset
SELECT ma_benh_an AS k_ma FROM nkbv_fact_benh_an
 WHERE khoa_dieu_tri_id = :'k_khoa' AND ma_benh_an IS NOT NULL ORDER BY ma_benh_an LIMIT 1 \gset

-- Dòng mẫu cho hai bảng rỗng: một dòng THUỘC khoa k_khoa (vai Mạng lưới thấy) và một dòng NGOÀI khoa (vai Mạng lưới không thấy)
INSERT INTO nkbv_fact_device_registry(ma_benh_an, device_type, insertion_date, khoa_id) VALUES
  ('PROBE-DR-TRONG', 'CENTRAL_LINE', current_date, :'k_khoa'),
  ('PROBE-DR-NGOAI', 'FOLEY', current_date, gen_random_uuid());
INSERT INTO nkbv_fact_labid_event(ma_benh_an, event_type, phenotype, organism_category, specimen_class, collection_date) VALUES
  (:'k_ma', 'PROBE', 'PROBE', 'PROBE', 'BLOOD', current_date),
  ('PROBE-LE-NGOAI', 'PROBE', 'PROBE', 'PROBE', 'BLOOD', current_date);

CREATE TEMP TABLE _probe(vai text, bang text, thay bigint, ky_vong bigint);
GRANT INSERT, SELECT ON _probe TO authenticated;

-- Dựng vai tạm cho user mẫu (chạy bằng postgres, trước SET ROLE)
CREATE FUNCTION pg_temp._probe_as(p_uid uuid, p_ns uuid, p_roles text[], p_khoa uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM sys_user_roles WHERE user_id = p_uid;
  INSERT INTO sys_user_roles(user_id, role_id) SELECT p_uid, id FROM sys_roles WHERE name = ANY(p_roles);
  UPDATE mdm_nhan_su SET khoa_id = p_khoa WHERE id = p_ns;
END $$;
-- Đếm sáu bảng dưới RLS (chạy bằng authenticated)
CREATE FUNCTION pg_temp._probe_cnt(p_vai text, e_ba bigint, e_dr bigint, e_le bigint, e_msp bigint, e_sk bigint, e_vs bigint) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO _probe
  SELECT p_vai, 'benh_an', count(*), e_ba FROM nkbv_fact_benh_an
  UNION ALL SELECT p_vai, 'device_registry', count(*), e_dr FROM nkbv_fact_device_registry
  UNION ALL SELECT p_vai, 'labid_event', count(*), e_le FROM nkbv_fact_labid_event
  UNION ALL SELECT p_vai, 'mau_so_phau_thuat', count(*), e_msp FROM nkbv_fact_mau_so_phau_thuat
  UNION ALL SELECT p_vai, 'su_kien', count(*), e_sk FROM nkbv_fact_su_kien
  UNION ALL SELECT p_vai, 'vi_sinh', count(*), e_vs FROM nkbv_fact_vi_sinh;
$$;
-- Mặc định Supabase thu hồi EXECUTE của PUBLIC trên hàm mới; authenticated cần quyền gọi hàm tạm này
GRANT EXECUTE ON FUNCTION pg_temp._probe_cnt(text, bigint, bigint, bigint, bigint, bigint, bigint) TO authenticated;

-- Kỳ vọng toàn viện (không lọc is_active: chính sách SELECT không có điều kiện đó)
SELECT count(*) AS all_ba FROM nkbv_fact_benh_an \gset
SELECT count(*) AS all_dr FROM nkbv_fact_device_registry \gset
SELECT count(*) AS all_le FROM nkbv_fact_labid_event \gset
SELECT count(*) AS all_msp FROM nkbv_fact_mau_so_phau_thuat \gset
SELECT count(*) AS all_sk FROM nkbv_fact_su_kien \gset
SELECT count(*) AS all_vs FROM nkbv_fact_vi_sinh \gset

-- Kỳ vọng Mạng lưới (phạm vi khoa k_khoa) tính LẠI bằng điều kiện của chính sách cũ (20261111170000), độc lập với RESTRICTIVE mới:
-- tập mã bệnh án của khoa = bệnh án điều trị tại khoa ∪ bệnh án có ngày nằm khoa đó (fn_nkbv_actor_khoa_ma_benh_an_set)
CREATE TEMP TABLE _tap_ba AS
  SELECT ma_benh_an FROM nkbv_fact_benh_an WHERE khoa_dieu_tri_id = :'k_khoa' AND ma_benh_an IS NOT NULL
  UNION SELECT ma_benh_an FROM nkbv_fact_ba_ngay_khoa WHERE khoa_id = :'k_khoa' AND ma_benh_an IS NOT NULL;
SELECT count(*) AS mlk_ba FROM nkbv_fact_benh_an WHERE ma_benh_an IN (SELECT ma_benh_an FROM _tap_ba) \gset
SELECT count(*) AS mlk_dr FROM nkbv_fact_device_registry
 WHERE khoa_id = :'k_khoa' OR ma_benh_an IN (SELECT ma_benh_an FROM _tap_ba) \gset
SELECT count(*) AS mlk_le FROM nkbv_fact_labid_event WHERE ma_benh_an IN (SELECT ma_benh_an FROM _tap_ba) \gset
SELECT count(*) AS mlk_msp FROM nkbv_fact_mau_so_phau_thuat WHERE khoa_id = :'k_khoa' \gset
SELECT count(*) AS mlk_sk FROM nkbv_fact_su_kien WHERE khoa_ghi_nhan_id = :'k_khoa' \gset
SELECT count(*) AS mlk_vs FROM nkbv_fact_vi_sinh WHERE ma_benh_an IN (SELECT ma_benh_an FROM _tap_ba) \gset

-- Kiểm mẫu: nếu dữ liệu không đủ để phân biệt các nhánh thì probe không được pass rỗng.
INSERT INTO _probe VALUES ('MẪU', 'ca_6_bang_co_du_lieu',
  LEAST(:all_ba, 1) + LEAST(:all_dr, 1) + LEAST(:all_le, 1) + LEAST(:all_msp, 1) + LEAST(:all_sk, 1) + LEAST(:all_vs, 1), 6);
INSERT INTO _probe VALUES ('MẪU', 'khoa_co_du_lieu_4_bang',
  LEAST(:mlk_ba, 1) + LEAST(:mlk_dr, 1) + LEAST(:mlk_le, 1) + LEAST(:mlk_vs, 1), 4);
INSERT INTO _probe VALUES ('MẪU', 'khoa_hep_hon_toan_vien_4_bang',
  LEAST(GREATEST(:all_ba - :mlk_ba, 0), 1) + LEAST(GREATEST(:all_dr - :mlk_dr, 0), 1)
  + LEAST(GREATEST(:all_le - :mlk_le, 0), 1) + LEAST(GREATEST(:all_vs - :mlk_vs, 0), 1), 4);
-- Cấu trúc: đủ sáu chính sách RESTRICTIVE chặn HĐ thuần, trên đúng sáu bảng, cho authenticated
INSERT INTO _probe SELECT 'CAU_TRUC', 'policy_restrictive_hoi_dong_deny', count(*), 6
  FROM pg_policies
 WHERE schemaname = 'public' AND permissive = 'RESTRICTIVE' AND cmd = 'SELECT' AND roles = '{authenticated}'
   AND tablename IN ('nkbv_fact_benh_an', 'nkbv_fact_device_registry', 'nkbv_fact_labid_event',
                     'nkbv_fact_mau_so_phau_thuat', 'nkbv_fact_su_kien', 'nkbv_fact_vi_sinh')
   AND policyname = tablename || '_select_hoi_dong_deny';

-- 1) HOI_DONG_KSNK thuần: 0 ở cả sáu bảng (không đọc được họ tên / mã bệnh nhân) dù CÓ quyền GIAM_SAT_NKBV:view
SELECT pg_temp._probe_as(:'u_uid'::uuid, :'u_ns'::uuid, ARRAY['HOI_DONG_KSNK'], :'k_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'u_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('HOI_DONG_KSNK', 0, 0, 0, 0, 0, 0);
INSERT INTO _probe SELECT 'HOI_DONG_KSNK', 'co_quyen_view_nkbv', (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'))::int, 1;

-- 2) ADMIN: toàn bộ
RESET ROLE;
SELECT pg_temp._probe_as(:'u_uid'::uuid, :'u_ns'::uuid, ARRAY['ADMIN'], :'k_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'u_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('ADMIN', :all_ba, :all_dr, :all_le, :all_msp, :all_sk, :all_vs);

-- 3) NHAN_VIEN_KSNK: toàn bộ
RESET ROLE;
SELECT pg_temp._probe_as(:'u_uid'::uuid, :'u_ns'::uuid, ARRAY['NHAN_VIEN_KSNK'], :'k_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'u_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('NHAN_VIEN_KSNK', :all_ba, :all_dr, :all_le, :all_msp, :all_sk, :all_vs);

-- 4) Vai khác có quyền view, không HĐ, không mạng lưới (TO_TRUONG_CSSD_TEST): toàn bộ như trước
RESET ROLE;
SELECT pg_temp._probe_as(:'u_uid'::uuid, :'u_ns'::uuid, ARRAY['TO_TRUONG_CSSD_TEST'], :'k_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'u_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('TO_TRUONG_CSSD_TEST', :all_ba, :all_dr, :all_le, :all_msp, :all_sk, :all_vs);
INSERT INTO _probe SELECT 'TO_TRUONG_CSSD_TEST', 'co_quyen_view_nkbv', (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'))::int, 1;

-- 5) MANG_LUOI_KSNK: giữ phạm vi khoa của NKBV-003 (không đổi sau NKBV-035)
RESET ROLE;
SELECT pg_temp._probe_as(:'u_uid'::uuid, :'u_ns'::uuid, ARRAY['MANG_LUOI_KSNK'], :'k_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'u_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('MANG_LUOI_KSNK', :mlk_ba, :mlk_dr, :mlk_le, :mlk_msp, :mlk_sk, :mlk_vs);

-- 6) CHU_NHIEM_KHOA thuần: không có quyền GIAM_SAT_NKBV:view → 0 như trước (chứng minh dòng 8 đọc được là nhờ quyền view của HĐ)
RESET ROLE;
SELECT pg_temp._probe_as(:'u_uid'::uuid, :'u_ns'::uuid, ARRAY['CHU_NHIEM_KHOA'], :'k_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'u_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('CHU_NHIEM_KHOA', 0, 0, 0, 0, 0, 0);
INSERT INTO _probe SELECT 'CHU_NHIEM_KHOA', 'co_quyen_view_nkbv', (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'))::int, 0;

-- 7) ADMIN + HĐ: ADMIN thắng → toàn bộ
RESET ROLE;
SELECT pg_temp._probe_as(:'u_uid'::uuid, :'u_ns'::uuid, ARRAY['ADMIN', 'HOI_DONG_KSNK'], :'k_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'u_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('ADMIN+HOI_DONG', :all_ba, :all_dr, :all_le, :all_msp, :all_sk, :all_vs);

-- 8) GHI_NHAN (cổng PO): HĐ + CNK ≡ TK_KSNK «X*» (M03) → vẫn đọc toàn bộ như trước; khớp isNkbvHoiDongOnly = sai
RESET ROLE;
SELECT pg_temp._probe_as(:'u_uid'::uuid, :'u_ns'::uuid, ARRAY['HOI_DONG_KSNK', 'CHU_NHIEM_KHOA'], :'k_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'u_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('GHI_NHAN HOI_DONG+CNK', :all_ba, :all_dr, :all_le, :all_msp, :all_sk, :all_vs);

-- 9) HĐ + NHAN_VIEN_KSNK: NV KSNK thắng → toàn bộ
RESET ROLE;
SELECT pg_temp._probe_as(:'u_uid'::uuid, :'u_ns'::uuid, ARRAY['HOI_DONG_KSNK', 'NHAN_VIEN_KSNK'], :'k_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'u_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('HOI_DONG+NV_KSNK', :all_ba, :all_dr, :all_le, :all_msp, :all_sk, :all_vs);

-- 10) GHI_NHAN (cổng PO, khoảng hở có sẵn): HĐ + MANG_LUOI. fn_nkbv_actor_khoa_restricted() loại HĐ nên KHÔNG giới hạn khoa → đọc toàn bộ
-- (app cũng cho qua: wide trong resolveNkbvKhoaRestriction). Đổi hành vi này là quyết định riêng của PO, không thuộc NKBV-035.
RESET ROLE;
SELECT pg_temp._probe_as(:'u_uid'::uuid, :'u_ns'::uuid, ARRAY['HOI_DONG_KSNK', 'MANG_LUOI_KSNK'], :'k_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'u_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('GHI_NHAN HOI_DONG+MANG_LUOI', :all_ba, :all_dr, :all_le, :all_msp, :all_sk, :all_vs);

-- 11) HĐ + vai khác không rộng (TO_TRUONG_CSSD_TEST), không CNK/ADMIN/NV KSNK/mạng lưới: vẫn «thuần» → 0 (khớp isNkbvHoiDongOnly = đúng)
RESET ROLE;
SELECT pg_temp._probe_as(:'u_uid'::uuid, :'u_ns'::uuid, ARRAY['HOI_DONG_KSNK', 'TO_TRUONG_CSSD_TEST'], :'k_khoa'::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'u_uid', 'role', 'authenticated')::text, true);
SELECT pg_temp._probe_cnt('HOI_DONG+TO_TRUONG_CSSD', 0, 0, 0, 0, 0, 0);
INSERT INTO _probe SELECT 'HOI_DONG+TO_TRUONG_CSSD', 'co_quyen_view_nkbv', (SELECT public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'))::int, 1;

RESET ROLE;
SELECT vai, bang, thay, ky_vong, CASE WHEN thay = ky_vong THEN 'OK' ELSE 'LECH' END AS kq FROM _probe;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM _probe WHERE thay <> ky_vong;
  IF n > 0 THEN RAISE EXCEPTION 'PROBE: % dòng LECH (xem bảng kết quả phía trên)', n; END IF;
END $$;
ROLLBACK;
