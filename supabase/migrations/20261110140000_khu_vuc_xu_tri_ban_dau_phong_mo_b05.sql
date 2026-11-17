-- Bổ sung sau 20261110130000 (PO 2026-11-10), trạng thái cuối đã chốt:
-- - Thêm KV_XU_TRI_BAN_DAU (phòng tiếp đón / xử trí ban đầu) cho A27, A05, B11; cả 3 khoa thay KV_CAP_CUU bằng khu này
--   (PO 2026-11-11: A05 có khu tiếp đón + phòng hồi sức cấp cứu = KV_HOI_SUC; B11 giống A27).
-- - B05 giữ 4 khu: Phòng mổ/can thiệp, Hồi tỉnh, Cách ly, Khu chung. Phòng mổ cấp cứu/phiên và áp lực dương/âm
--   là đặc điểm của phòng mổ, ghi ở vi_tri, KHÔNG phải khu vực.
-- Quy đổi dữ liệu chỉ cho A27/A05/B11. vi_tri/vi_tri_cu_the không bị sửa.
-- Hoàn tác: nạp lại bản sao pg_dump --data-only của 3 bảng fact + mdm_dm_khoa_phong trước khi chạy.

BEGIN;

INSERT INTO public.sys_lookup_value (category_type, code, name, is_active, metadata) VALUES
 ('KHU_VUC_GIAM_SAT','KV_XU_TRI_BAN_DAU','Phòng tiếp đón / xử trí ban đầu',true,'{"thu_tu":12,"muc_nguy_co":"CAO"}')
ON CONFLICT (category_type, code) DO UPDATE
  SET name=EXCLUDED.name, is_active=true, metadata=EXCLUDED.metadata, updated_at=now();

UPDATE public.mdm_dm_khoa_phong SET specs = jsonb_set(specs,'{allowed_khu_vucs}',
  (SELECT to_jsonb(array_agg(DISTINCT v ORDER BY v)) FROM (
     SELECT e AS v FROM jsonb_array_elements_text(specs->'allowed_khu_vucs') e
      WHERE e <> 'KV_CAP_CUU'
     UNION SELECT 'KV_XU_TRI_BAN_DAU') s))
 FROM (SELECT ma_khoa FROM public.mdm_dm_khoa_phong) k
 WHERE public.mdm_dm_khoa_phong.ma_khoa = k.ma_khoa AND k.ma_khoa IN ('A05','A27','B11');

CREATE FUNCTION pg_temp.fn_kv_new2(p_vitri text, p_old text, p_allowed text[]) RETURNS text
LANGUAGE sql IMMUTABLE AS $f$
  WITH t AS (SELECT lower(btrim(coalesce(p_vitri,''))) AS s),
  txt AS (
    SELECT CASE
      WHEN s ~ 'hồi tỉnh' THEN 'KV_HOI_TINH'
      WHEN s ~ 'hậu phẫu|sau mổ' THEN 'KV_HAU_PHAU'
      WHEN s ~ 'tiếp đón|xử trí' THEN 'KV_XU_TRI_BAN_DAU'
      WHEN s ~ 'hồi sức' THEN 'KV_HOI_SUC'
      WHEN s ~ 'phòng mổ|p\.\s*mổ|pmo|^pm\s*[0-9]*$' THEN 'KV_PHONG_MO'
      WHEN s ~ 'cấp cứu|^bcc|^cc\s*[0-9]' THEN 'KV_CAP_CUU'
      WHEN s ~ 'thủ thuật' THEN 'KV_THU_THUAT'
      WHEN s ~ 'cách ly|đa kháng' THEN 'KV_CACH_LY'
      WHEN s ~ 'điều trị|^pdt|buồng bệnh' THEN 'KV_BUONG_BENH'
    END AS kv FROM t),
  cand AS (
    SELECT c.kv, c.n FROM unnest(ARRAY[
      (SELECT kv FROM txt),
      CASE WHEN (SELECT kv FROM txt)='KV_CAP_CUU' THEN 'KV_XU_TRI_BAN_DAU' END,
      CASE WHEN (SELECT kv FROM txt)='KV_HOI_SUC' THEN 'KV_CAP_CUU' END,
      p_old,
      CASE WHEN p_old='KV_CAP_CUU' THEN 'KV_XU_TRI_BAN_DAU' END,
      'KV_BUONG_BENH','KV_CAN_LAM_SANG','KV_PHONG_MO','KV_CHUNG']) WITH ORDINALITY AS c(kv, n))
  SELECT kv FROM cand WHERE kv = ANY(p_allowed) ORDER BY n LIMIT 1
$f$;

CREATE TEMP TABLE _kv_ids ON COMMIT DROP AS
  SELECT id, code FROM public.sys_lookup_value WHERE category_type='KHU_VUC_GIAM_SAT';
CREATE TEMP TABLE _kv_allowed ON COMMIT DROP AS
  SELECT k.id AS khoa_id,
         ARRAY(SELECT jsonb_array_elements_text(k.specs->'allowed_khu_vucs')) AS allowed
    FROM public.mdm_dm_khoa_phong k WHERE k.ma_khoa IN ('A27','A05','B11');

UPDATE public.gstt_fact_vst_sessions t SET khu_vuc_id = d.id
  FROM _kv_ids o, _kv_allowed a, _kv_ids d
 WHERE o.id = t.khu_vuc_id AND a.khoa_id = t.khoa_id
   AND d.code = pg_temp.fn_kv_new2(t.vi_tri_cu_the, o.code, a.allowed) AND d.id <> t.khu_vuc_id;
UPDATE public.gstt_fact_chung_sessions t SET khu_vuc_id = d.id
  FROM _kv_ids o, _kv_allowed a, _kv_ids d
 WHERE o.id = t.khu_vuc_id AND a.khoa_id = t.khoa_id
   AND d.code = pg_temp.fn_kv_new2(t.vi_tri, o.code, a.allowed) AND d.id <> t.khu_vuc_id;
-- gstt_fact_vst: bỏ qua hàng cũ thiếu nghe_nghiep_id (trigger MDM chặn ghi)
UPDATE public.gstt_fact_vst t SET khu_vuc_id = d.id
  FROM _kv_ids o, _kv_allowed a, _kv_ids d
 WHERE t.nghe_nghiep_id IS NOT NULL AND o.id = t.khu_vuc_id AND a.khoa_id = t.khoa_id
   AND d.code = pg_temp.fn_kv_new2(t.vi_tri, o.code, a.allowed) AND d.id <> t.khu_vuc_id;

COMMIT;
