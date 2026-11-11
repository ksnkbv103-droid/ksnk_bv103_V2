-- Chuẩn hóa khu vực giám sát: 22 mã -> 9 khu vực (PO 2026-11-10).
-- Nguồn: kho tri thức M01 khu_vuc_quan_sat (QT06 §II.1) + PL thống kê §4.2 (muc_nguy_co_khu_vuc).
-- - Phiên cũ giữ nguyên: khu_vuc_id được trỏ sang khu vực gộp (không xóa dữ liệu).
-- - Mã cũ bị gộp: is_active=false (không DROP).
-- - KV_CSSD tách khỏi giám sát chung: không khoa nào được gán cho tới khi module CSSD dùng.
-- - NN_CONG_VU gộp vào NN_VE_SINH (Hộ lý / NV vệ sinh).
-- - specs.allowed_khu_vucs: chỉ khu vực tương ứng của khoa (+ KV_CHUNG luôn hiện qua is_common).

BEGIN;

-- 1. Bảng ánh xạ cũ -> mới
CREATE TEMP TABLE _kv_map (old_code text PRIMARY KEY, new_code text NOT NULL) ON COMMIT DROP;
INSERT INTO _kv_map VALUES
  ('KV_PHONG_MO','KV_PHONG_MO'), ('KV_CAN_THIEP','KV_PHONG_MO'), ('KV_PHONG_SINH','KV_PHONG_MO'),
  ('KV_THU_THUAT_SACH','KV_THU_THUAT'), ('KV_PHA_CHE','KV_THU_THUAT'), ('KV_LOC_MAU','KV_THU_THUAT'),
  ('KV_ICU_CHUNG','KV_HOI_SUC'), ('KV_ICU_SACH','KV_HOI_SUC'), ('KV_NB_MIEN_DICH','KV_HOI_SUC'),
  ('KV_CACH_LY','KV_CACH_LY'), ('KV_DA_KHANG','KV_CACH_LY'),
  ('KV_CAP_CUU','KV_CAP_CUU'),
  ('KV_NOI_TRU','KV_BUONG_BENH'),
  ('KV_CDHA','KV_CAN_LAM_SANG'), ('KV_XET_NGHIEM','KV_CAN_LAM_SANG'),
  ('KV_CSSD_SACH','KV_CSSD'), ('KV_CSSD_BAN','KV_CSSD'),
  ('KV_HANH_CHINH','KV_CHUNG'), ('KV_SANH_CHO','KV_CHUNG'), ('KV_CHAT_THAI','KV_CHUNG'),
  ('KV_VS_KHOA','KV_CHUNG'), ('KV_VS_NGUY_CO_CAO','KV_CHUNG');

-- 2. Hàng đại diện: đổi mã/tên (giữ id) cho 9 khu vực chuẩn
UPDATE public.sys_lookup_value SET code='KV_THU_THUAT'    WHERE category_type='KHU_VUC_GIAM_SAT' AND code='KV_THU_THUAT_SACH';
UPDATE public.sys_lookup_value SET code='KV_HOI_SUC'      WHERE category_type='KHU_VUC_GIAM_SAT' AND code='KV_ICU_CHUNG';
UPDATE public.sys_lookup_value SET code='KV_BUONG_BENH'   WHERE category_type='KHU_VUC_GIAM_SAT' AND code='KV_NOI_TRU';
UPDATE public.sys_lookup_value SET code='KV_CAN_LAM_SANG' WHERE category_type='KHU_VUC_GIAM_SAT' AND code='KV_CDHA';
UPDATE public.sys_lookup_value SET code='KV_CSSD'         WHERE category_type='KHU_VUC_GIAM_SAT' AND code='KV_CSSD_SACH';
UPDATE public.sys_lookup_value SET code='KV_CHUNG'        WHERE category_type='KHU_VUC_GIAM_SAT' AND code='KV_HANH_CHINH';

