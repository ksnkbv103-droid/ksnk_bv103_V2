-- Migration: Lock Technical Registries (Nhóm B)
-- Description: Revokes INSERT, UPDATE, DELETE privileges on Nhóm B technical registries from 'authenticated' and 'anon' roles to enforce static read-only behavior.
-- Target tables: public.dm_khu_vuc_giam_sat, public.dm_hinh_thuc_giam_sat, public.dm_cach_thuc_giam_sat

-- 1. Revoke INSERT, UPDATE, DELETE privileges from anon and authenticated roles
REVOKE INSERT, UPDATE, DELETE ON TABLE public.dm_khu_vuc_giam_sat FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.dm_hinh_thuc_giam_sat FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.dm_cach_thuc_giam_sat FROM anon, authenticated;

-- 2. Explicitly ensure SELECT privileges are granted to anon and authenticated roles for robust dynamic lookups
GRANT SELECT ON TABLE public.dm_khu_vuc_giam_sat TO anon, authenticated;
GRANT SELECT ON TABLE public.dm_hinh_thuc_giam_sat TO anon, authenticated;
GRANT SELECT ON TABLE public.dm_cach_thuc_giam_sat TO anon, authenticated;

-- 3. Double-enforce RLS with restrictive SELECT-only policies to provide defense-in-depth
ALTER TABLE public.dm_khu_vuc_giam_sat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_hinh_thuc_giam_sat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_cach_thuc_giam_sat ENABLE ROW LEVEL SECURITY;

-- Note: Since no INSERT/UPDATE/DELETE policies are created for 'authenticated' or 'anon',
-- Postgres Row Level Security will naturally block any write attempts from these roles, 
-- complementing the SQL privilege layer.
