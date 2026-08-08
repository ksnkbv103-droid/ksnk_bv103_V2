-- Module Đào tạo / thi trắc nghiệm KSNK (thi thử + thi thật).

CREATE TABLE IF NOT EXISTS public.dao_tao_chu_de (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma text NOT NULL UNIQUE,
  ten text NOT NULL,
  mo_ta text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.dao_tao_chu_de (ma, ten, mo_ta)
VALUES ('SSI_TRUOC_MO', 'Phòng ngừa nhiễm khuẩn vết mổ (trước mổ)', 'Ngân hàng mặc định từ MCQ import')
ON CONFLICT (ma) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.dao_tao_cau_hoi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chu_de_id uuid NOT NULL REFERENCES public.dao_tao_chu_de(id) ON DELETE RESTRICT,
  loai text NOT NULL CHECK (loai IN ('single', 'multi', 'true_false_cluster', 'order')),
  bloom_level smallint NOT NULL CHECK (bloom_level BETWEEN 1 AND 5),
  stem text NOT NULL,
  giai_thich text,
  dap_an_dung jsonb NOT NULL DEFAULT '{}'::jsonb,
  import_stt integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dao_tao_cau_hoi_chu_de_active
  ON public.dao_tao_cau_hoi (chu_de_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_dao_tao_cau_hoi_loai_bloom
  ON public.dao_tao_cau_hoi (loai, bloom_level) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.dao_tao_phuong_an (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cau_hoi_id uuid NOT NULL REFERENCES public.dao_tao_cau_hoi(id) ON DELETE CASCADE,
  nhan_goc text NOT NULL,
  noi_dung text NOT NULL,
  thu_tu_goc smallint NOT NULL DEFAULT 0,
  tf_dung boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dao_tao_phuong_an_cau_hoi
  ON public.dao_tao_phuong_an (cau_hoi_id);

CREATE TABLE IF NOT EXISTS public.dao_tao_muc_do_thi_thu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma text NOT NULL UNIQUE,
  ten text NOT NULL,
  so_cau integer NOT NULL CHECK (so_cau > 0),
  thoi_gian_phut integer NOT NULL CHECK (thoi_gian_phut > 0),
  bloom_quota jsonb NOT NULL DEFAULT '{}'::jsonb,
  loai_quota jsonb NOT NULL DEFAULT '{}'::jsonb,
  thu_tu smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.dao_tao_muc_do_thi_thu (ma, ten, so_cau, thoi_gian_phut, bloom_quota, loai_quota, thu_tu)
VALUES
  (
    'co_ban',
    'Cơ bản',
    10,
    15,
    '{"1":0.40,"2":0.40,"3":0.20,"4":0,"5":0}'::jsonb,
    '{"single":0.55,"multi":0.20,"true_false_cluster":0.15,"order":0.10}'::jsonb,
    1
  ),
  (
    'trung_binh',
    'Trung bình',
    20,
    25,
    '{"1":0.25,"2":0.30,"3":0.30,"4":0.15,"5":0}'::jsonb,
    '{"single":0.50,"multi":0.20,"true_false_cluster":0.15,"order":0.15}'::jsonb,
    2
  ),
  (
    'nang_cao',
    'Nâng cao',
    40,
    45,
    '{"1":0.10,"2":0.20,"3":0.35,"4":0.25,"5":0.10}'::jsonb,
    '{"single":0.45,"multi":0.20,"true_false_cluster":0.20,"order":0.15}'::jsonb,
    3
  )
ON CONFLICT (ma) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.dao_tao_ky_thi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  che_do text NOT NULL CHECK (che_do IN ('thi_thu', 'thi_that')),
  ten text NOT NULL,
  mo_ta text,
  so_cau integer NOT NULL CHECK (so_cau > 0),
  thoi_gian_phut integer NOT NULL CHECK (thoi_gian_phut > 0),
  diem_dat_pct numeric(5,1) CHECK (diem_dat_pct IS NULL OR (diem_dat_pct >= 0 AND diem_dat_pct <= 100)),
  bloom_quota jsonb NOT NULL DEFAULT '{}'::jsonb,
  loai_quota jsonb NOT NULL DEFAULT '{}'::jsonb,
  chu_de_ids uuid[] NOT NULL DEFAULT '{}',
  shuffle_cau boolean NOT NULL DEFAULT true,
  shuffle_dap_an boolean NOT NULL DEFAULT true,
  so_lan_cho_phep integer NOT NULL DEFAULT 1 CHECK (so_lan_cho_phep >= 1),
  trang_thai text NOT NULL DEFAULT 'draft'
    CHECK (trang_thai IN ('draft', 'published', 'closed')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dao_tao_ky_thi_che_do_tt
  ON public.dao_tao_ky_thi (che_do, trang_thai);

CREATE TABLE IF NOT EXISTS public.dao_tao_ky_thi_gan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ky_thi_id uuid NOT NULL REFERENCES public.dao_tao_ky_thi(id) ON DELETE CASCADE,
  khoa_phong_id uuid REFERENCES public.mdm_dm_khoa_phong(id) ON DELETE CASCADE,
  nhan_su_id uuid REFERENCES public.mdm_nhan_su(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dao_tao_ky_thi_gan_target_chk CHECK (
    khoa_phong_id IS NOT NULL OR nhan_su_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_dao_tao_ky_thi_gan_ky
  ON public.dao_tao_ky_thi_gan (ky_thi_id);

CREATE TABLE IF NOT EXISTS public.dao_tao_lan_thi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  che_do text NOT NULL CHECK (che_do IN ('thi_thu', 'thi_that')),
  ky_thi_id uuid REFERENCES public.dao_tao_ky_thi(id) ON DELETE SET NULL,
  muc_do_id uuid REFERENCES public.dao_tao_muc_do_thi_thu(id) ON DELETE SET NULL,
  auth_user_id uuid NOT NULL,
  form_thong_tin jsonb NOT NULL DEFAULT '{}'::jsonb,
  seed text NOT NULL,
  so_cau integer NOT NULL,
  thoi_gian_phut integer NOT NULL,
  bat_dau_luc timestamptz NOT NULL DEFAULT now(),
  han_nop_luc timestamptz NOT NULL,
  nop_luc timestamptz,
  diem_so numeric(8,2),
  diem_toi_da numeric(8,2),
  diem_pct numeric(5,1),
  dat boolean,
  trang_thai text NOT NULL DEFAULT 'dang_lam'
    CHECK (trang_thai IN ('dang_lam', 'da_nop', 'het_gio')),
  quota_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dao_tao_lan_thi_user
  ON public.dao_tao_lan_thi (auth_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dao_tao_lan_thi_ky
  ON public.dao_tao_lan_thi (ky_thi_id) WHERE ky_thi_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.dao_tao_lan_thi_cau (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lan_thi_id uuid NOT NULL REFERENCES public.dao_tao_lan_thi(id) ON DELETE CASCADE,
  cau_hoi_id uuid REFERENCES public.dao_tao_cau_hoi(id) ON DELETE SET NULL,
  thu_tu_hien_thi integer NOT NULL,
  loai text NOT NULL,
  bloom_level smallint NOT NULL,
  chu_de_id uuid,
  stem text NOT NULL,
  giai_thich text,
  phuong_an_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  dap_an_dung jsonb NOT NULL DEFAULT '{}'::jsonb,
  tra_loi jsonb,
  dung boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lan_thi_id, thu_tu_hien_thi)
);

CREATE INDEX IF NOT EXISTS idx_dao_tao_lan_thi_cau_lan
  ON public.dao_tao_lan_thi_cau (lan_thi_id);

COMMENT ON TABLE public.dao_tao_cau_hoi IS 'Ngân hàng câu hỏi thi KSNK; dap_an_dung gắn id phương án ổn định.';
COMMENT ON TABLE public.dao_tao_lan_thi IS 'Lần làm bài thi thử/thi thật; hạn nộp theo đồng hồ server.';
COMMENT ON TABLE public.dao_tao_lan_thi_cau IS 'Snapshot đề + trả lời; không đổi khi bank sửa sau.';

-- RLS
ALTER TABLE public.dao_tao_chu_de ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dao_tao_cau_hoi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dao_tao_phuong_an ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dao_tao_muc_do_thi_thu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dao_tao_ky_thi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dao_tao_ky_thi_gan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dao_tao_lan_thi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dao_tao_lan_thi_cau ENABLE ROW LEVEL SECURITY;

-- Catalog: authenticated đọc; ghi cần DAO_TAO
DROP POLICY IF EXISTS dao_tao_chu_de_select ON public.dao_tao_chu_de;
CREATE POLICY dao_tao_chu_de_select ON public.dao_tao_chu_de
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS dao_tao_chu_de_write ON public.dao_tao_chu_de;
CREATE POLICY dao_tao_chu_de_write ON public.dao_tao_chu_de
  FOR ALL TO authenticated
  USING (public.fn_sys_has_permission('DAO_TAO', 'edit') OR public.is_admin_user())
  WITH CHECK (public.fn_sys_has_permission('DAO_TAO', 'edit') OR public.is_admin_user());

DROP POLICY IF EXISTS dao_tao_cau_hoi_select ON public.dao_tao_cau_hoi;
CREATE POLICY dao_tao_cau_hoi_select ON public.dao_tao_cau_hoi
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'view')
    OR is_active = true
  );

DROP POLICY IF EXISTS dao_tao_cau_hoi_write ON public.dao_tao_cau_hoi;
CREATE POLICY dao_tao_cau_hoi_write ON public.dao_tao_cau_hoi
  FOR ALL TO authenticated
  USING (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'create')
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
    OR public.fn_sys_has_permission('DAO_TAO', 'import')
  )
  WITH CHECK (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'create')
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
    OR public.fn_sys_has_permission('DAO_TAO', 'import')
  );

DROP POLICY IF EXISTS dao_tao_phuong_an_select ON public.dao_tao_phuong_an;
CREATE POLICY dao_tao_phuong_an_select ON public.dao_tao_phuong_an
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS dao_tao_phuong_an_write ON public.dao_tao_phuong_an;
CREATE POLICY dao_tao_phuong_an_write ON public.dao_tao_phuong_an
  FOR ALL TO authenticated
  USING (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'create')
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
    OR public.fn_sys_has_permission('DAO_TAO', 'import')
  )
  WITH CHECK (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'create')
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
    OR public.fn_sys_has_permission('DAO_TAO', 'import')
  );

