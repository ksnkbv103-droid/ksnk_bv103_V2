-- QLCV Phase 2: fn_qlcv_transition (SSOT chuyển trạng thái) + RLS KSNK-only strict.

BEGIN;

-- ── Helpers ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_qlcv_ksnk_khoa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT id
  FROM public.mdm_dm_khoa_phong
  WHERE ma_khoa = 'KSNK' AND is_active = true
  ORDER BY created_at
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.fn_qlcv_ksnk_khoa_id() IS
  'Id khoa KSNK — dùng RLS và fn_qlcv_transition.';

CREATE OR REPLACE FUNCTION public.fn_qlcv_actor_is_ksnk()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mdm_nhan_su ns
    INNER JOIN public.mdm_dm_khoa_phong kp
      ON kp.id = ns.khoa_id AND kp.ma_khoa = 'KSNK' AND kp.is_active = true
    WHERE ns.auth_user_id = auth.uid()
      AND ns.is_active = true
  );
$$;

COMMENT ON FUNCTION public.fn_qlcv_actor_is_ksnk() IS
  'true nếu auth.uid() gắn nhân sự thuộc khoa KSNK.';

CREATE OR REPLACE FUNCTION public.fn_qlcv_can_read_fact()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT public.fn_sys_is_admin()
    OR (
      public.fn_sys_has_permission('CONG_VIEC', 'view')
      AND public.fn_qlcv_actor_is_ksnk()
    );
$$;

-- ── Transition RPC ───────────────────────────────────────────────────────────

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
  v_ksnk uuid;
  v_next text;
  v_loai_hd text;
  v_noi_dung text;
  v_updated_id uuid;
  v_pct int;
