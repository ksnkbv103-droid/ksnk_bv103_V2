-- Supabase Migration: 20260525000008_cssd_realtime_inventory_views.sql
-- Description: Real-time inventory calculation (ledger based) for physical instruments and set components, heat-resistance checker.

BEGIN;

-- 1. View tính toán số dư thực tế trong Kho Dự Phòng Lẻ (bo_dung_cu_id IS NULL)
CREATE OR REPLACE VIEW public.v_cssd_kho_le_realtime_qty AS
SELECT 
    l.id AS loai_dung_cu_id,
    l.ma_loai,
    l.ten_loai,
    l.is_chiu_nhiet,
    l.phan_loai_spaulding,
    l.phuong_phap_tiet_khuan_chi_dinh AS phuong_phap_tiet_khuan,
    (COALESCE(l.so_luong_kho_du_phong, 0) + COALESCE(SUM(tx.so_luong_thay_doi), 0))::integer AS so_luong_thuc_te
FROM public.cssd_dm_loai_dung_cu l
LEFT JOIN public.cssd_fact_kho_giao_dich tx 
    ON tx.loai_dung_cu_id = l.id 
    AND tx.bo_dung_cu_id IS NULL 
    AND tx.is_active = true
GROUP BY l.id;

-- 2. View tính toán biến động tích lũy của từng loại dụng cụ trong từng bộ dụng cụ
CREATE OR REPLACE VIEW public.v_cssd_bo_dung_cu_bien_dong AS
SELECT 
    bo_dung_cu_id,
    loai_dung_cu_id,
    COALESCE(SUM(so_luong_thay_doi), 0)::integer AS so_luong_bien_dong
FROM public.cssd_fact_kho_giao_dich
WHERE is_active = true 
  AND bo_dung_cu_id IS NOT NULL
GROUP BY bo_dung_cu_id, loai_dung_cu_id;

-- 3. View chi tiết cấu thành bộ dụng cụ kèm số lượng tiêu chuẩn và số lượng thực tế thời gian thực (Real-time BOM)
CREATE OR REPLACE VIEW public.v_cssd_bo_dung_cu_chi_tiet_realtime AS
SELECT 
    c.id AS chi_tiet_id,
    c.bo_dung_cu_id,
    b.ma_bo,
    b.ten_bo,
    c.loai_dung_cu_id,
    l.ma_loai AS ma_loai_dung_cu,
    l.ten_loai AS ten_loai_dung_cu,
    l.is_chiu_nhiet,
    l.phan_loai_spaulding,
    l.phuong_phap_tiet_khuan_chi_dinh AS phuong_phap_tiet_khuan,
    c.so_luong AS so_luong_tieu_chuan,
    (c.so_luong + COALESCE(v.so_luong_bien_dong, 0))::integer AS so_luong_thuc_te,
    CASE 
        WHEN (c.so_luong + COALESCE(v.so_luong_bien_dong, 0)) < c.so_luong THEN true 
        ELSE false 
    END AS is_missing,
    CASE 
        WHEN (c.so_luong + COALESCE(v.so_luong_bien_dong, 0)) < c.so_luong 
        THEN (c.so_luong - (c.so_luong + COALESCE(v.so_luong_bien_dong, 0)))::integer 
        ELSE 0::integer 
    END AS missing_count,
    c.is_active,
    c.ghi_chu
FROM public.cssd_dm_bo_dung_cu_chi_tiet c
JOIN public.cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
LEFT JOIN public.v_cssd_bo_dung_cu_bien_dong v 
    ON v.bo_dung_cu_id = c.bo_dung_cu_id 
    AND v.loai_dung_cu_id = c.loai_dung_cu_id;

-- 4. Hàm kiểm tra tính chịu nhiệt hỗn hợp của một bộ dụng cụ (Poka-yoke)
CREATE OR REPLACE FUNCTION public.fn_cssd_check_set_heat_resistance(p_bo_dung_cu_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_has_chiu_nhiet boolean := false;
    v_has_khong_chiu_nhiet boolean := false;
    v_result jsonb;
BEGIN
    -- Kiểm tra xem bộ có chứa dụng cụ chịu nhiệt cao hay không (is_chiu_nhiet = true)
    SELECT EXISTS (
        SELECT 1 FROM public.cssd_dm_bo_dung_cu_chi_tiet c
        JOIN public.cssd_dm_loai_dung_cu l ON c.loai_dung_cu_id = l.id
        WHERE c.bo_dung_cu_id = p_bo_dung_cu_id AND l.is_chiu_nhiet = true AND c.is_active = true
    ) INTO v_has_chiu_nhiet;

    -- Kiểm tra xem bộ có chứa dụng cụ không chịu nhiệt hay không (is_chiu_nhiet = false)
    SELECT EXISTS (
        SELECT 1 FROM public.cssd_dm_bo_dung_cu_chi_tiet c
        JOIN public.cssd_dm_loai_dung_cu l ON c.loai_dung_cu_id = l.id
        WHERE c.bo_dung_cu_id = p_bo_dung_cu_id AND l.is_chiu_nhiet = false AND c.is_active = true
    ) INTO v_has_khong_chiu_nhiet;

    IF v_has_chiu_nhiet AND v_has_khong_chiu_nhiet THEN
        v_result := jsonb_build_object(
            'is_hybrid', true,
            'lock_steam_134', true,
            'message', 'Bộ dụng cụ hỗn hợp (chứa cả cấu phần chịu nhiệt và KHÔNG chịu nhiệt). HỆ THỐNG KHÓA HẤP HƠI NƯỚC STEAM 134°C. Yêu cầu tách bộ!'
        );
    ELSE
        v_result := jsonb_build_object(
            'is_hybrid', false,
            'lock_steam_134', false,
            'message', 'Đồng nhất về tính chất chịu nhiệt.'
        );
    END IF;

    RETURN v_result;
END;
$$;

COMMIT;