DROP POLICY IF EXISTS dao_tao_muc_do_select ON public.dao_tao_muc_do_thi_thu;
CREATE POLICY dao_tao_muc_do_select ON public.dao_tao_muc_do_thi_thu
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS dao_tao_muc_do_write ON public.dao_tao_muc_do_thi_thu;
CREATE POLICY dao_tao_muc_do_write ON public.dao_tao_muc_do_thi_thu
  FOR ALL TO authenticated
  USING (public.fn_sys_has_permission('DAO_TAO', 'edit') OR public.is_admin_user())
  WITH CHECK (public.fn_sys_has_permission('DAO_TAO', 'edit') OR public.is_admin_user());

DROP POLICY IF EXISTS dao_tao_ky_thi_select ON public.dao_tao_ky_thi;
CREATE POLICY dao_tao_ky_thi_select ON public.dao_tao_ky_thi
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'view')
    OR (che_do = 'thi_that' AND trang_thai = 'published')
  );

DROP POLICY IF EXISTS dao_tao_ky_thi_write ON public.dao_tao_ky_thi;
CREATE POLICY dao_tao_ky_thi_write ON public.dao_tao_ky_thi
  FOR ALL TO authenticated
  USING (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'create')
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
  )
  WITH CHECK (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'create')
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
  );

