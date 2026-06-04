-- Re-drop v_dm_* read aliases recreated after 20260530100000 (app uses v_gstt_* / v_mdm_* / v_cssd_* only).
-- See docs/archive/baselines/view-rename-mapping-20260526.md Step 2.

BEGIN;

DROP VIEW IF EXISTS public.v_dm_bang_kiem_full;
DROP VIEW IF EXISTS public.v_dm_khoa_phong_full;
DROP VIEW IF EXISTS public.v_dm_thiet_bi_full;

COMMIT;
