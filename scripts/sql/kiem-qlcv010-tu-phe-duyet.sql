-- QLCV-010 kiểm trên DB local (rollback): kỳ vọng ERROR «Không được tự phê duyệt đề xuất của mình».
-- Chạy: docker exec -i supabase_db_ksnk_bv103 psql -U postgres -At < scripts/sql/kiem-qlcv010-tu-phe-duyet.sql
\set ON_ERROR_STOP 0
BEGIN;
-- người không ADMIN, có quyền
WITH a AS (select ns.id from mdm_nhan_su ns join v_sys_user_permissions v on v.auth_user_id=ns.auth_user_id where not (v.roles ? 'ADMIN') and ns.is_active limit 1)
INSERT INTO qlcv_fact_cong_viec (tieu_de, is_active, trang_thai, nguoi_tao_id, loai_cong_viec)
SELECT 'repro qlcv010', false, 'MOI', a.id, 'DOT_XUAT' FROM a RETURNING id, nguoi_tao_id \gset
SELECT public.fn_qlcv_transition(:'id', 'PHE_DUYET_DEXUAT', :'nguoi_tao_id', NULL, '{}'::jsonb) AS ket_qua;
ROLLBACK;
-- Ca NULL/NULL (review 2026-11-13): người tạo và người duyệt đều chưa gắn hồ sơ NV → KHÔNG coi là tự duyệt; kỳ vọng thành công.
BEGIN;
INSERT INTO qlcv_fact_cong_viec (tieu_de, is_active, trang_thai, nguoi_tao_id, loai_cong_viec)
VALUES ('repro qlcv010 null', false, 'MOI', NULL, 'DOT_XUAT') RETURNING id AS id_null \gset
SELECT 'NULL_NULL_OK' AS ket_qua, public.fn_qlcv_transition(:'id_null', 'PHE_DUYET_DEXUAT', NULL, NULL, '{}'::jsonb) IS NOT NULL;
ROLLBACK;