DROP POLICY IF EXISTS dao_tao_ky_thi_gan_select ON public.dao_tao_ky_thi_gan;
CREATE POLICY dao_tao_ky_thi_gan_select ON public.dao_tao_ky_thi_gan
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS dao_tao_ky_thi_gan_write ON public.dao_tao_ky_thi_gan;
CREATE POLICY dao_tao_ky_thi_gan_write ON public.dao_tao_ky_thi_gan
  FOR ALL TO authenticated
  USING (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
  )
  WITH CHECK (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
  );

DROP POLICY IF EXISTS dao_tao_lan_thi_select ON public.dao_tao_lan_thi;
CREATE POLICY dao_tao_lan_thi_select ON public.dao_tao_lan_thi
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'view')
    OR auth_user_id = auth.uid()
  );

DROP POLICY IF EXISTS dao_tao_lan_thi_insert ON public.dao_tao_lan_thi;
CREATE POLICY dao_tao_lan_thi_insert ON public.dao_tao_lan_thi
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS dao_tao_lan_thi_update ON public.dao_tao_lan_thi;
CREATE POLICY dao_tao_lan_thi_update ON public.dao_tao_lan_thi
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
    OR auth_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
    OR auth_user_id = auth.uid()
  );

DROP POLICY IF EXISTS dao_tao_lan_thi_cau_select ON public.dao_tao_lan_thi_cau;
CREATE POLICY dao_tao_lan_thi_cau_select ON public.dao_tao_lan_thi_cau
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dao_tao_lan_thi lt
      WHERE lt.id = lan_thi_id
        AND (
          public.is_admin_user()
          OR public.fn_sys_has_permission('DAO_TAO', 'view')
          OR lt.auth_user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS dao_tao_lan_thi_cau_insert ON public.dao_tao_lan_thi_cau;
CREATE POLICY dao_tao_lan_thi_cau_insert ON public.dao_tao_lan_thi_cau
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dao_tao_lan_thi lt
      WHERE lt.id = lan_thi_id AND lt.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS dao_tao_lan_thi_cau_update ON public.dao_tao_lan_thi_cau;
CREATE POLICY dao_tao_lan_thi_cau_update ON public.dao_tao_lan_thi_cau
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dao_tao_lan_thi lt
      WHERE lt.id = lan_thi_id
        AND (
          public.is_admin_user()
          OR public.fn_sys_has_permission('DAO_TAO', 'edit')
          OR lt.auth_user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dao_tao_lan_thi lt
      WHERE lt.id = lan_thi_id
        AND (
          public.is_admin_user()
          OR public.fn_sys_has_permission('DAO_TAO', 'edit')
          OR lt.auth_user_id = auth.uid()
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dao_tao_chu_de TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dao_tao_cau_hoi TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dao_tao_phuong_an TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dao_tao_muc_do_thi_thu TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dao_tao_ky_thi TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dao_tao_ky_thi_gan TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dao_tao_lan_thi TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dao_tao_lan_thi_cau TO authenticated, service_role;
