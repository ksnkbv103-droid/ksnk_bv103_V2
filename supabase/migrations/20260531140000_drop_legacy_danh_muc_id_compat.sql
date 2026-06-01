-- Gỡ cột legacy_danh_muc_id khỏi view compat lookup (app không SELECT; import đã loại trừ).
-- Postgres: CREATE OR REPLACE VIEW không được bỏ cột → DROP VIEW rồi CREATE lại.

BEGIN;

DROP VIEW IF EXISTS public.dm_loai_may_tiet_khuan CASCADE;
DROP VIEW IF EXISTS public.dm_chuc_danh CASCADE;
DROP VIEW IF EXISTS public.dm_chuc_vu CASCADE;
DROP VIEW IF EXISTS public.dm_khoi_khoa CASCADE;
DROP VIEW IF EXISTS public.dm_loai_su_co CASCADE;
DROP VIEW IF EXISTS public.dm_nghe_nghiep CASCADE;
DROP VIEW IF EXISTS public.dm_to_cong_tac CASCADE;

DROP VIEW IF EXISTS public.cssd_dm_loai_may CASCADE;
DROP VIEW IF EXISTS public.mdm_dm_chuc_danh CASCADE;
DROP VIEW IF EXISTS public.mdm_dm_chuc_vu CASCADE;
DROP VIEW IF EXISTS public.mdm_dm_khoi_khoa CASCADE;
DROP VIEW IF EXISTS public.mdm_dm_nghe_nghiep CASCADE;
DROP VIEW IF EXISTS public.mdm_dm_to_cong_tac CASCADE;

CREATE VIEW public.cssd_dm_loai_may WITH (security_invoker = true) AS
 SELECT id,
    code AS ma_loai_may,
    name AS ten_loai_may,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE category_type = 'LOAI_MAY_TIET_KHUAN'::text;

CREATE VIEW public.mdm_dm_chuc_danh WITH (security_invoker = true) AS
 SELECT id,
    code AS ma_chuc_danh,
    name AS ten_chuc_danh,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE category_type = 'CHUC_DANH'::text;

CREATE VIEW public.dm_chuc_danh WITH (security_invoker = true) AS
 SELECT id,
    ma_chuc_danh,
    ten_chuc_danh,
    is_active,
    created_at,
    updated_at
   FROM public.mdm_dm_chuc_danh;

CREATE VIEW public.mdm_dm_chuc_vu WITH (security_invoker = true) AS
 SELECT id,
    code AS ma_chuc_vu,
    name AS ten_chuc_vu,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE category_type = 'CHUC_VU'::text;

CREATE VIEW public.dm_chuc_vu WITH (security_invoker = true) AS
 SELECT id,
    ma_chuc_vu,
    ten_chuc_vu,
    is_active,
    created_at,
    updated_at
   FROM public.mdm_dm_chuc_vu;

CREATE VIEW public.mdm_dm_khoi_khoa WITH (security_invoker = true) AS
 SELECT id,
    code AS ma_khoi,
    name AS ten_khoi,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE category_type = 'KHOI_KHOA'::text;

CREATE VIEW public.dm_khoi_khoa WITH (security_invoker = true) AS
 SELECT id,
    ma_khoi,
    ten_khoi,
    is_active,
    created_at,
    updated_at
   FROM public.mdm_dm_khoi_khoa;

CREATE VIEW public.dm_loai_may_tiet_khuan WITH (security_invoker = true) AS
 SELECT id,
    ma_loai_may,
    ten_loai_may,
    is_active,
    created_at,
    updated_at
   FROM public.cssd_dm_loai_may;

CREATE VIEW public.dm_loai_su_co WITH (security_invoker = true) AS
 SELECT id,
    code AS ma_loai_su_co,
    name AS ten_loai_su_co,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE category_type = 'LOAI_SU_CO'::text;

CREATE VIEW public.mdm_dm_nghe_nghiep WITH (security_invoker = true) AS
 SELECT id,
    code AS ma_nghe_nghiep,
    name AS ten_nghe_nghiep,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE category_type = 'NGHE_NGHIEP'::text;

CREATE VIEW public.dm_nghe_nghiep WITH (security_invoker = true) AS
 SELECT id,
    ma_nghe_nghiep,
    ten_nghe_nghiep,
    is_active,
    created_at,
    updated_at
   FROM public.mdm_dm_nghe_nghiep;

CREATE VIEW public.mdm_dm_to_cong_tac WITH (security_invoker = true) AS
 SELECT id,
    code AS ma_to,
    name AS ten_to,
    is_active,
    created_at,
    updated_at
   FROM public.sys_lookup_value
  WHERE category_type = 'TO_CONG_TAC'::text;

CREATE VIEW public.dm_to_cong_tac WITH (security_invoker = true) AS
 SELECT id,
    ma_to,
    ten_to,
    is_active,
    created_at,
    updated_at
   FROM public.mdm_dm_to_cong_tac;

-- Môi trường restore cũ: chỉ DROP COLUMN trên bảng vật lý (không phải view)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'dm_khoi_khoa',
    'dm_to_cong_tac',
    'dm_chuc_vu',
    'dm_chuc_danh',
    'dm_khu_vuc_giam_sat',
    'dm_nghe_nghiep',
    'dm_loai_su_co',
    'dm_loai_may_tiet_khuan',
    'dm_loai_dung_cu',
    'dm_vai_tro_ksnk'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN information_schema.columns col
        ON col.table_schema = n.nspname
       AND col.table_name = c.relname
       AND col.column_name = 'legacy_danh_muc_id'
      WHERE n.nspname = 'public'
        AND c.relname = t
        AND c.relkind = 'r'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
        t,
        t || '_legacy_danh_muc_id_key'
      );
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS legacy_danh_muc_id', t);
    END IF;
  END LOOP;
END $$;

COMMIT;
