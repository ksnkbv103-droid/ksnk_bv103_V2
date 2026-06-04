-- Postcheck sau cutover master data — chạy qua `npm run mdm:postcheck:sql` hoặc SQL Editor.
-- SSOT module prefix (2026-06-02): không còn compat view dm_* / fact_*.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1) Legacy trong danh_muc_tuy_bien (chỉ khi bảng còn tồn tại)
-- ═══════════════════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS _mdm_postcheck_legacy_dmb;
CREATE TEMP TABLE _mdm_postcheck_legacy_dmb (
  loai_danh_muc text,
  legacy_rows bigint,
  note text
);

DO $sec1$
BEGIN
  IF to_regclass('public.danh_muc_tuy_bien') IS NULL THEN
    INSERT INTO _mdm_postcheck_legacy_dmb (loai_danh_muc, legacy_rows, note)
    VALUES (NULL, NULL, 'OK: không còn bảng public.danh_muc_tuy_bien (đã sunset / greenfield).');
  ELSE
    INSERT INTO _mdm_postcheck_legacy_dmb (loai_danh_muc, legacy_rows)
    SELECT loai_danh_muc, COUNT(*)::bigint
    FROM public.danh_muc_tuy_bien
    WHERE loai_danh_muc IN (
      'KHOA_PHONG', 'KHOI_KHOA', 'TO_CONG_TAC', 'CHUC_VU', 'CHUC_DANH',
      'VAI_TRO_HE_THONG_KSNK', 'KHU_VUC_GIAM_SAT', 'NGHE_NGHIEP',
      'LOAI_DUNG_CU', 'LOAI_SU_CO', 'LOAI_MAY_TIET_KHUAN'
    )
    GROUP BY loai_danh_muc
    ORDER BY loai_danh_muc;
  END IF;
END
$sec1$;

SELECT * FROM _mdm_postcheck_legacy_dmb ORDER BY loai_danh_muc NULLS LAST;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2) Coverage registry (sys_mdm_registry)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT
  table_name,
  COUNT(*)::bigint AS total_candidate_fields,
  COUNT(*)::bigint AS registered_fields,
  0::bigint AS missing_fields
FROM public.mdm_field_registry
WHERE is_active = true
GROUP BY table_name
ORDER BY registered_fields DESC, table_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3) Orphan FK — module lookup views + fact tables
-- ═══════════════════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS _mdm_postcheck_orphans;
CREATE TEMP TABLE _mdm_postcheck_orphans (
  check_name text PRIMARY KEY,
  orphan_count bigint,
  note text
);

DO $body$
DECLARE
  n bigint;
BEGIN
  IF to_regclass('public.mdm_nhan_su') IS NOT NULL
     AND to_regclass('public.mdm_dm_to_cong_tac') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COUNT(*)::bigint FROM public.mdm_nhan_su x
      LEFT JOIN public.mdm_dm_to_cong_tac dm ON dm.id = x.to_id
      WHERE x.to_id IS NOT NULL AND dm.id IS NULL
    $q$ INTO n;
    INSERT INTO _mdm_postcheck_orphans VALUES ('mdm_nhan_su.to_id', n, NULL);
  ELSE
    INSERT INTO _mdm_postcheck_orphans VALUES (
      'mdm_nhan_su.to_id', NULL, 'SKIP: thiếu mdm_nhan_su hoặc mdm_dm_to_cong_tac');
  END IF;

  IF to_regclass('public.mdm_nhan_su') IS NOT NULL
     AND to_regclass('public.mdm_dm_chuc_vu') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COUNT(*)::bigint FROM public.mdm_nhan_su x
      LEFT JOIN public.mdm_dm_chuc_vu dm ON dm.id = x.chuc_vu_id
      WHERE x.chuc_vu_id IS NOT NULL AND dm.id IS NULL
    $q$ INTO n;
    INSERT INTO _mdm_postcheck_orphans VALUES ('mdm_nhan_su.chuc_vu_id', n, NULL);
  ELSE
    INSERT INTO _mdm_postcheck_orphans VALUES (
      'mdm_nhan_su.chuc_vu_id', NULL, 'SKIP: thiếu mdm_dm_chuc_vu');
  END IF;

  IF to_regclass('public.mdm_nhan_su') IS NOT NULL
     AND to_regclass('public.mdm_dm_chuc_danh') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COUNT(*)::bigint FROM public.mdm_nhan_su x
      LEFT JOIN public.mdm_dm_chuc_danh dm ON dm.id = x.chuc_danh_id
      WHERE x.chuc_danh_id IS NOT NULL AND dm.id IS NULL
    $q$ INTO n;
    INSERT INTO _mdm_postcheck_orphans VALUES ('mdm_nhan_su.chuc_danh_id', n, NULL);
  ELSE
    INSERT INTO _mdm_postcheck_orphans VALUES (
      'mdm_nhan_su.chuc_danh_id', NULL, 'SKIP: thiếu mdm_dm_chuc_danh');
  END IF;

  IF to_regclass('public.gstt_fact_chung_sessions') IS NOT NULL
     AND to_regclass('public.mdm_dm_nghe_nghiep') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COUNT(*)::bigint FROM public.gstt_fact_chung_sessions x
      LEFT JOIN public.mdm_dm_nghe_nghiep dm ON dm.id = x.nghe_nghiep_id
      WHERE x.nghe_nghiep_id IS NOT NULL AND dm.id IS NULL
    $q$ INTO n;
    INSERT INTO _mdm_postcheck_orphans VALUES ('gstt_fact_chung_sessions.nghe_nghiep_id', n, NULL);
  ELSE
    INSERT INTO _mdm_postcheck_orphans VALUES (
      'gstt_fact_chung_sessions.nghe_nghiep_id', NULL,
      'SKIP: thiếu gstt_fact_chung_sessions hoặc mdm_dm_nghe_nghiep');
  END IF;

  IF to_regclass('public.qlcv_fact_cong_viec') IS NULL THEN
    INSERT INTO _mdm_postcheck_orphans VALUES (
      'qlcv_fact_cong_viec.to_cong_tac_id', NULL, 'SKIP: chưa có qlcv_fact_cong_viec');
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'qlcv_fact_cong_viec'
      AND c.column_name = 'to_cong_tac_id'
  ) THEN
    INSERT INTO _mdm_postcheck_orphans VALUES (
      'qlcv_fact_cong_viec.to_cong_tac_id', NULL, 'SKIP: không có cột to_cong_tac_id');
  ELSIF to_regclass('public.mdm_dm_to_cong_tac') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COUNT(*)::bigint FROM public.qlcv_fact_cong_viec x
      LEFT JOIN public.mdm_dm_to_cong_tac dm ON dm.id = x.to_cong_tac_id
      WHERE x.to_cong_tac_id IS NOT NULL AND dm.id IS NULL
    $q$ INTO n;
    INSERT INTO _mdm_postcheck_orphans VALUES ('qlcv_fact_cong_viec.to_cong_tac_id', n, NULL);
  ELSE
    INSERT INTO _mdm_postcheck_orphans VALUES (
      'qlcv_fact_cong_viec.to_cong_tac_id', NULL, 'SKIP: thiếu mdm_dm_to_cong_tac');
  END IF;
END
$body$;

SELECT check_name, orphan_count, note FROM _mdm_postcheck_orphans ORDER BY check_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4) FK Postgres còn trỏ tới danh_muc_tuy_bien (0 dòng = OK sau sunset)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT
  tc.table_name AS fk_from_table,
  kcu.column_name AS fk_from_column,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'danh_muc_tuy_bien'
ORDER BY tc.table_name, kcu.ordinal_position;