-- map đã đổi mã đại diện: cập nhật old_code của các hàng đại diện sang mã mới để join đúng id
UPDATE _kv_map SET old_code = new_code WHERE old_code IN
  ('KV_THU_THUAT_SACH','KV_ICU_CHUNG','KV_NOI_TRU','KV_CDHA','KV_CSSD_SACH','KV_HANH_CHINH');

-- Các hàng gộp (mã cũ còn nguyên) cần id đích: dựng lại bảng id
CREATE TEMP TABLE _kv_ids ON COMMIT DROP AS
  SELECT id, code FROM public.sys_lookup_value WHERE category_type='KHU_VUC_GIAM_SAT';

-- 3. Chuyển tham chiếu phiên sang khu vực đích (3 bảng fact)
UPDATE public.gstt_fact_vst_sessions t SET khu_vuc_id = d.id
  FROM _kv_ids o JOIN _kv_map m ON m.old_code=o.code JOIN _kv_ids d ON d.code=m.new_code
 WHERE t.khu_vuc_id=o.id AND o.id<>d.id;
UPDATE public.gstt_fact_chung_sessions t SET khu_vuc_id = d.id
  FROM _kv_ids o JOIN _kv_map m ON m.old_code=o.code JOIN _kv_ids d ON d.code=m.new_code
 WHERE t.khu_vuc_id=o.id AND o.id<>d.id;
UPDATE public.gstt_fact_vst t SET khu_vuc_id = d.id
  FROM _kv_ids o JOIN _kv_map m ON m.old_code=o.code JOIN _kv_ids d ON d.code=m.new_code
 WHERE t.khu_vuc_id=o.id AND o.id<>d.id;

-- 4. Vô hiệu mã đã gộp (không phải 9 mã chuẩn)
UPDATE public.sys_lookup_value SET is_active=false, updated_at=now()
 WHERE category_type='KHU_VUC_GIAM_SAT'
   AND code NOT IN ('KV_PHONG_MO','KV_THU_THUAT','KV_HOI_SUC','KV_CACH_LY','KV_CAP_CUU',
                    'KV_BUONG_BENH','KV_CAN_LAM_SANG','KV_CSSD','KV_CHUNG');

-- 5. Tên + metadata 9 khu vực (mức nguy cơ theo kho tri thức, ngưỡng chưa chốt)
INSERT INTO public.sys_lookup_value (category_type, code, name, is_active, metadata) VALUES
 ('KHU_VUC_GIAM_SAT','KV_PHONG_MO','Phòng mổ / can thiệp / phòng sinh',true,'{"thu_tu":1,"muc_nguy_co":"RAT_CAO"}'),
 ('KHU_VUC_GIAM_SAT','KV_THU_THUAT','Phòng thủ thuật / pha chế / lọc máu',true,'{"thu_tu":2,"muc_nguy_co":"CAO"}'),
 ('KHU_VUC_GIAM_SAT','KV_HOI_SUC','Hồi sức / ICU / NB suy giảm miễn dịch',true,'{"thu_tu":3,"muc_nguy_co":"RAT_CAO"}'),
 ('KHU_VUC_GIAM_SAT','KV_CACH_LY','Cách ly / NB đa kháng',true,'{"thu_tu":4,"muc_nguy_co":"CAO"}'),
 ('KHU_VUC_GIAM_SAT','KV_CAP_CUU','Khu cấp cứu',true,'{"thu_tu":5,"muc_nguy_co":"CAO"}'),
 ('KHU_VUC_GIAM_SAT','KV_BUONG_BENH','Buồng bệnh nội trú',true,'{"thu_tu":6,"muc_nguy_co":"TRUNG_BINH"}'),
 ('KHU_VUC_GIAM_SAT','KV_CAN_LAM_SANG','Phòng khám / cận lâm sàng',true,'{"thu_tu":7,"muc_nguy_co":"TRUNG_BINH"}'),
 ('KHU_VUC_GIAM_SAT','KV_CSSD','Trung tâm tiệt khuẩn (module CSSD)',true,'{"thu_tu":8,"muc_nguy_co":"RAT_CAO","module":"CSSD"}'),
 ('KHU_VUC_GIAM_SAT','KV_CHUNG','Khu chung (hành chính, sảnh, WC, chất thải)',true,'{"thu_tu":9,"muc_nguy_co":"THAP","is_common":true}')
