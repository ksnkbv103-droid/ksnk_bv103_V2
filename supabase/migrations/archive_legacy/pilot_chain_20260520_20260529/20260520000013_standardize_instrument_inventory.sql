-- Supabase Migration: 20260520000013_standardize_instrument_inventory.sql
-- Description: Standardize surgical and procedural instruments inventory, allocations, trigger and summary views.

-- 1. Add fields to dm_loai_dung_cu
ALTER TABLE public.dm_loai_dung_cu 
ADD COLUMN IF NOT EXISTS phan_loai text NOT NULL DEFAULT 'PHAU_THUAT' CHECK (phan_loai IN ('PHAU_THUAT', 'THU_THUAT')),
ADD COLUMN IF NOT EXISTS so_luong_kho_du_phong integer NOT NULL DEFAULT 0;

-- 2. Add fields to dm_bo_dung_cu
ALTER TABLE public.dm_bo_dung_cu 
ADD COLUMN IF NOT EXISTS phan_loai_bo text NOT NULL DEFAULT 'PHAU_THUAT' CHECK (phan_loai_bo IN ('PHAU_THUAT', 'THU_THUAT')),
ADD COLUMN IF NOT EXISTS co_ma_dinh_danh_rieng boolean NOT NULL DEFAULT true;

-- 3. Add fields to dm_bo_dung_cu_chi_tiet
ALTER TABLE public.dm_bo_dung_cu_chi_tiet 
ADD COLUMN IF NOT EXISTS co_ma_khac boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS ma_khac varchar(100) NULL;

-- 4. Create department allocation table for procedural sets
CREATE TABLE IF NOT EXISTS public.dm_bo_dung_cu_phan_bo (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bo_dung_cu_id uuid NOT NULL REFERENCES public.dm_bo_dung_cu(id) ON DELETE CASCADE,
    khoa_phong_id uuid NOT NULL REFERENCES public.dm_khoa_phong(id) ON DELETE CASCADE,
    so_luong_co_so integer NOT NULL DEFAULT 0,
    so_luong_hien_tai integer NOT NULL DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unique_bo_khoa UNIQUE (bo_dung_cu_id, khoa_phong_id)
);

-- Enable RLS and permissions on allocation table
ALTER TABLE public.dm_bo_dung_cu_phan_bo ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.dm_bo_dung_cu_phan_bo TO anon;
GRANT ALL ON TABLE public.dm_bo_dung_cu_phan_bo TO authenticated;
GRANT ALL ON TABLE public.dm_bo_dung_cu_phan_bo TO service_role;

-- 5. Create transaction ledger table for individual instrument transactions
CREATE TABLE IF NOT EXISTS public.fact_kho_dung_cu_giao_dich (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    loai_dung_cu_id uuid NOT NULL REFERENCES public.dm_loai_dung_cu(id) ON DELETE CASCADE,
    bo_dung_cu_id uuid REFERENCES public.dm_bo_dung_cu(id) ON DELETE SET NULL,
    quy_trinh_id uuid REFERENCES public.fact_quy_trinh(id) ON DELETE SET NULL,
    loai_giao_dich text NOT NULL CHECK (loai_giao_dich IN ('NHAP_KHO', 'BAO_HONG', 'BAO_MAT', 'BO_SUNG', 'DIEU_CHUYEN')),
    so_luong_thay_doi integer NOT NULL,
    ghi_chu text,
    nguoi_thuc_hien_id uuid, -- Reference employee if available
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);

-- Enable RLS and permissions on transaction ledger table
ALTER TABLE public.fact_kho_dung_cu_giao_dich ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.fact_kho_dung_cu_giao_dich TO anon;
GRANT ALL ON TABLE public.fact_kho_dung_cu_giao_dich TO authenticated;
GRANT ALL ON TABLE public.fact_kho_dung_cu_giao_dich TO service_role;

-- 6. Trigger to automatically sync code and name fields in dm_loai_dung_cu
CREATE OR REPLACE FUNCTION public.fn_sync_loai_dung_cu_names()
RETURNS trigger AS $$
BEGIN
    NEW.ma_loai := COALESCE(NEW.ma_loai_dung_cu, NEW.ma_loai);
    NEW.ma_loai_dung_cu := NEW.ma_loai;
    NEW.ten_loai := COALESCE(NEW.ten_loai_dung_cu, NEW.ten_loai);
    NEW.ten_loai_dung_cu := NEW.ten_loai;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_sync_loai_dung_cu_names
BEFORE INSERT OR UPDATE ON public.dm_loai_dung_cu
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_loai_dung_cu_names();

-- 7. View v_dm_loai_dung_cu_summary
CREATE OR REPLACE VIEW public.v_dm_loai_dung_cu_summary AS
SELECT 
    l.*,
    COALESCE(l.so_luong_kho_du_phong, 0) + COALESCE(SUM(CASE WHEN b.is_active = true AND c.is_active = true THEN c.so_luong ELSE 0 END), 0)::integer AS so_luong_tong,
    COALESCE(
        jsonb_agg(
            DISTINCT jsonb_build_object('id', b.id, 'ma_bo', b.ma_bo, 'ten_bo', b.ten_bo)
        ) FILTER (WHERE b.id IS NOT NULL AND b.is_active = true AND c.is_active = true),
        '[]'::jsonb
    ) AS bo_dung_cu_chua
FROM public.dm_loai_dung_cu l
LEFT JOIN public.dm_bo_dung_cu_chi_tiet c ON c.loai_dung_cu_id = l.id
LEFT JOIN public.dm_bo_dung_cu b ON c.bo_dung_cu_id = b.id
GROUP BY l.id;

-- 8. View v_dm_bo_dung_cu_summary
CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_summary AS
SELECT 
    b.*,
    COALESCE(COUNT(DISTINCT q.id) FILTER (WHERE q.is_active = true AND q.tinh_trang IS DISTINCT FROM 'MAT'), 0)::integer AS so_luong_bo,
    COALESCE(COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = true), 0)::integer AS so_khoan,
    COALESCE(SUM(c.so_luong) FILTER (WHERE c.is_active = true), 0)::integer AS tong_so_luong_dung_cu,
    COALESCE(SUM(p.so_luong_hien_tai) FILTER (WHERE p.is_active = true), 0)::integer AS tong_phan_bo
FROM public.dm_bo_dung_cu b
LEFT JOIN public.dm_bo_dung_cu_chi_tiet c ON c.bo_dung_cu_id = b.id
LEFT JOIN public.fact_quy_trinh q ON q.bo_dung_cu_id = b.id
LEFT JOIN public.dm_bo_dung_cu_phan_bo p ON p.bo_dung_cu_id = b.id
GROUP BY b.id;
