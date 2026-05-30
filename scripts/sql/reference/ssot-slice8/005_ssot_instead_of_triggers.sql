-- Slice 8 - Bước 5: INSTEAD OF triggers cho các wrapper view (cho phép INSERT/UPDATE/DELETE).
--
-- PRE-CONDITIONS:
--   [ ] Đã chạy 004 (wrapper views đã tồn tại).
--   [ ] App code KHÔNG còn ghi trực tiếp ALTER/DDL lên các bảng cũ (xác nhận qua repo search).
--
-- Triggers buộc INSERT/UPDATE/DELETE trên view phải truyền qua sys_lookup_value
-- với category_type tương ứng. Ngăn lỗi `cannot insert into view`.

DO $$ BEGIN
  RAISE EXCEPTION 'Slice 8 Step 5 chưa được enable. Bỏ comment "-- ENABLE" để proceed.';
END $$;
-- ENABLE

BEGIN;

-- ----------------------------------------------------
-- Helper: cấp phát trigger cho 1 view, generic theo category_type + cột (ma, ten).
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_lookup_view_iud()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_category text;
  v_ma_col   text;
  v_ten_col  text;
  v_code     text;
  v_name     text;
  v_active   boolean;
  v_metadata jsonb;
BEGIN
  -- Lấy mapping từ TG_TABLE_NAME (view name)
  SELECT category_type, ma_col, ten_col
    INTO v_category, v_ma_col, v_ten_col
    FROM public.sys_slice8_view_map
   WHERE view_name = TG_TABLE_NAME;

  IF v_category IS NULL THEN
    RAISE EXCEPTION 'View % không có entry trong sys_slice8_view_map', TG_TABLE_NAME;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.sys_lookup_value WHERE id = OLD.id AND category_type = v_category;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_code := COALESCE(to_jsonb(NEW)->>v_ma_col, OLD.id::text);
    v_name := COALESCE(to_jsonb(NEW)->>v_ten_col, '');
    v_active := COALESCE((to_jsonb(NEW)->>'is_active')::boolean, true);
    v_metadata := COALESCE((to_jsonb(NEW)->'metadata')::jsonb, '{}'::jsonb);
    UPDATE public.sys_lookup_value
       SET code = v_code,
           name = v_name,
           is_active = v_active,
           metadata = v_metadata,
           updated_at = now()
     WHERE id = OLD.id AND category_type = v_category;
    RETURN NEW;
  ELSE -- INSERT
    v_code := to_jsonb(NEW)->>v_ma_col;
    v_name := to_jsonb(NEW)->>v_ten_col;
    v_active := COALESCE((to_jsonb(NEW)->>'is_active')::boolean, true);
    v_metadata := COALESCE((to_jsonb(NEW)->'metadata')::jsonb, '{}'::jsonb);
    INSERT INTO public.sys_lookup_value (category_type, code, name, is_active, metadata)
    VALUES (v_category, v_code, v_name, v_active, v_metadata)
    RETURNING id INTO NEW.id;
    RETURN NEW;
  END IF;
END;
$$;

-- ----------------------------------------------------
-- Map view → (category_type, ma_col, ten_col)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sys_slice8_view_map (
  view_name      text PRIMARY KEY,
  category_type  text NOT NULL,
  ma_col         text NOT NULL,
  ten_col        text NOT NULL
);

INSERT INTO public.sys_slice8_view_map(view_name, category_type, ma_col, ten_col) VALUES
  ('mdm_dm_to_cong_tac',          'TO_CONG_TAC',          'ma_to',           'ten_to'),
  ('mdm_dm_chuc_danh',            'CHUC_DANH',            'ma_chuc_danh',    'ten_chuc_danh'),
  ('mdm_dm_chuc_vu',              'CHUC_VU',              'ma_chuc_vu',      'ten_chuc_vu'),
  ('mdm_dm_nghe_nghiep',          'NGHE_NGHIEP',          'ma_nghe_nghiep',  'ten_nghe_nghiep'),
  ('mdm_dm_khoi_khoa',            'KHOI_KHOA',            'ma_khoi',         'ten_khoi'),
  ('cssd_dm_loai_may',            'LOAI_MAY_TIET_KHUAN',  'ma_loai_may',     'ten_loai_may'),
  ('cssd_dm_tram',                'TRAM_CSSD',            'ma_tram',         'ten_tram'),
  ('gstt_dm_hinh_thuc_giam_sat',  'HINH_THUC_GIAM_SAT',   'ma_hinh_thuc',    'ten_hinh_thuc'),
  ('gstt_dm_cach_thuc_giam_sat',  'CACH_THUC_GIAM_SAT',   'ma_cach_thuc',    'ten_cach_thuc'),
  ('qlcv_dm_loai_cong_viec',      'LOAI_CONG_VIEC',       'ma',              'ten'),
  ('qlcv_dm_trang_thai_cong_viec','TRANG_THAI_CONG_VIEC', 'ma',              'ten'),
  ('nkbv_dm_loai',                'LOAI_NKBV',            'ma_loai',         'ten_loai'),
  ('nkbv_dm_trang_thai_ca',       'TRANG_THAI_NKBV_CA',   'ma_trang_thai',   'ten_trang_thai'),
  ('dm_loai_su_co',               'LOAI_SU_CO',           'ma_loai_su_co',   'ten_loai_su_co')
ON CONFLICT (view_name) DO UPDATE
  SET category_type = EXCLUDED.category_type,
      ma_col = EXCLUDED.ma_col,
      ten_col = EXCLUDED.ten_col;

-- ----------------------------------------------------
-- Attach INSTEAD OF triggers
-- ----------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT view_name FROM public.sys_slice8_view_map LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_lookup_view_iud ON public.%I', r.view_name);
    EXECUTE format(
      'CREATE TRIGGER trg_lookup_view_iud
         INSTEAD OF INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.fn_lookup_view_iud()',
      r.view_name
    );
    RAISE NOTICE '[iud-trigger] Attached on view %', r.view_name;
  END LOOP;
END $$;

COMMIT;

-- POST-CHECKS:
--   INSERT INTO public.mdm_dm_to_cong_tac(ma_to, ten_to) VALUES ('TEST_SLICE8', 'Smoke test');
--   SELECT * FROM public.sys_lookup_value WHERE category_type='TO_CONG_TAC' AND code='TEST_SLICE8';
--   DELETE FROM public.mdm_dm_to_cong_tac WHERE ma_to='TEST_SLICE8';
