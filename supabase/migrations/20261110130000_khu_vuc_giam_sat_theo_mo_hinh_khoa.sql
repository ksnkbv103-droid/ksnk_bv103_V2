-- Khu vực giám sát theo mô hình khoa (PO 2026-11-10), thay cách gán khoa->khu vực của 20261110115000 (đổi số từ 20261110110000 khi gộp, trùng với cssd_incident_void_atomic).
-- Không sửa migration cũ; migration này: thêm KV_HOI_TINH, KV_HAU_PHAU; gán lại allowed_khu_vucs;
-- quy đổi khu_vuc_id của 3 bảng fact theo vi_tri (bằng chứng) rồi theo khoa. vi_tri/vi_tri_cu_the KHÔNG bị sửa.
-- Hoàn tác: nạp lại bản sao dữ liệu 3 bảng fact + mdm_dm_khoa_phong trước khi chạy (pg_dump --data-only).

BEGIN;

-- 1. Danh mục khu vực: 11 khu vực
INSERT INTO public.sys_lookup_value (category_type, code, name, is_active, metadata) VALUES
 ('KHU_VUC_GIAM_SAT','KV_PHONG_MO','Phòng mổ / can thiệp',true,'{"thu_tu":1,"muc_nguy_co":"RAT_CAO"}'),
 ('KHU_VUC_GIAM_SAT','KV_HOI_TINH','Phòng hồi tỉnh',true,'{"thu_tu":2,"muc_nguy_co":"RAT_CAO"}'),
 ('KHU_VUC_GIAM_SAT','KV_HOI_SUC','Hồi sức / ICU / NB suy giảm miễn dịch',true,'{"thu_tu":3,"muc_nguy_co":"RAT_CAO"}'),
 ('KHU_VUC_GIAM_SAT','KV_HAU_PHAU','Phòng theo dõi sau mổ',true,'{"thu_tu":4,"muc_nguy_co":"CAO"}'),
 ('KHU_VUC_GIAM_SAT','KV_CAP_CUU','Phòng cấp cứu / điều trị NB nặng',true,'{"thu_tu":5,"muc_nguy_co":"CAO"}'),
 ('KHU_VUC_GIAM_SAT','KV_THU_THUAT','Phòng thủ thuật / pha chế / lọc máu',true,'{"thu_tu":6,"muc_nguy_co":"CAO"}'),
 ('KHU_VUC_GIAM_SAT','KV_CACH_LY','Cách ly / NB đa kháng',true,'{"thu_tu":7,"muc_nguy_co":"CAO"}'),
 ('KHU_VUC_GIAM_SAT','KV_BUONG_BENH','Buồng bệnh nội trú',true,'{"thu_tu":8,"muc_nguy_co":"TRUNG_BINH"}'),
 ('KHU_VUC_GIAM_SAT','KV_CAN_LAM_SANG','Phòng khám / cận lâm sàng',true,'{"thu_tu":9,"muc_nguy_co":"TRUNG_BINH"}'),
 ('KHU_VUC_GIAM_SAT','KV_CSSD','Trung tâm tiệt khuẩn (khoa KSNK, module CSSD)',true,'{"thu_tu":10,"muc_nguy_co":"RAT_CAO","module":"CSSD"}'),
 ('KHU_VUC_GIAM_SAT','KV_CHUNG','Khu chung (hành chính, sảnh, WC, chất thải)',true,'{"thu_tu":11,"muc_nguy_co":"THAP","is_common":true}')
ON CONFLICT (category_type, code) DO UPDATE
  SET name=EXCLUDED.name, is_active=true, metadata=EXCLUDED.metadata, updated_at=now();

-- 2. Khoa -> khu vực
CREATE TEMP TABLE _kv_khoa (kv text, ma_khoa text) ON COMMIT DROP;
-- Khoa nội/ngoại có giường (A, B trừ B05): 4 khu vực nền
INSERT INTO _kv_khoa
SELECT z.kv, k.ma_khoa
  FROM public.mdm_dm_khoa_phong k
 CROSS JOIN (VALUES ('KV_BUONG_BENH'),('KV_THU_THUAT'),('KV_CAP_CUU'),('KV_CACH_LY')) z(kv)
 WHERE k.ma_khoa ~ '^[AB][0-9]{2}$' AND k.ma_khoa <> 'B05';
INSERT INTO _kv_khoa
SELECT 'KV_HOI_SUC', x FROM unnest(ARRAY['A05','A27','B11','B21']) x
UNION ALL SELECT 'KV_HAU_PHAU', x FROM unnest(ARRAY['B01','B02','B04','B06','B07','B08','B09','B10','B12','B17','B18','B19','B20']) x
UNION ALL SELECT 'KV_PHONG_MO', x FROM unnest(ARRAY['B05','C11','PM1','PM2','PM3']) x
UNION ALL SELECT 'KV_HOI_TINH', x FROM unnest(ARRAY['B05','C11']) x
UNION ALL SELECT 'KV_CACH_LY', x FROM unnest(ARRAY['B05','C11','C01','C02','C04','C06','C07','C09','C10','C10-XQ','C12','C14']) x
UNION ALL SELECT 'KV_CAN_LAM_SANG', x FROM unnest(ARRAY['C01','C02','C04','C06','C07','C09','C10','C10-XQ','C11','C12','C14']) x
UNION ALL SELECT 'KV_THU_THUAT', 'C05'
UNION ALL SELECT 'KV_CSSD', 'C18';

