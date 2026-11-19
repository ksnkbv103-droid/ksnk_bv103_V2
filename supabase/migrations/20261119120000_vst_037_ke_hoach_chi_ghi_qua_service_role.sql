-- ADR: docs/adr/20261119-vst-037-ke-hoach-chi-ghi-qua-service-role.md
-- VST-037: gstt_fact_ke_hoach_giam_sat chỉ ghi qua service_role (action setKeHoachKhoa đã kiểm vai + ghi nhật ký).
-- Bỏ quyền ghi trực tiếp của authenticated: policy INSERT/UPDATE (20261118110000) cho mọi nhân sự khoa KSNK ghi
-- qua PostgREST, không xét vai và không khóa nguoi_lap_id. SELECT giữ nguyên (đọc theo khoa/quyền).
-- Hoàn tác: CREATE POLICY gstt_ke_hoach_insert/update lại như 20261118110000:89-123 + GRANT INSERT, UPDATE ... TO authenticated.

DROP POLICY IF EXISTS gstt_ke_hoach_insert ON public.gstt_fact_ke_hoach_giam_sat;
DROP POLICY IF EXISTS gstt_ke_hoach_update ON public.gstt_fact_ke_hoach_giam_sat;

REVOKE INSERT, UPDATE ON public.gstt_fact_ke_hoach_giam_sat FROM authenticated;
