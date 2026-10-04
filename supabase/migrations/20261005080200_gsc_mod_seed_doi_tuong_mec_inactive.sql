-- Soft local MOD-GSC — GSC-02/03/04 data (FILE ONLY, chưa apply).
-- Idempotent: upsert meta theo ma_bk; KHÔNG ghi đè tieu_chi_jsonb nếu đã seed-25d (tránh orphan mới).
-- Inactive short; tạo lại nhật ký MEC mã NK.QT.19.MEC; soft-delete 3 TC rác BM.19.01.

BEGIN;

-- GSC-04: sửa doi_tuong theo chủ đề (prod 65 KSNK.* đang NHAN_VIEN).
UPDATE public.gstt_dm_bang_kiem
SET doi_tuong_giam_sat = 'NGUOI_BENH',
    updated_at = now()
WHERE is_active = true
  AND ma_bk ~ '^(KSNK\.QT\.(29|30|31|32)|BM\.(24|25|26|27))'
  AND doi_tuong_giam_sat IS DISTINCT FROM 'NGUOI_BENH';

UPDATE public.gstt_dm_bang_kiem
SET doi_tuong_giam_sat = 'MOI_TRUONG',
    updated_at = now()
WHERE is_active = true
  AND (
    ma_bk ~ '^(KSNK\.QT\.(11|13)|BM\.(11|13))'
    OR ten_bang_kiem ~* 'VSMT|vệ sinh môi trường|đồ vải'
  )
  AND doi_tuong_giam_sat IS DISTINCT FROM 'MOI_TRUONG';

UPDATE public.gstt_dm_bang_kiem
SET doi_tuong_giam_sat = 'ME_TIET_KHUAN',
    updated_at = now()
WHERE is_active = true
  AND (
    ten_bang_kiem ~* 'mẻ|tiệt khuẩn|BI'
    OR ma_bk ~ '^(KSNK\.QT\.(21|23)|BM\.22)'
  )
  AND doi_tuong_giam_sat IS DISTINCT FROM 'ME_TIET_KHUAN';

UPDATE public.gstt_dm_bang_kiem
SET doi_tuong_giam_sat = 'THIET_BI',
    updated_at = now()
WHERE is_active = true
  AND doi_tuong_giam_sat = 'NHAN_VIEN'
  AND (
    ma_bk ~ '^(KSNK\.QT\.(19|20|22|24|25|26|27|28)|BM\.(19|20|21))'
    OR ten_bang_kiem ~* 'CSSD|dụng cụ|đóng gói|KKMĐC|thiết bị'
  );

-- GSC-04 pham_vi: THEO_KHOI/THEO_KHOA ids rỗng → CA_VIEN + giữ seed_meta.
UPDATE public.gstt_dm_bang_kiem
SET ap_dung_jsonb = jsonb_set(
  COALESCE(ap_dung_jsonb, '{}'::jsonb),
  '{pham_vi}',
  '"CA_VIEN"'
),
updated_at = now()
WHERE COALESCE(ap_dung_jsonb->>'pham_vi', '') IN ('THEO_KHOI', 'THEO_KHOA')
  AND jsonb_array_length(COALESCE(ap_dung_jsonb->'khoi_ids', '[]'::jsonb)) = 0
  AND jsonb_array_length(COALESCE(ap_dung_jsonb->'khoa_ids', '[]'::jsonb)) = 0;

-- GSC-03: soft-delete 3 TC rác «LÀM KHÔ VÀ LƯU GIỮ» stt null trên BM.19.01 (mẫu cũ).
UPDATE public.gstt_dm_bang_kiem
SET tieu_chi_jsonb = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN coalesce(elem->>'noi_dung','') = 'LÀM KHÔ VÀ LƯU GIỮ'
           AND (elem->>'stt' IS NULL OR elem->>'stt' = '')
        THEN elem || jsonb_build_object('is_active', false)
      ELSE elem
    END
  ), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(tieu_chi_jsonb, '[]'::jsonb)) AS elem
),
updated_at = now()
WHERE ma_bk = 'BM.19.01';

-- GSC-02: inactive short còn active (giữ id cho phiên cũ). Không đụng nhật ký AIIR/BSC.
UPDATE public.gstt_dm_bang_kiem bk
SET is_active = false,
    updated_at = now()