BEGIN
  v_ksnk := public.fn_qlcv_ksnk_khoa_id();
  IF v_ksnk IS NULL THEN
    RAISE EXCEPTION 'Chưa cấu hình khoa KSNK trong MDM';
  END IF;

  SELECT * INTO v_cv
  FROM public.qlcv_fact_cong_viec
  WHERE id = p_cong_viec_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy công việc';
  END IF;

  IF v_cv.khoa_thuc_hien_id IS DISTINCT FROM v_ksnk THEN
    RAISE EXCEPTION 'Phiếu không thuộc phạm vi công việc nội bộ KSNK';
  END IF;

  v_pct := coalesce(v_cv.phan_tram_hoan_thanh, 0);

  CASE upper(trim(p_action))
    WHEN 'NGHIEM_THU' THEN
      IF v_cv.trang_thai IN ('HOAN_THANH', 'DA_HUY') THEN
        RAISE EXCEPTION 'Công việc đã hoàn thành hoặc đã hủy';
      END IF;
      IF NOT (
        v_cv.trang_thai = 'CHO_DUYET'
        OR (
          v_cv.trang_thai IN ('DANG_LAM', 'DANG_THUC_HIEN', 'QUA_HAN', 'TU_CHOI')
          AND v_pct >= 100
        )
      ) THEN
        RAISE EXCEPTION 'Chỉ nghiệm thu khi việc đã báo 100%% (cổng chờ nghiệm thu)';
      END IF;
      v_next := 'HOAN_THANH';
      v_loai_hd := 'HOAN_THANH';
      v_noi_dung := coalesce(nullif(trim(p_ly_do), ''), 'Đã nghiệm thu và đóng công việc.');
      UPDATE public.qlcv_fact_cong_viec
      SET trang_thai = v_next,
          phan_tram_hoan_thanh = 100,
          updated_at = now()
      WHERE id = p_cong_viec_id
        AND trang_thai = v_cv.trang_thai
      RETURNING id INTO v_updated_id;
      v_pct := 100;

    WHEN 'TU_CHOI_NGHIEM_THU' THEN
      IF NOT (
        v_cv.trang_thai = 'CHO_DUYET'
        OR v_cv.trang_thai = 'CHO_XAC_NHAN_HOAN_THANH'
        OR (v_cv.trang_thai IN ('DANG_LAM', 'DANG_THUC_HIEN', 'QUA_HAN') AND v_pct >= 100)
      ) THEN
        RAISE EXCEPTION 'Công việc không ở trạng thái chờ nghiệm thu';
      END IF;
      v_next := 'TU_CHOI';
      v_loai_hd := 'TU_CHOI_HOAN_THANH';
      v_noi_dung := 'Nghiệm thu không đạt — trả làm lại: '
        || coalesce(nullif(trim(p_ly_do), ''), 'Không có');
      UPDATE public.qlcv_fact_cong_viec
      SET trang_thai = v_next,
          updated_at = now()
      WHERE id = p_cong_viec_id
        AND trang_thai = v_cv.trang_thai
      RETURNING id INTO v_updated_id;

    WHEN 'HUY' THEN
      IF v_cv.trang_thai IN ('HOAN_THANH', 'DA_HUY') THEN
        RAISE EXCEPTION 'Công việc đã hoàn thành hoặc đã hủy';
      END IF;
      v_next := 'DA_HUY';
      v_loai_hd := 'CAP_NHAT';
      v_noi_dung := coalesce(nullif(trim(p_ly_do), ''), 'Hủy công việc');
      UPDATE public.qlcv_fact_cong_viec
      SET trang_thai = v_next,
          updated_at = now()
      WHERE id = p_cong_viec_id
        AND trang_thai = v_cv.trang_thai
      RETURNING id INTO v_updated_id;

    WHEN 'PHE_DUYET_DEXUAT' THEN
      IF v_cv.is_active = true OR v_cv.trang_thai = 'DA_HUY' THEN
        RAISE EXCEPTION 'Không phải đề xuất chờ duyệt';
      END IF;
      v_next := coalesce(nullif(p_patch->>'trang_thai', ''), 'MOI');
      v_loai_hd := 'PHE_DUYET';
      v_noi_dung := coalesce(
        nullif(p_patch->>'noi_dung_hoat_dong', ''),
        'Đã phê duyệt đề xuất'
      );
      UPDATE public.qlcv_fact_cong_viec
      SET trang_thai = v_next,
          is_active = true,
          khoa_thuc_hien_id = v_ksnk,
          tieu_de = coalesce(nullif(p_patch->>'tieu_de', ''), tieu_de),
          mo_ta = CASE WHEN p_patch ? 'mo_ta' THEN p_patch->>'mo_ta' ELSE mo_ta END,
          loai_cong_viec = coalesce(nullif(p_patch->>'loai_cong_viec', ''), loai_cong_viec),
          muc_do_uu_tien = coalesce(nullif(p_patch->>'muc_do_uu_tien', ''), muc_do_uu_tien),
          han_hoan_thanh = CASE
            WHEN p_patch ? 'han_hoan_thanh' AND nullif(p_patch->>'han_hoan_thanh', '') IS NOT NULL
              THEN (p_patch->>'han_hoan_thanh')::date
            ELSE han_hoan_thanh
          END,
          nguoi_phu_trach_id = CASE
            WHEN p_patch ? 'nguoi_phu_trach_id' AND nullif(p_patch->>'nguoi_phu_trach_id', '') IS NOT NULL
              THEN (p_patch->>'nguoi_phu_trach_id')::uuid
            ELSE nguoi_phu_trach_id
          END,
          to_cong_tac_id = CASE
            WHEN p_patch ? 'to_cong_tac_id' AND nullif(p_patch->>'to_cong_tac_id', '') IS NOT NULL
              THEN (p_patch->>'to_cong_tac_id')::uuid
            ELSE to_cong_tac_id
          END,
          nguoi_giao_viec_id = CASE
            WHEN p_patch ? 'nguoi_giao_viec_id' AND nullif(p_patch->>'nguoi_giao_viec_id', '') IS NOT NULL
              THEN (p_patch->>'nguoi_giao_viec_id')::uuid
            ELSE nguoi_giao_viec_id
          END,
          updated_at = now()
      WHERE id = p_cong_viec_id
        AND is_active = false
        AND trang_thai IS DISTINCT FROM 'DA_HUY'
      RETURNING id INTO v_updated_id;

    WHEN 'TU_CHOI_DEXUAT' THEN
      IF v_cv.is_active = true OR v_cv.trang_thai = 'DA_HUY' THEN
        RAISE EXCEPTION 'Không phải đề xuất chờ duyệt';
      END IF;
      v_next := 'DA_HUY';
      v_loai_hd := 'PHE_DUYET';
      v_noi_dung := 'Đã từ chối đề xuất. Lý do: '
        || coalesce(nullif(trim(p_ly_do), ''), 'Không có');
      UPDATE public.qlcv_fact_cong_viec
      SET trang_thai = v_next,
          is_active = false,
          updated_at = now()
      WHERE id = p_cong_viec_id
        AND is_active = false
        AND trang_thai IS DISTINCT FROM 'DA_HUY'
      RETURNING id INTO v_updated_id;

    WHEN 'SET_TRANG_THAI' THEN
      v_next := nullif(p_patch->>'next_trang_thai', '');
      IF v_next IS NULL THEN
        RAISE EXCEPTION 'Thiếu next_trang_thai trong p_patch';
      END IF;
      v_loai_hd := coalesce(nullif(p_patch->>'loai_hoat_dong', ''), 'CAP_NHAT');
      v_noi_dung := coalesce(nullif(trim(p_ly_do), ''), 'Cập nhật trạng thái');
      UPDATE public.qlcv_fact_cong_viec
      SET trang_thai = v_next,
          updated_at = now(),
          phan_tram_hoan_thanh = CASE
            WHEN p_patch ? 'phan_tram_hoan_thanh'
              THEN (p_patch->>'phan_tram_hoan_thanh')::integer
            ELSE phan_tram_hoan_thanh
          END
      WHERE id = p_cong_viec_id
        AND (
          nullif(p_patch->>'current_trang_thai', '') IS NULL
          OR trang_thai = p_patch->>'current_trang_thai'
        )
      RETURNING id INTO v_updated_id;
      IF p_patch ? 'phan_tram_hoan_thanh' THEN
        v_pct := (p_patch->>'phan_tram_hoan_thanh')::integer;
      END IF;

    ELSE
      RAISE EXCEPTION 'Action không hợp lệ: %', p_action;
  END CASE;

  IF v_updated_id IS NULL THEN
    RAISE EXCEPTION 'Trạng thái công việc đã thay đổi hoặc không cập nhật được';
  END IF;

  INSERT INTO public.qlcv_fact_cong_viec_hoat_dong (
    id_cong_viec,
    loai_hoat_dong,
    nguoi_thuc_hien_id,
    noi_dung,
    trang_thai,
    phan_tram_hoan_thanh
  ) VALUES (
    p_cong_viec_id,
    v_loai_hd,
    p_actor_nhan_su_id,
    v_noi_dung,
    v_next,
    v_pct
  );

  RETURN jsonb_build_object('id', v_updated_id, 'trang_thai', v_next);
