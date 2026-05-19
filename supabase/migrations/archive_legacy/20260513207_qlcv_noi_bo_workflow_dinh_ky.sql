-- QLCV nội bộ KSNK: backfill mạng lưới → nội bộ, mở rộng trạng thái + hoạt động, khôi phục view list khi bảng dùng schema v2 (tieu_de),
-- bảng mẫu định kỳ + RPC sinh việc (idempotent).

-- ---------------------------------------------------------------------------
-- 1) Backfill phạm vi cũ (chỉ khi cột tồn tại)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fact_cong_viec' AND column_name = 'loai_pham_vi'
  ) THEN
    UPDATE public.fact_cong_viec SET loai_pham_vi = 'NOI_BO' WHERE loai_pham_vi = 'MANG_LUOI';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Cột giao việc / liên kết định kỳ (additive)
-- ---------------------------------------------------------------------------
ALTER TABLE public.fact_cong_viec
  ADD COLUMN IF NOT EXISTS nguoi_giao_viec_id uuid REFERENCES public.mdm_nhan_su(id);

ALTER TABLE public.fact_cong_viec
  ADD COLUMN IF NOT EXISTS dinh_ky_mau_id uuid;

-- ---------------------------------------------------------------------------
-- 3) Chuẩn hóa trạng thái trước khi thắt CHECK mới
-- ---------------------------------------------------------------------------
UPDATE public.fact_cong_viec
SET trang_thai = 'CHUA_BAT_DAU'
WHERE trang_thai IS NULL
   OR trang_thai NOT IN (
     'CHUA_BAT_DAU', 'DANG_THUC_HIEN', 'HOAN_THANH', 'QUA_HAN', 'DA_HUY',
     'DE_XUAT_CHO_DUYET', 'CHO_NHAN_VIEC', 'CHO_XAC_NHAN_HOAN_THANH'
   );

UPDATE public.fact_cong_viec
SET trang_thai = 'DE_XUAT_CHO_DUYET'
WHERE is_active = false
  AND trang_thai IS DISTINCT FROM 'DA_HUY'
  AND trang_thai = 'CHUA_BAT_DAU';

ALTER TABLE public.fact_cong_viec DROP CONSTRAINT IF EXISTS fact_cong_viec_trang_thai_check;