WHERE bk.is_active = true
  AND bk.ma_bk IN (SELECT ma_bk_short FROM public.gstt_map_bang_kiem_short_long)
  AND EXISTS (
    SELECT 1 FROM public.gstt_dm_bang_kiem long
    WHERE long.ma_bk = (
      SELECT m.ma_bk_long FROM public.gstt_map_bang_kiem_short_long m WHERE m.ma_bk_short = bk.ma_bk
    )
  );

-- OUT SUDs
UPDATE public.gstt_dm_bang_kiem
SET is_active = false, updated_at = now()
WHERE ma_bk = 'BM.QĐ.19.03' AND is_active = true;

-- GSC-04: tạo lại nhật ký MEC — mã NK.* (không trùng KSNK.QT.*.BM.*).
INSERT INTO public.gstt_dm_bang_kiem (
  id, ma_bk, ten_bang_kiem, mo_ta, is_active, is_system,
  loai_hinh_giam_sat, tieu_chi_jsonb, loai_giam_sat, doi_tuong_giam_sat,
  cach_tinh_diem, phien_ban, ap_dung_jsonb
)
SELECT
  'a19e0c01-0000-4000-8000-000000000019'::uuid,
  'NK.QT.19.MEC',
  'Nhật ký theo dõi hóa chất KKMĐC (MEC)',
  'GSC-04 recreate — NHAT_KY_VAN_HANH, ngoài % tuân thủ',
  true,
  true,
  'TRUC_TIEP',
  '[
    {"id":"a19e0c01-0001-4000-8000-000000000001","stt":1,"ma_tc":"MEC01","noi_dung":"Nồng độ MEC / hóa chất (số liệu)","kieu_du_lieu":"SO_LIEU","is_active":true,"cho_phep_kpa":true,"la_then_chot":false},
    {"id":"a19e0c01-0002-4000-8000-000000000002","stt":2,"ma_tc":"MEC02","noi_dung":"Nhiệt độ dung dịch (°C)","kieu_du_lieu":"SO_LIEU","is_active":true,"cho_phep_kpa":true,"la_then_chot":false},
    {"id":"a19e0c01-0003-4000-8000-000000000003","stt":3,"ma_tc":"MEC03","noi_dung":"Thời gian ngâm (phút)","kieu_du_lieu":"SO_LIEU","is_active":true,"cho_phep_kpa":true,"la_then_chot":false},
    {"id":"a19e0c01-0004-4000-8000-000000000004","stt":4,"ma_tc":"MEC04","noi_dung":"Ghi chú / lựa chọn trạng thái","kieu_du_lieu":"LUA_CHON","is_active":true,"cho_phep_kpa":true,"la_then_chot":false,"cac_lua_chon":["DAT","KHONG_DAT","KHONG_AP_DUNG"]}
  ]'::jsonb,
  'NHAT_KY_VAN_HANH',
  'THIET_BI',
  'NHAT_KY',
  'gsc-04-mec-20261005',
  jsonb_build_object(
    'pham_vi', 'CA_VIEN',
    'khoi_ids', '[]'::jsonb,
    'khoa_ids', '[]'::jsonb,
    'muc_do', 'KHUYEN_NGH',
    'seed_meta', jsonb_build_object(
      'lop_giam_sat', null,
      'ho_form', 'NK',
      'source', 'gsc-04-mec-recreate',
      'seed_date', '2026-10-05'
    )
  )
WHERE NOT EXISTS (
  SELECT 1 FROM public.gstt_dm_bang_kiem WHERE ma_bk = 'NK.QT.19.MEC'
);

-- GSC-02 note: nạp đủ 65 BK KSNK.* từ bang-kiem-seed dùng SCR DRY_RUN / APPLY local
-- hoặc generator — migration này KHÔNG nhúng 65 JSON (tránh ghi đè UUID prod).
-- Repo/DB mới: chạy SCR upsert theo ma_bk dài (đã bỏ rename short).

COMMENT ON TABLE public.gstt_map_bang_kiem_short_long IS
  'GSC-02/VST-04: gộp short↔dài khi thống kê; inactive short khi APPLY migration này.';

COMMIT;
