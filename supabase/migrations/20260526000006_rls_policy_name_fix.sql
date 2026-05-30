-- Migration: Sửa tên policy RLS bị empty-prefix do bug split_part trong 000005.
-- Date: 26/05/2026 (follow-up).
--
-- Lỗi gốc: `split_part(p_table::text, '.', 2)` trả về rỗng khi p_table=regclass
-- và schema 'public' nằm trong search_path → tên policy = '_select', '_insert', ...
-- Lần re-apply, DROP POLICY IF EXISTS '_select' sẽ match → idempotent nhưng tên khó tra cứu.
--
-- Sửa: dùng `pg_class.relname` để lấy tên thật, không phụ thuộc cast text.

CREATE OR REPLACE FUNCTION public.fn_sys_attach_admin_rls(p_table regclass, p_module text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_relname text;
BEGIN
  SELECT relname INTO v_relname
    FROM pg_class
   WHERE oid = p_table::oid AND relkind = 'r';

  IF v_relname IS NULL THEN
    RAISE NOTICE '[rls] Bỏ qua %; không phải bảng vật lý.', p_table;
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', p_table);

  -- Drop policy cũ tên rỗng-prefix (từ 000005)
  EXECUTE format('DROP POLICY IF EXISTS "_select" ON %s', p_table);
  EXECUTE format('DROP POLICY IF EXISTS "_insert" ON %s', p_table);
  EXECUTE format('DROP POLICY IF EXISTS "_update" ON %s', p_table);
  EXECUTE format('DROP POLICY IF EXISTS "_delete" ON %s', p_table);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_relname || '_select', p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR SELECT TO authenticated USING (public.fn_sys_has_permission(%L, %L))',
    v_relname || '_select', p_table, p_module, 'view'
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_relname || '_insert', p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission(%L, %L))',
    v_relname || '_insert', p_table, p_module, 'create'
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_relname || '_update', p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR UPDATE TO authenticated USING (public.fn_sys_has_permission(%L, %L)) WITH CHECK (public.fn_sys_has_permission(%L, %L))',
    v_relname || '_update', p_table, p_module, 'edit', p_module, 'edit'
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_relname || '_delete', p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR DELETE TO authenticated USING (public.fn_sys_has_permission(%L, %L))',
    v_relname || '_delete', p_table, p_module, 'delete'
  );
END;
$$;

-- Re-attach policies với tên đúng cho 12 bảng admin core.
DO $$
DECLARE
  v_pair jsonb;
  v_pairs jsonb := jsonb_build_array(
    jsonb_build_array('public.sys_lookup_value',       'DANH_MUC'),
    jsonb_build_array('public.sys_mdm_registry',       'DANH_MUC'),
    jsonb_build_array('public.sys_mdm_suggestion',     'DANH_MUC'),
    jsonb_build_array('public.mdm_dm_khoa_phong',      'DANH_MUC'),
    jsonb_build_array('public.mdm_nhan_su',            'NHAN_SU'),
    jsonb_build_array('public.gstt_dm_bang_kiem',      'BANG_KIEM'),
    jsonb_build_array('public.sys_roles',              'PHAN_QUYEN'),
    jsonb_build_array('public.sys_permissions',        'PHAN_QUYEN'),
    jsonb_build_array('public.sys_role_permissions',   'PHAN_QUYEN'),
    jsonb_build_array('public.sys_user_roles',         'PHAN_QUYEN')
  );
BEGIN
  FOR v_pair IN SELECT jsonb_array_elements(v_pairs) LOOP
    BEGIN
      PERFORM public.fn_sys_attach_admin_rls(
        (v_pair->>0)::regclass,
        (v_pair->>1)
      );
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN OTHERS THEN
        RAISE NOTICE '[rls-fix] Lỗi % : %', v_pair->>0, SQLERRM;
    END;
  END LOOP;
END $$;

-- Dọn 2 dòng smoke test do trigger v2 sinh ra (category SLICE3_SMOKE_TEST).
DELETE FROM public.sys_audit_log
 WHERE table_name = 'sys_lookup_value'
   AND (new_data->>'category_type' = 'SLICE3_SMOKE_TEST'
        OR old_data->>'category_type' = 'SLICE3_SMOKE_TEST');
