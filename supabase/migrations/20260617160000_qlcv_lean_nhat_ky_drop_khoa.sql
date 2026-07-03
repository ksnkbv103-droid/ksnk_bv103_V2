-- QLCV lean: gộp nhật ký JSON trên fact, bỏ bảng hoat_dong + cột khoa_thuc_hien_id.

BEGIN;

-- 0) Sửa trigger legacy còn tham chiếu trang_thai_id (Track B đã DROP cột — drift prod)
CREATE OR REPLACE FUNCTION public.fn_set_hoan_thanh_luc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF OLD.trang_thai IS NOT DISTINCT FROM NEW.trang_thai THEN
    RETURN NEW;
  END IF;

  IF NEW.trang_thai = 'HOAN_THANH' AND COALESCE(OLD.trang_thai, '') <> 'HOAN_THANH' THEN
    NEW.hoan_thanh_luc := NOW();
  ELSIF NEW.trang_thai IS DISTINCT FROM 'HOAN_THANH' AND OLD.trang_thai = 'HOAN_THANH' THEN
    NEW.hoan_thanh_luc := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- 1) Cột nhật ký
ALTER TABLE public.qlcv_fact_cong_viec
  ADD COLUMN IF NOT EXISTS nhat_ky jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.qlcv_fact_cong_viec.nhat_ky IS
  'Nhật ký sự kiện [{id, loai_hoat_dong, nguoi_thuc_hien_id, trang_thai, noi_dung, phan_tram_hoan_thanh, created_at}]. SSOT thay qlcv_fact_cong_viec_hoat_dong.';

-- 2) Migrate hoat_dong → nhat_ky
UPDATE public.qlcv_fact_cong_viec cv
SET nhat_ky = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', hd.id,
        'loai_hoat_dong', hd.loai_hoat_dong,
        'nguoi_thuc_hien_id', hd.nguoi_thuc_hien_id,
        'trang_thai', hd.trang_thai,
        'noi_dung', hd.noi_dung,
        'phan_tram_hoan_thanh', hd.phan_tram_hoan_thanh,
        'created_at', hd.created_at
      )
      ORDER BY hd.created_at ASC
    )
    FROM public.qlcv_fact_cong_viec_hoat_dong hd
    WHERE hd.id_cong_viec = cv.id
  ),
  '[]'::jsonb
);

-- 3) Helper append nhật ký
CREATE OR REPLACE FUNCTION public.fn_qlcv_append_nhat_ky(
  p_cong_viec_id uuid,
  p_loai_hoat_dong text,
  p_nguoi_thuc_hien_id uuid,
  p_noi_dung text DEFAULT NULL,
  p_trang_thai text DEFAULT NULL,
  p_phan_tram_hoan_thanh integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_entry jsonb;
BEGIN
  v_entry := jsonb_build_object(
    'id', gen_random_uuid(),
    'loai_hoat_dong', p_loai_hoat_dong,
    'nguoi_thuc_hien_id', p_nguoi_thuc_hien_id,
    'trang_thai', p_trang_thai,
    'noi_dung', p_noi_dung,
    'phan_tram_hoan_thanh', p_phan_tram_hoan_thanh,
    'created_at', now()
  );
  UPDATE public.qlcv_fact_cong_viec
  SET nhat_ky = COALESCE(nhat_ky, '[]'::jsonb) || v_entry,
      updated_at = now()
  WHERE id = p_cong_viec_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy công việc';
  END IF;
  RETURN v_entry;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_qlcv_append_nhat_ky(uuid, text, uuid, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_append_nhat_ky(uuid, text, uuid, text, text, integer) TO service_role;

-- 4) View (bỏ khoa, thêm nhat_ky)
DROP VIEW IF EXISTS public.v_qlcv_cong_viec_qua_han;
DROP VIEW IF EXISTS public.v_qlcv_cong_viec_full;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_full WITH (security_invoker = true) AS
SELECT
  cv.id,
  cv.tieu_de,
  cv.mo_ta,
  cv.loai_cong_viec,
  lc.ten AS ten_loai_cong_viec,
  cv.trang_thai,
  ts.ten AS ten_trang_thai_hien_thi,
  ts.mau_sac AS trang_thai_mau_sac,
  cv.muc_do_uu_tien,
  cv.han_hoan_thanh,
  cv.phan_tram_hoan_thanh,
  cv.nguoi_tao_id,
  cv.nguoi_giao_viec_id,
  cv.nguoi_phu_trach_id,
  cv.to_cong_tac_id,
  cv.dinh_ky_mau_id,
  cv.is_active,
  cv.created_at,
  cv.updated_at,
  ns_tao.ho_ten AS nguoi_tao_ten,
  ns_phu.ho_ten AS nguoi_phu_trach_ten,
  ns_giao.ho_ten AS nguoi_giao_ten,
  t.ten_to AS to_cong_tac_ten,
  (
    cv.han_hoan_thanh IS NOT NULL
    AND cv.han_hoan_thanh < CURRENT_DATE
    AND cv.trang_thai <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text])
  ) AS is_qua_han,
  cv.checklist,
  cv.nhat_ky