ALTER TABLE public.fact_cong_viec
  ADD CONSTRAINT fact_cong_viec_trang_thai_check CHECK (
    trang_thai IN (
      'DE_XUAT_CHO_DUYET',
      'CHO_NHAN_VIEC',
      'CHUA_BAT_DAU',
      'DANG_THUC_HIEN',
      'CHO_XAC_NHAN_HOAN_THANH',
      'HOAN_THANH',
      'QUA_HAN',
      'DA_HUY'
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Hoạt động — mở rộng loại
-- ---------------------------------------------------------------------------
ALTER TABLE public.fact_cong_viec_hoat_dong DROP CONSTRAINT IF EXISTS fact_cong_viec_hoat_dong_loai_hoat_dong_check;

ALTER TABLE public.fact_cong_viec_hoat_dong
  ADD CONSTRAINT fact_cong_viec_hoat_dong_loai_hoat_dong_check CHECK (
    loai_hoat_dong IN (
      'PHAN_CONG',
      'DE_XUAT',
      'BAO_CAO_TIEN_DO',
      'PHE_DUYET',
      'CAP_NHAT',
      'HOAN_THANH',
      'XAC_NHAN_NHAN',
      'DUYET_HOAN_THANH',
      'TU_CHOI_HOAN_THANH',
      'GIA_HAN'
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Bảng mẫu định kỳ (weekly | monthly)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fact_cong_viec_dinh_ky (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tieu_de text NOT NULL,
  mo_ta text,
  ma_chu_ky text NOT NULL CHECK (ma_chu_ky IN ('WEEKLY', 'MONTHLY')),
  ngay_bat_dau date NOT NULL DEFAULT CURRENT_DATE,
  nguoi_phu_trach_id uuid REFERENCES public.mdm_nhan_su(id),
  to_cong_tac_id uuid REFERENCES public.dm_to_cong_tac(id),
  nguoi_tao_id uuid REFERENCES public.mdm_nhan_su(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fact_cv_dinh_ky_active ON public.fact_cong_viec_dinh_ky(is_active);

ALTER TABLE public.fact_cong_viec
  DROP CONSTRAINT IF EXISTS fact_cong_viec_dinh_ky_mau_fk;

ALTER TABLE public.fact_cong_viec
  ADD CONSTRAINT fact_cong_viec_dinh_ky_mau_fk
  FOREIGN KEY (dinh_ky_mau_id) REFERENCES public.fact_cong_viec_dinh_ky(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 6) RPC sinh instance định kỳ (idempotent theo mẫu + ngày hạn)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted int := 0;
  r record;
  due date := CURRENT_DATE;
  match_due boolean;
BEGIN
  FOR r IN
    SELECT * FROM public.fact_cong_viec_dinh_ky WHERE is_active = true
  LOOP
    match_due := false;
    IF r.ma_chu_ky = 'WEEKLY' THEN
      match_due := (r.ngay_bat_dau <= due) AND mod((due - r.ngay_bat_dau)::integer, 7) = 0;
    ELSE
      match_due := (r.ngay_bat_dau <= due)
        AND extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp);
    END IF;

    IF NOT match_due THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.fact_cong_viec c
      WHERE c.dinh_ky_mau_id = r.id
        AND c.han_hoan_thanh = due
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.fact_cong_viec (
      tieu_de,
      mo_ta,
      loai_pham_vi,
      loai_cong_viec,
      muc_do_uu_tien,
      trang_thai,
      han_hoan_thanh,
      phan_tram_hoan_thanh,
      is_active,
      nguoi_phu_trach_id,
      to_cong_tac_id,
      nguoi_tao_id,
      dinh_ky_mau_id
    )
    VALUES (
      r.tieu_de,
      r.mo_ta,
      'NOI_BO',
      'DINH_KY',
      'TRUNG_BINH',
      'CHUA_BAT_DAU',
      due,
      0,
      true,
      r.nguoi_phu_trach_id,
      r.to_cong_tac_id,
      r.nguoi_tao_id,
      r.id
    );

    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay() TO service_role;

COMMENT ON FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay() IS
  'Sinh fact_cong_viec cho mẫu định kỳ active; idempotent theo (dinh_ky_mau_id, han_hoan_thanh). Gọi hàng ngày (pg_cron / Edge).';

-- ---------------------------------------------------------------------------
-- 7) Khôi phục v_fact_cong_viec_full cho schema v2.1 (cột tieu_de)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fact_cong_viec' AND column_name = 'tieu_de'
  ) THEN
    EXECUTE 'DROP VIEW IF EXISTS public.v_cong_viec_qua_han CASCADE';
    EXECUTE 'DROP VIEW IF EXISTS public.v_fact_cong_viec_full CASCADE';
    EXECUTE $v$
      CREATE VIEW public.v_fact_cong_viec_full AS
      SELECT
        cv.*,
        ns_tao.ho_ten AS nguoi_tao_ten,
        ns_phu.ho_ten AS nguoi_phu_trach_ten,
        ns_giao.ho_ten AS nguoi_giao_ten,
        k.ten_khoa AS khoa_thuc_hien_ten,
        t.ten_to AS to_cong_tac_ten,
        (cv.han_hoan_thanh IS NOT NULL AND cv.han_hoan_thanh < CURRENT_DATE
          AND cv.trang_thai NOT IN ('HOAN_THANH', 'DA_HUY')) AS is_qua_han,
        (SELECT count(*)::int FROM public.fact_cong_viec sub
         WHERE sub.cong_viec_cha_id = cv.id AND sub.is_active = true) AS cong_viec_con_count
      FROM public.fact_cong_viec cv
      LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
      LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
      LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
      LEFT JOIN public.dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
      LEFT JOIN public.dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;
    $v$;
    EXECUTE $v$
      CREATE VIEW public.v_cong_viec_qua_han AS
      SELECT * FROM public.v_fact_cong_viec_full WHERE is_qua_han = true;
    $v$;
    EXECUTE 'GRANT SELECT ON public.v_fact_cong_viec_full TO authenticated, service_role';
    EXECUTE 'GRANT SELECT ON public.v_cong_viec_qua_han TO authenticated, service_role';
  END IF;
END $$;