END;
$function$;

COMMENT ON FUNCTION public.fn_qlcv_transition(uuid, text, uuid, text, jsonb) IS
  'SSOT chuyển trạng thái QLCV KSNK + ghi nhật ký. Gọi qua service_role (Server Actions).';

REVOKE ALL ON FUNCTION public.fn_qlcv_transition(uuid, text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_transition(uuid, text, uuid, text, jsonb) TO service_role;

-- ── RLS strict KSNK ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow all for auth users" ON public.qlcv_fact_cong_viec;
DROP POLICY IF EXISTS "Cho phép thao tác fact_cong_viec" ON public.qlcv_fact_cong_viec;
DROP POLICY IF EXISTS "qlcv_select_authenticated_own_khoa" ON public.qlcv_fact_cong_viec;

CREATE POLICY "qlcv_select_ksnk_authenticated"
  ON public.qlcv_fact_cong_viec
  FOR SELECT
  TO authenticated
  USING (
    khoa_thuc_hien_id = public.fn_qlcv_ksnk_khoa_id()
    AND public.fn_qlcv_can_read_fact()
  );

COMMENT ON POLICY "qlcv_select_ksnk_authenticated" ON public.qlcv_fact_cong_viec IS
  'Phase 2: chỉ đọc phiếu KSNK; actor thuộc KSNK + CONG_VIEC.view (hoặc admin). Ghi qua service_role/RPC.';

REVOKE ALL ON TABLE public.qlcv_fact_cong_viec FROM authenticated;
GRANT SELECT ON TABLE public.qlcv_fact_cong_viec TO authenticated;

DROP POLICY IF EXISTS "qlcv_hd_select_authenticated" ON public.qlcv_fact_cong_viec_hoat_dong;

CREATE POLICY "qlcv_hd_select_ksnk_authenticated"
  ON public.qlcv_fact_cong_viec_hoat_dong
  FOR SELECT
  TO authenticated
  USING (
    public.fn_qlcv_can_read_fact()
    AND EXISTS (
      SELECT 1
      FROM public.qlcv_fact_cong_viec cv
      WHERE cv.id = id_cong_viec
        AND cv.khoa_thuc_hien_id = public.fn_qlcv_ksnk_khoa_id()
    )
  );

REVOKE ALL ON TABLE public.qlcv_fact_cong_viec_hoat_dong FROM authenticated;
GRANT SELECT ON TABLE public.qlcv_fact_cong_viec_hoat_dong TO authenticated;

DROP POLICY IF EXISTS "qlcv_dinh_ky_select_ksnk" ON public.qlcv_fact_cong_viec_dinh_ky;

CREATE POLICY "qlcv_dinh_ky_select_ksnk"
  ON public.qlcv_fact_cong_viec_dinh_ky
  FOR SELECT
  TO authenticated
  USING (
    public.fn_qlcv_can_read_fact()
    AND (
      khoa_thuc_hien_id = public.fn_qlcv_ksnk_khoa_id()
      OR khoa_thuc_hien_id IS NULL
    )
  );

REVOKE ALL ON TABLE public.qlcv_fact_cong_viec_dinh_ky FROM authenticated;
GRANT SELECT ON TABLE public.qlcv_fact_cong_viec_dinh_ky TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