FROM public.qlcv_fact_cong_viec cv
LEFT JOIN public.qlcv_dm_loai_cong_viec lc ON lc.ma = cv.loai_cong_viec
LEFT JOIN public.qlcv_dm_trang_thai_cong_viec ts ON ts.ma = cv.trang_thai
LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
LEFT JOIN public.mdm_dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_qua_han WITH (security_invoker = true) AS
SELECT * FROM public.v_qlcv_cong_viec_full WHERE is_qua_han = true;

-- 5) Drop bảng hoat_dong (+ policy orphan trước khi drop)
DROP POLICY IF EXISTS "qlcv_hd_select_ksnk_authenticated" ON public.qlcv_fact_cong_viec_hoat_dong;
DROP POLICY IF EXISTS "qlcv_hd_select_authenticated" ON public.qlcv_fact_cong_viec_hoat_dong;
DROP VIEW IF EXISTS public.fact_cong_viec_hoat_dong;
DROP TABLE IF EXISTS public.qlcv_fact_cong_viec_hoat_dong;

-- 6) Drop khoa_thuc_hien_id (drop policy phụ thuộc cột trước)
DROP POLICY IF EXISTS "qlcv_select_ksnk_authenticated" ON public.qlcv_fact_cong_viec;
DROP POLICY IF EXISTS "qlcv_select_authenticated_own_khoa" ON public.qlcv_fact_cong_viec;
DROP POLICY IF EXISTS "Allow all for auth users" ON public.qlcv_fact_cong_viec;
DROP POLICY IF EXISTS "Cho phép thao tác fact_cong_viec" ON public.qlcv_fact_cong_viec;

ALTER TABLE public.qlcv_fact_cong_viec
  DROP CONSTRAINT IF EXISTS fact_cong_viec_khoa_thuc_hien_id_fkey;
ALTER TABLE public.qlcv_fact_cong_viec
  DROP COLUMN IF EXISTS khoa_thuc_hien_id;

DROP POLICY IF EXISTS "qlcv_dinh_ky_select_ksnk" ON public.qlcv_fact_cong_viec_dinh_ky;

ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
  DROP CONSTRAINT IF EXISTS qlcv_fact_cong_viec_dinh_ky_khoa_thuc_hien_id_fkey;
ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
  DROP COLUMN IF EXISTS khoa_thuc_hien_id;

-- 7) fn_sync_overdue_tasks — append nhat_ky
CREATE OR REPLACE FUNCTION public.fn_sync_overdue_tasks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_count INTEGER := 0;
  r record;
BEGIN
  FOR r IN
    UPDATE public.qlcv_fact_cong_viec
    SET trang_thai = 'QUA_HAN', updated_at = NOW()
    WHERE han_hoan_thanh IS NOT NULL
      AND han_hoan_thanh < CURRENT_DATE
      AND is_active = true
      AND trang_thai <> ALL (ARRAY['HOAN_THANH', 'DA_HUY', 'QUA_HAN']::text[])
    RETURNING id, phan_tram_hoan_thanh, han_hoan_thanh
  LOOP
    PERFORM public.fn_qlcv_append_nhat_ky(
      r.id, 'CAP_NHAT', NULL,
      'Hệ thống tự động: chuyển Quá hạn (hạn chót ' || r.han_hoan_thanh::text || ').',
      'QUA_HAN', COALESCE(r.phan_tram_hoan_thanh, 0)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 8) Spawn định kỳ — bỏ khoa
