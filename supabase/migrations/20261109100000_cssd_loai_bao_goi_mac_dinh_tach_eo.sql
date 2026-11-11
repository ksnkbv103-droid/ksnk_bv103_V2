-- CSSD: bao gói mặc định theo loại dụng cụ + hạn theo thời gian (PO 2026-11-09) + tách bộ nhóm EO.
-- Hạn: vải dệt 1 tháng · giấy/vải không dệt 3 tháng · hộp phin lọc 3 tháng · túi ép (EO/Plasma) 6 tháng
-- (QT.KSNK.22 mục "Giám sát hạn sử dụng"; giấy 3 tháng theo giáo trình, PO chốt).

BEGIN;

UPDATE public.cssd_dm_loai_bao_goi SET so_ngay_han_dung = 30,  ten = 'Vải dệt'                         WHERE ma = 'VAI';
UPDATE public.cssd_dm_loai_bao_goi SET so_ngay_han_dung = 90,  ten = 'Giấy / vải không dệt'            WHERE ma = 'GIAY';
UPDATE public.cssd_dm_loai_bao_goi SET so_ngay_han_dung = 90,  ten = 'Hộp kền có phin lọc'             WHERE ma = 'HOP';
UPDATE public.cssd_dm_loai_bao_goi SET so_ngay_han_dung = 180, ten = 'Túi ép (EO / Plasma, không cellulose)' WHERE ma = 'TUI_EP';

ALTER TABLE public.cssd_dm_loai_dung_cu
  ADD COLUMN IF NOT EXISTS loai_bao_goi_mac_dinh_id uuid REFERENCES public.cssd_dm_loai_bao_goi(id);
COMMENT ON COLUMN public.cssd_dm_loai_dung_cu.loai_bao_goi_mac_dinh_id IS
  'Bao gói mặc định của loại (quyết định hạn dùng). Hơi nước → giấy; Plasma/EO → túi ép. Bộ thừa hưởng khi mọi loại cùng bao gói.';

-- Mặc định theo phương pháp chỉ định (chỉ điền khi còn trống)
UPDATE public.cssd_dm_loai_dung_cu l
SET loai_bao_goi_mac_dinh_id = b.id
FROM public.cssd_dm_loai_bao_goi b
WHERE l.loai_bao_goi_mac_dinh_id IS NULL
  AND b.ma = CASE WHEN l.phuong_phap_tiet_khuan_chi_dinh IN ('PLASMA', 'EO') THEN 'TUI_EP' ELSE 'GIAY' END;

-- Bộ chưa gán: nhận bao gói khi mọi loại trong BOM cùng một bao gói mặc định
UPDATE public.cssd_dm_bo_dung_cu bo
SET loai_bao_goi_id = x.bg
FROM (
  SELECT ct.bo_dung_cu_id AS bo_id, (array_agg(DISTINCT l.loai_bao_goi_mac_dinh_id))[1] AS bg
  FROM public.cssd_dm_bo_dung_cu_chi_tiet ct
  JOIN public.cssd_dm_loai_dung_cu l ON l.id = ct.loai_dung_cu_id
  WHERE ct.is_active
  GROUP BY ct.bo_dung_cu_id
  HAVING count(DISTINCT l.loai_bao_goi_mac_dinh_id) = 1 AND bool_and(l.loai_bao_goi_mac_dinh_id IS NOT NULL)
) x
WHERE bo.id = x.bo_id AND bo.loai_bao_goi_id IS NULL AND bo.is_active;

-- Thành phần tách thêm vai trò EO (nhóm nhiệt thấp dùng EO, không chung mẻ Plasma)
ALTER TABLE public.cssd_dm_bo_dung_cu DROP CONSTRAINT IF EXISTS cssd_dm_bo_dung_cu_vai_tro_tach_check;
ALTER TABLE public.cssd_dm_bo_dung_cu ADD CONSTRAINT cssd_dm_bo_dung_cu_vai_tro_tach_check
  CHECK (vai_tro_tach IS NULL OR vai_tro_tach = ANY (ARRAY['CHIU_NHIET','KHONG_CHIU_NHIET','KHONG_CHIU_NHIET_EO']));

COMMIT;