ON CONFLICT (category_type, code) DO UPDATE
  SET name=EXCLUDED.name, is_active=true, metadata=EXCLUDED.metadata, updated_at=now();

-- 6. Khoa -> khu vực tương ứng (theo ma_khoa; KV_CHUNG cho mọi khoa; KV_CSSD không gán)
CREATE TEMP TABLE _kv_khoa (kv text, ma_khoa text) ON COMMIT DROP;
INSERT INTO _kv_khoa
SELECT 'KV_PHONG_MO', x FROM unnest(ARRAY['B01','B02','B04','B05','B06','B07','B08','B09','B10','B12','B17','B18','B19','B20','PM1','PM2','PM3','A16','C11']) x
UNION ALL SELECT 'KV_THU_THUAT', x FROM unnest(ARRAY['A01','A03','A12','A20','B05','B14','B19','C05','A16','C11']) x
UNION ALL SELECT 'KV_HOI_SUC', x FROM unnest(ARRAY['A27','B11','B21','B05']) x
UNION ALL SELECT 'KV_CACH_LY', x FROM unnest(ARRAY['A03','A05','A17']) x
UNION ALL SELECT 'KV_CAP_CUU', x FROM unnest(ARRAY['B15','B16']) x
UNION ALL SELECT 'KV_CAN_LAM_SANG', x FROM unnest(ARRAY['C01','C02','C04','C06','C07','C09','C10','C10-XQ','C12','C14','C11']) x;
INSERT INTO _kv_khoa
SELECT 'KV_BUONG_BENH', ma_khoa FROM public.mdm_dm_khoa_phong
 WHERE ma_khoa ~ '^[AB][0-9]{2}$' AND ma_khoa NOT IN ('B05');

UPDATE public.mdm_dm_khoa_phong k
   SET specs = jsonb_set(
     COALESCE(k.specs,'{}'::jsonb), '{allowed_khu_vucs}',
     (SELECT to_jsonb(COALESCE(array_agg(DISTINCT v ORDER BY v), ARRAY[]::text[]))
        FROM (SELECT kv AS v FROM _kv_khoa WHERE ma_khoa=k.ma_khoa
              UNION SELECT 'KV_CHUNG') s));

-- 7. Nhóm nghề: Công vụ -> Hộ lý / NV vệ sinh
UPDATE public.mdm_nhan_su n SET nghe_nghiep_id=(SELECT id FROM public.sys_lookup_value WHERE category_type='NGHE_NGHIEP' AND code='NN_VE_SINH')
 WHERE n.nghe_nghiep_id=(SELECT id FROM public.sys_lookup_value WHERE category_type='NGHE_NGHIEP' AND code='NN_CONG_VU');
UPDATE public.gstt_fact_chung_sessions n SET nghe_nghiep_id=(SELECT id FROM public.sys_lookup_value WHERE category_type='NGHE_NGHIEP' AND code='NN_VE_SINH')
 WHERE n.nghe_nghiep_id=(SELECT id FROM public.sys_lookup_value WHERE category_type='NGHE_NGHIEP' AND code='NN_CONG_VU');
UPDATE public.gstt_fact_vst n SET nghe_nghiep_id=(SELECT id FROM public.sys_lookup_value WHERE category_type='NGHE_NGHIEP' AND code='NN_VE_SINH')
 WHERE n.nghe_nghiep_id=(SELECT id FROM public.sys_lookup_value WHERE category_type='NGHE_NGHIEP' AND code='NN_CONG_VU');
UPDATE public.sys_lookup_value SET name='Hộ lý / Nhân viên vệ sinh', updated_at=now()
 WHERE category_type='NGHE_NGHIEP' AND code='NN_VE_SINH';
UPDATE public.sys_lookup_value SET is_active=false, updated_at=now()
 WHERE category_type='NGHE_NGHIEP' AND code='NN_CONG_VU';

COMMIT;