CREATE OR REPLACE FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  inserted int := 0;
  r record;
  due date := CURRENT_DATE;
  match_due boolean;
  v_tt text;
  anchor_months int;
  due_months int;
BEGIN
  FOR r IN SELECT * FROM public.qlcv_fact_cong_viec_dinh_ky WHERE is_active = true LOOP
    IF r.ngay_bat_dau > due THEN CONTINUE; END IF;
    match_due := false;
    CASE r.ma_chu_ky
      WHEN 'DAILY' THEN match_due := true;
      WHEN 'WEEKLY' THEN match_due := mod((due - r.ngay_bat_dau)::integer, 7) = 0;
      WHEN 'MONTHLY' THEN match_due := extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp);
      WHEN 'QUARTERLY' THEN
        IF extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp) THEN
          anchor_months := date_part('year', r.ngay_bat_dau)::int * 12 + date_part('month', r.ngay_bat_dau::timestamp)::int;
          due_months := date_part('year', due)::int * 12 + date_part('month', due::timestamp)::int;
          match_due := mod(due_months - anchor_months, 3) = 0;
        END IF;
      ELSE CONTINUE;
    END CASE;
    IF NOT match_due THEN CONTINUE; END IF;
    IF EXISTS (
      SELECT 1 FROM public.qlcv_fact_cong_viec c
      WHERE c.dinh_ky_mau_id = r.id AND c.han_hoan_thanh = due
    ) THEN CONTINUE; END IF;

    v_tt := CASE WHEN r.nguoi_phu_trach_id IS NOT NULL OR r.to_cong_tac_id IS NOT NULL THEN 'DANG_LAM' ELSE 'MOI' END;

    INSERT INTO public.qlcv_fact_cong_viec (
      tieu_de, mo_ta, loai_cong_viec, trang_thai, muc_do_uu_tien, han_hoan_thanh,
      nguoi_phu_trach_id, to_cong_tac_id, dinh_ky_mau_id,
      nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active, checklist, nhat_ky
    ) VALUES (
      r.tieu_de, r.mo_ta, 'DINH_KY', v_tt, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
      r.nguoi_phu_trach_id, r.to_cong_tac_id, r.id,
      r.nguoi_tao_id, r.nguoi_tao_id, 0, true,
      public.fn_qlcv_mo_ta_to_checklist(r.mo_ta), '[]'::jsonb
    );
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$function$;