UPDATE public.mdm_dm_khoa_phong k
   SET specs = jsonb_set(
     COALESCE(k.specs,'{}'::jsonb), '{allowed_khu_vucs}',
     (SELECT to_jsonb(COALESCE(array_agg(DISTINCT v ORDER BY v), ARRAY[]::text[]))
        FROM (SELECT kv AS v FROM _kv_khoa WHERE ma_khoa=k.ma_khoa
              UNION SELECT 'KV_CHUNG') s));

-- 3. Quy đổi dữ liệu: (a) chữ ở vi_tri nếu hợp lệ với khoa; (b) giữ nguyên nếu khu vực cũ hợp lệ; (c) lùi về buồng bệnh / cận lâm sàng / chung
CREATE FUNCTION pg_temp.fn_kv_new(p_vitri text, p_old text, p_allowed text[]) RETURNS text
LANGUAGE sql IMMUTABLE AS $f$
  WITH t AS (SELECT lower(btrim(coalesce(p_vitri,''))) AS s),
  txt AS (
    SELECT CASE
      WHEN s ~ 'hồi tỉnh' THEN 'KV_HOI_TINH'
      WHEN s ~ 'hậu phẫu|sau mổ' THEN 'KV_HAU_PHAU'
      WHEN s ~ 'hồi sức' THEN 'KV_HOI_SUC'
      WHEN s ~ 'phòng mổ|p\.\s*mổ|pmo|^pm\s*[0-9]*$' THEN 'KV_PHONG_MO'
      WHEN s ~ 'cấp cứu|^bcc|^cc\s*[0-9]' THEN 'KV_CAP_CUU'
      WHEN s ~ 'thủ thuật' THEN 'KV_THU_THUAT'
      WHEN s ~ 'cách ly|đa kháng' THEN 'KV_CACH_LY'
      WHEN s ~ 'điều trị|^pdt|buồng bệnh' THEN 'KV_BUONG_BENH'
    END AS kv FROM t)
  SELECT COALESCE(
    CASE WHEN (SELECT kv FROM txt) = ANY(p_allowed) THEN (SELECT kv FROM txt) END,
    -- "Phòng hồi sức" ở khoa không có hồi sức = phòng điều trị NB nặng
    CASE WHEN (SELECT kv FROM txt) = 'KV_HOI_SUC' AND 'KV_CAP_CUU' = ANY(p_allowed) THEN 'KV_CAP_CUU' END,
    CASE WHEN p_old = ANY(p_allowed) THEN p_old END,
    CASE WHEN 'KV_BUONG_BENH' = ANY(p_allowed) THEN 'KV_BUONG_BENH' END,
    CASE WHEN 'KV_CAN_LAM_SANG' = ANY(p_allowed) THEN 'KV_CAN_LAM_SANG' END,
    CASE WHEN 'KV_PHONG_MO' = ANY(p_allowed) THEN 'KV_PHONG_MO' END,
    'KV_CHUNG')
$f$;

CREATE TEMP TABLE _kv_ids ON COMMIT DROP AS
  SELECT id, code FROM public.sys_lookup_value WHERE category_type='KHU_VUC_GIAM_SAT';
CREATE TEMP TABLE _kv_allowed ON COMMIT DROP AS
  SELECT k.id AS khoa_id,
         ARRAY(SELECT jsonb_array_elements_text(k.specs->'allowed_khu_vucs')) AS allowed
    FROM public.mdm_dm_khoa_phong k;

UPDATE public.gstt_fact_vst_sessions t SET khu_vuc_id = d.id
  FROM _kv_ids o, _kv_allowed a, _kv_ids d
 WHERE o.id = t.khu_vuc_id AND a.khoa_id = t.khoa_id
   AND d.code = pg_temp.fn_kv_new(t.vi_tri_cu_the, o.code, a.allowed) AND d.id <> t.khu_vuc_id;
UPDATE public.gstt_fact_chung_sessions t SET khu_vuc_id = d.id
  FROM _kv_ids o, _kv_allowed a, _kv_ids d
 WHERE o.id = t.khu_vuc_id AND a.khoa_id = t.khoa_id
   AND d.code = pg_temp.fn_kv_new(t.vi_tri, o.code, a.allowed) AND d.id <> t.khu_vuc_id;
-- gstt_fact_vst: bỏ qua hàng cũ thiếu nghe_nghiep_id (trigger MDM chặn ghi; không tự điền nghề nghiệp)
UPDATE public.gstt_fact_vst t SET khu_vuc_id = d.id
  FROM _kv_ids o, _kv_allowed a, _kv_ids d
 WHERE t.nghe_nghiep_id IS NOT NULL AND o.id = t.khu_vuc_id AND a.khoa_id = t.khoa_id
   AND d.code = pg_temp.fn_kv_new(t.vi_tri, o.code, a.allowed) AND d.id <> t.khu_vuc_id;

COMMIT;