-- 9) fn_qlcv_transition — bỏ check khoa, append nhat_ky
CREATE OR REPLACE FUNCTION public.fn_qlcv_transition(
  p_cong_viec_id uuid,
  p_action text,
  p_actor_nhan_su_id uuid,
  p_ly_do text DEFAULT NULL,
  p_patch jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_cv public.qlcv_fact_cong_viec%ROWTYPE;
  v_next text;
  v_loai_hd text;
  v_noi_dung text;
  v_updated_id uuid;
  v_pct int;
BEGIN
  SELECT * INTO v_cv FROM public.qlcv_fact_cong_viec WHERE id = p_cong_viec_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy công việc'; END IF;

  v_pct := coalesce(v_cv.phan_tram_hoan_thanh, 0);

  CASE upper(trim(p_action))
    WHEN 'NGHIEM_THU' THEN
      IF v_cv.trang_thai IN ('HOAN_THANH', 'DA_HUY') THEN
        RAISE EXCEPTION 'Công việc đã hoàn thành hoặc đã hủy';
      END IF;
      IF NOT (
        v_cv.trang_thai = 'CHO_DUYET'
        OR (v_cv.trang_thai IN ('DANG_LAM', 'DANG_THUC_HIEN', 'QUA_HAN', 'TU_CHOI') AND v_pct >= 100)
      ) THEN
        RAISE EXCEPTION 'Chỉ nghiệm thu khi việc đã báo 100%%';
      END IF;
      v_next := 'HOAN_THANH'; v_loai_hd := 'HOAN_THANH';
      v_noi_dung := coalesce(nullif(trim(p_ly_do), ''), 'Đã nghiệm thu và đóng công việc.');
      UPDATE public.qlcv_fact_cong_viec SET trang_thai = v_next, phan_tram_hoan_thanh = 100, updated_at = now()
      WHERE id = p_cong_viec_id AND trang_thai = v_cv.trang_thai RETURNING id INTO v_updated_id;
      v_pct := 100;

    WHEN 'TU_CHOI_NGHIEM_THU' THEN
      IF NOT (
        v_cv.trang_thai = 'CHO_DUYET' OR v_cv.trang_thai = 'CHO_XAC_NHAN_HOAN_THANH'
        OR (v_cv.trang_thai IN ('DANG_LAM', 'DANG_THUC_HIEN', 'QUA_HAN') AND v_pct >= 100)
      ) THEN RAISE EXCEPTION 'Công việc không ở trạng thái chờ nghiệm thu'; END IF;
      v_next := 'TU_CHOI'; v_loai_hd := 'TU_CHOI_HOAN_THANH';
      v_noi_dung := 'Nghiệm thu không đạt — trả làm lại: ' || coalesce(nullif(trim(p_ly_do), ''), 'Không có');
      UPDATE public.qlcv_fact_cong_viec SET trang_thai = v_next, updated_at = now()
      WHERE id = p_cong_viec_id AND trang_thai = v_cv.trang_thai RETURNING id INTO v_updated_id;

    WHEN 'HUY' THEN
      IF v_cv.trang_thai IN ('HOAN_THANH', 'DA_HUY') THEN RAISE EXCEPTION 'Công việc đã hoàn thành hoặc đã hủy'; END IF;
      v_next := 'DA_HUY'; v_loai_hd := 'CAP_NHAT';
      v_noi_dung := coalesce(nullif(trim(p_ly_do), ''), 'Hủy công việc');
      UPDATE public.qlcv_fact_cong_viec SET trang_thai = v_next, updated_at = now()
      WHERE id = p_cong_viec_id AND trang_thai = v_cv.trang_thai RETURNING id INTO v_updated_id;

    WHEN 'PHE_DUYET_DEXUAT' THEN
      IF v_cv.is_active = true OR v_cv.trang_thai = 'DA_HUY' THEN RAISE EXCEPTION 'Không phải đề xuất chờ duyệt'; END IF;
      v_next := coalesce(nullif(p_patch->>'trang_thai', ''), 'MOI'); v_loai_hd := 'PHE_DUYET';
      v_noi_dung := coalesce(nullif(p_patch->>'noi_dung_hoat_dong', ''), 'Đã phê duyệt đề xuất');
      UPDATE public.qlcv_fact_cong_viec SET
        trang_thai = v_next, is_active = true,
        tieu_de = coalesce(nullif(p_patch->>'tieu_de', ''), tieu_de),
        mo_ta = CASE WHEN p_patch ? 'mo_ta' THEN p_patch->>'mo_ta' ELSE mo_ta END,
        loai_cong_viec = coalesce(nullif(p_patch->>'loai_cong_viec', ''), loai_cong_viec),
        muc_do_uu_tien = coalesce(nullif(p_patch->>'muc_do_uu_tien', ''), muc_do_uu_tien),
        han_hoan_thanh = CASE WHEN p_patch ? 'han_hoan_thanh' AND nullif(p_patch->>'han_hoan_thanh', '') IS NOT NULL
          THEN (p_patch->>'han_hoan_thanh')::date ELSE han_hoan_thanh END,
        nguoi_phu_trach_id = CASE WHEN p_patch ? 'nguoi_phu_trach_id' AND nullif(p_patch->>'nguoi_phu_trach_id', '') IS NOT NULL
          THEN (p_patch->>'nguoi_phu_trach_id')::uuid ELSE nguoi_phu_trach_id END,
        to_cong_tac_id = CASE WHEN p_patch ? 'to_cong_tac_id' AND nullif(p_patch->>'to_cong_tac_id', '') IS NOT NULL
          THEN (p_patch->>'to_cong_tac_id')::uuid ELSE to_cong_tac_id END,
        nguoi_giao_viec_id = CASE WHEN p_patch ? 'nguoi_giao_viec_id' AND nullif(p_patch->>'nguoi_giao_viec_id', '') IS NOT NULL
          THEN (p_patch->>'nguoi_giao_viec_id')::uuid ELSE nguoi_giao_viec_id END,
        updated_at = now()
      WHERE id = p_cong_viec_id AND is_active = false AND trang_thai IS DISTINCT FROM 'DA_HUY'
      RETURNING id INTO v_updated_id;

    WHEN 'TU_CHOI_DEXUAT' THEN
      IF v_cv.is_active = true OR v_cv.trang_thai = 'DA_HUY' THEN RAISE EXCEPTION 'Không phải đề xuất chờ duyệt'; END IF;
      v_next := 'DA_HUY'; v_loai_hd := 'PHE_DUYET';
      v_noi_dung := 'Đã từ chối đề xuất. Lý do: ' || coalesce(nullif(trim(p_ly_do), ''), 'Không có');
      UPDATE public.qlcv_fact_cong_viec SET trang_thai = v_next, is_active = false, updated_at = now()
      WHERE id = p_cong_viec_id AND is_active = false AND trang_thai IS DISTINCT FROM 'DA_HUY'
      RETURNING id INTO v_updated_id;

    WHEN 'SET_TRANG_THAI' THEN
      v_next := nullif(p_patch->>'next_trang_thai', '');
      IF v_next IS NULL THEN RAISE EXCEPTION 'Thiếu next_trang_thai'; END IF;
      v_loai_hd := coalesce(nullif(p_patch->>'loai_hoat_dong', ''), 'CAP_NHAT');
      v_noi_dung := coalesce(nullif(trim(p_ly_do), ''), 'Cập nhật trạng thái');
      UPDATE public.qlcv_fact_cong_viec SET
        trang_thai = v_next, updated_at = now(),
        phan_tram_hoan_thanh = CASE WHEN p_patch ? 'phan_tram_hoan_thanh'
          THEN (p_patch->>'phan_tram_hoan_thanh')::integer ELSE phan_tram_hoan_thanh END
      WHERE id = p_cong_viec_id AND (
        nullif(p_patch->>'current_trang_thai', '') IS NULL OR trang_thai = p_patch->>'current_trang_thai'
      ) RETURNING id INTO v_updated_id;
      IF p_patch ? 'phan_tram_hoan_thanh' THEN v_pct := (p_patch->>'phan_tram_hoan_thanh')::integer; END IF;

    ELSE RAISE EXCEPTION 'Action không hợp lệ: %', p_action;
  END CASE;

  IF v_updated_id IS NULL THEN RAISE EXCEPTION 'Trạng thái công việc đã thay đổi hoặc không cập nhật được'; END IF;

  PERFORM public.fn_qlcv_append_nhat_ky(
    p_cong_viec_id, v_loai_hd, p_actor_nhan_su_id, v_noi_dung, v_next, v_pct
  );

  RETURN jsonb_build_object('id', v_updated_id, 'trang_thai', v_next);
END;
$function$;

-- 10) RLS — module QLCV = KSNK (không filter cột khoa)
CREATE POLICY "qlcv_select_ksnk_authenticated"
  ON public.qlcv_fact_cong_viec FOR SELECT TO authenticated
  USING (public.fn_qlcv_can_read_fact());

CREATE POLICY "qlcv_dinh_ky_select_ksnk"
  ON public.qlcv_fact_cong_viec_dinh_ky FOR SELECT TO authenticated
  USING (public.fn_qlcv_can_read_fact());

NOTIFY pgrst, 'reload schema';

COMMIT;
