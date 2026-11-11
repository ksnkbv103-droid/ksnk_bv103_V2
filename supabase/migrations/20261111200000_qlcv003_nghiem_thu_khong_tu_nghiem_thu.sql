-- QLCV-003 (PO 2026-11-11): người tạo việc KHÔNG được tự nghiệm thu việc mình tạo,
-- trừ chủ nhiệm khoa và ADMIN.
--  - Chủ nhiệm khoa = vai trò RBAC `CHU_NHIEM_KHOA` (sys_roles, 20261111150000), cùng mẫu
--    CSSD_HOLD_QC_UNLOCK_ROLES. KHÔNG dùng chức vụ CV_CHU_NHIEM (20261031010000: chức vụ
--    không đổi quyền hệ thống).
--  - Nhánh NGHIEM_THU: actor NULL bị chặn (đường gọi duy nhất là server action xacNhanHoanThanh,
--    luôn truyền actor; không có hàm DB/cron nào gọi). Nhánh khác giữ nguyên hành vi NULL.
--  - Giữ nguyên chặn người phụ trách tự nghiệm thu (miễn ADMIN), chữ ký, SECURITY DEFINER,
--    search_path, mọi nhánh khác. CREATE OR REPLACE giữ ACL (chỉ service_role) — không GRANT thêm.
-- Gốc: pg_get_functiondef trên DB local ngày 2026-11-11.

CREATE OR REPLACE FUNCTION public.fn_qlcv_transition(p_cong_viec_id uuid, p_action text, p_actor_nhan_su_id uuid, p_ly_do text DEFAULT NULL::text, p_patch jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cv public.qlcv_fact_cong_viec%ROWTYPE;
  v_next text;
  v_loai_hd text;
  v_noi_dung text;
  v_updated_id uuid;
  v_pct int;
  v_from text;
BEGIN
  SELECT * INTO v_cv FROM public.qlcv_fact_cong_viec WHERE id = p_cong_viec_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy công việc'; END IF;

  v_pct := coalesce(v_cv.phan_tram_hoan_thanh, 0);
  v_from := v_cv.trang_thai;

  CASE upper(trim(p_action))
    WHEN 'NGHIEM_THU' THEN
      IF upper(coalesce(v_cv.loai_cong_viec, '')) = 'DINH_KY' THEN
        RAISE EXCEPTION 'Việc định kỳ (DINH_KY) không nghiệm thu — tick đủ 100%% sẽ hoàn thành tự động (không CHO_DUYET).';
      END IF;
      IF v_cv.trang_thai IN ('HOAN_THANH', 'DA_HUY') THEN
        RAISE EXCEPTION 'Công việc đã hoàn thành hoặc đã hủy';
      END IF;
      IF NOT (
        v_cv.trang_thai = 'CHO_DUYET'
        OR (v_cv.trang_thai IN ('DANG_LAM', 'DANG_THUC_HIEN', 'QUA_HAN', 'TU_CHOI') AND v_pct >= 100)
      ) THEN
        RAISE EXCEPTION 'Chỉ nghiệm thu khi việc đã báo 100%%';
      END IF;
      -- QLCV-003 (PO 2026-11-11): bắt buộc biết người nghiệm thu (không còn bỏ qua khi NULL).
      IF p_actor_nhan_su_id IS NULL THEN
        RAISE EXCEPTION 'Nghiệm thu cần hồ sơ nhân sự của người thao tác.';
      END IF;
      -- Giữ nguyên: người phụ trách không tự nghiệm thu (chỉ miễn ADMIN).
      IF p_actor_nhan_su_id IS NOT DISTINCT FROM v_cv.nguoi_phu_trach_id
         AND NOT EXISTS (
           SELECT 1
           FROM public.mdm_nhan_su ns
           JOIN public.v_sys_user_permissions v ON v.auth_user_id = ns.auth_user_id
           WHERE ns.id = p_actor_nhan_su_id
             AND v.roles ? 'ADMIN'
         )
      THEN
        RAISE EXCEPTION 'Không được tự nghiệm thu việc mình phụ trách.';
      END IF;
      -- QLCV-003: người tạo việc không tự nghiệm thu, trừ vai trò RBAC ADMIN / CHU_NHIEM_KHOA.
      IF p_actor_nhan_su_id IS NOT DISTINCT FROM v_cv.nguoi_tao_id
         AND NOT EXISTS (
           SELECT 1
           FROM public.mdm_nhan_su ns
           JOIN public.v_sys_user_permissions v ON v.auth_user_id = ns.auth_user_id
           WHERE ns.id = p_actor_nhan_su_id
             AND v.roles ?| ARRAY['ADMIN', 'CHU_NHIEM_KHOA']
         )
      THEN
        RAISE EXCEPTION 'Không được tự nghiệm thu việc mình tạo (chỉ Chủ nhiệm khoa hoặc ADMIN được).';
      END IF;
      v_next := 'HOAN_THANH'; v_loai_hd := 'HOAN_THANH';
      v_noi_dung := coalesce(nullif(trim(p_ly_do), ''), 'Đã nghiệm thu và đóng công việc.');
      UPDATE public.qlcv_fact_cong_viec SET trang_thai = v_next, phan_tram_hoan_thanh = 100, updated_at = now()
      WHERE id = p_cong_viec_id AND trang_thai = v_cv.trang_thai RETURNING id INTO v_updated_id;
      v_pct := 100;

    WHEN 'TU_CHOI_NGHIEM_THU' THEN
      IF upper(coalesce(v_cv.loai_cong_viec, '')) = 'DINH_KY' THEN
        RAISE EXCEPTION 'Việc định kỳ (DINH_KY) không dùng từ chối nghiệm thu.';
      END IF;
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
      v_next := upper(nullif(p_patch->>'next_trang_thai', ''));
      IF v_next IS NULL THEN RAISE EXCEPTION 'Thiếu next_trang_thai'; END IF;
      IF upper(coalesce(v_cv.loai_cong_viec, '')) = 'DINH_KY' THEN
        IF v_next = 'CHO_DUYET' THEN
          RAISE EXCEPTION 'Việc định kỳ (DINH_KY) không vào CHO_DUYET — dùng HOAN_THANH khi đủ 100%%.';
        END IF;
        IF v_next = 'HOAN_THANH' AND v_pct < 100 THEN
          RAISE EXCEPTION 'DINH_KY chỉ hoàn thành khi đủ 100%%.';
        END IF;
      ELSE
        IF v_next = 'HOAN_THANH' THEN
          RAISE EXCEPTION 'DOT/KHAN chỉ đóng qua NGHIEM_THU — không SET_TRANG_THAI → HOAN_THANH.';
        END IF;
        IF v_next = 'CHO_DUYET' AND v_pct < 100 THEN
          RAISE EXCEPTION 'Chỉ vào CHO_DUYET khi đã báo 100%%.';
        END IF;
      END IF;
      IF v_next = 'HOAN_THANH' AND v_from IN ('DA_HUY') THEN
        RAISE EXCEPTION 'Không mở lại việc đã hủy thành HOAN_THANH.';
      END IF;
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

-- ============================================================================
-- CHƯA APPLY PROD — chờ PO
-- SQL kiểm prod (chỉ đọc):
--   SELECT pg_get_functiondef('public.fn_qlcv_transition'::regproc) ILIKE '%CHU_NHIEM_KHOA%' AS da_apply;
--   SELECT proacl FROM pg_proc WHERE proname = 'fn_qlcv_transition';      -- kỳ vọng chỉ postgres + service_role
--   SELECT count(*) FROM public.sys_roles WHERE name = 'CHU_NHIEM_KHOA';   -- phải = 1 (cần 20261111150000 trước)
--   SELECT count(*) FROM public.qlcv_fact_cong_viec
--    WHERE trang_thai = 'CHO_DUYET' AND nguoi_tao_id IS NOT NULL;         -- số việc chờ NT có thể bị ảnh hưởng
-- ============================================================================
-- Rollback (chạy nguyên khối dưới, bỏ dấu comment) — bản trước migration này:
-- CREATE OR REPLACE FUNCTION public.fn_qlcv_transition(p_cong_viec_id uuid, p_action text, p_actor_nhan_su_id uuid, p_ly_do text DEFAULT NULL::text, p_patch jsonb DEFAULT '{}'::jsonb)
--  RETURNS jsonb
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_cv public.qlcv_fact_cong_viec%ROWTYPE;
--   v_next text;
--   v_loai_hd text;
--   v_noi_dung text;
--   v_updated_id uuid;
--   v_pct int;
--   v_from text;
-- BEGIN
--   SELECT * INTO v_cv FROM public.qlcv_fact_cong_viec WHERE id = p_cong_viec_id FOR UPDATE;
--   IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy công việc'; END IF;
--
--   v_pct := coalesce(v_cv.phan_tram_hoan_thanh, 0);
--   v_from := v_cv.trang_thai;
--
--   CASE upper(trim(p_action))
--     WHEN 'NGHIEM_THU' THEN
--       IF upper(coalesce(v_cv.loai_cong_viec, '')) = 'DINH_KY' THEN
--         RAISE EXCEPTION 'Việc định kỳ (DINH_KY) không nghiệm thu — tick đủ 100%% sẽ hoàn thành tự động (không CHO_DUYET).';
--       END IF;
--       IF v_cv.trang_thai IN ('HOAN_THANH', 'DA_HUY') THEN
--         RAISE EXCEPTION 'Công việc đã hoàn thành hoặc đã hủy';
--       END IF;
--       IF NOT (
--         v_cv.trang_thai = 'CHO_DUYET'
--         OR (v_cv.trang_thai IN ('DANG_LAM', 'DANG_THUC_HIEN', 'QUA_HAN', 'TU_CHOI') AND v_pct >= 100)
--       ) THEN
--         RAISE EXCEPTION 'Chỉ nghiệm thu khi việc đã báo 100%%';
--       END IF;
--       IF p_actor_nhan_su_id IS NOT NULL
--          AND p_actor_nhan_su_id IS NOT DISTINCT FROM v_cv.nguoi_phu_trach_id
--          AND NOT EXISTS (
--            SELECT 1
--            FROM public.mdm_nhan_su ns
--            JOIN public.v_sys_user_permissions v ON v.auth_user_id = ns.auth_user_id
--            WHERE ns.id = p_actor_nhan_su_id
--              AND v.roles ? 'ADMIN'
--          )
--       THEN
--         RAISE EXCEPTION 'Không được tự nghiệm thu việc mình phụ trách.';
--       END IF;
--       v_next := 'HOAN_THANH'; v_loai_hd := 'HOAN_THANH';
--       v_noi_dung := coalesce(nullif(trim(p_ly_do), ''), 'Đã nghiệm thu và đóng công việc.');
--       UPDATE public.qlcv_fact_cong_viec SET trang_thai = v_next, phan_tram_hoan_thanh = 100, updated_at = now()
--       WHERE id = p_cong_viec_id AND trang_thai = v_cv.trang_thai RETURNING id INTO v_updated_id;
--       v_pct := 100;
--
--     WHEN 'TU_CHOI_NGHIEM_THU' THEN
--       IF upper(coalesce(v_cv.loai_cong_viec, '')) = 'DINH_KY' THEN
--         RAISE EXCEPTION 'Việc định kỳ (DINH_KY) không dùng từ chối nghiệm thu.';
--       END IF;
--       IF NOT (
--         v_cv.trang_thai = 'CHO_DUYET' OR v_cv.trang_thai = 'CHO_XAC_NHAN_HOAN_THANH'
--         OR (v_cv.trang_thai IN ('DANG_LAM', 'DANG_THUC_HIEN', 'QUA_HAN') AND v_pct >= 100)
--       ) THEN RAISE EXCEPTION 'Công việc không ở trạng thái chờ nghiệm thu'; END IF;
--       v_next := 'TU_CHOI'; v_loai_hd := 'TU_CHOI_HOAN_THANH';
--       v_noi_dung := 'Nghiệm thu không đạt — trả làm lại: ' || coalesce(nullif(trim(p_ly_do), ''), 'Không có');
--       UPDATE public.qlcv_fact_cong_viec SET trang_thai = v_next, updated_at = now()
--       WHERE id = p_cong_viec_id AND trang_thai = v_cv.trang_thai RETURNING id INTO v_updated_id;
--
--     WHEN 'HUY' THEN
--       IF v_cv.trang_thai IN ('HOAN_THANH', 'DA_HUY') THEN RAISE EXCEPTION 'Công việc đã hoàn thành hoặc đã hủy'; END IF;
--       v_next := 'DA_HUY'; v_loai_hd := 'CAP_NHAT';
--       v_noi_dung := coalesce(nullif(trim(p_ly_do), ''), 'Hủy công việc');
--       UPDATE public.qlcv_fact_cong_viec SET trang_thai = v_next, updated_at = now()
--       WHERE id = p_cong_viec_id AND trang_thai = v_cv.trang_thai RETURNING id INTO v_updated_id;
--
--     WHEN 'PHE_DUYET_DEXUAT' THEN
--       IF v_cv.is_active = true OR v_cv.trang_thai = 'DA_HUY' THEN RAISE EXCEPTION 'Không phải đề xuất chờ duyệt'; END IF;
--       v_next := coalesce(nullif(p_patch->>'trang_thai', ''), 'MOI'); v_loai_hd := 'PHE_DUYET';
--       v_noi_dung := coalesce(nullif(p_patch->>'noi_dung_hoat_dong', ''), 'Đã phê duyệt đề xuất');
--       UPDATE public.qlcv_fact_cong_viec SET
--         trang_thai = v_next, is_active = true,
--         tieu_de = coalesce(nullif(p_patch->>'tieu_de', ''), tieu_de),
--         mo_ta = CASE WHEN p_patch ? 'mo_ta' THEN p_patch->>'mo_ta' ELSE mo_ta END,
--         loai_cong_viec = coalesce(nullif(p_patch->>'loai_cong_viec', ''), loai_cong_viec),
--         muc_do_uu_tien = coalesce(nullif(p_patch->>'muc_do_uu_tien', ''), muc_do_uu_tien),
--         han_hoan_thanh = CASE WHEN p_patch ? 'han_hoan_thanh' AND nullif(p_patch->>'han_hoan_thanh', '') IS NOT NULL
--           THEN (p_patch->>'han_hoan_thanh')::date ELSE han_hoan_thanh END,
--         nguoi_phu_trach_id = CASE WHEN p_patch ? 'nguoi_phu_trach_id' AND nullif(p_patch->>'nguoi_phu_trach_id', '') IS NOT NULL
--           THEN (p_patch->>'nguoi_phu_trach_id')::uuid ELSE nguoi_phu_trach_id END,
--         to_cong_tac_id = CASE WHEN p_patch ? 'to_cong_tac_id' AND nullif(p_patch->>'to_cong_tac_id', '') IS NOT NULL
--           THEN (p_patch->>'to_cong_tac_id')::uuid ELSE to_cong_tac_id END,
--         nguoi_giao_viec_id = CASE WHEN p_patch ? 'nguoi_giao_viec_id' AND nullif(p_patch->>'nguoi_giao_viec_id', '') IS NOT NULL
--           THEN (p_patch->>'nguoi_giao_viec_id')::uuid ELSE nguoi_giao_viec_id END,
--         updated_at = now()
--       WHERE id = p_cong_viec_id AND is_active = false AND trang_thai IS DISTINCT FROM 'DA_HUY'
--       RETURNING id INTO v_updated_id;
--
--     WHEN 'TU_CHOI_DEXUAT' THEN
--       IF v_cv.is_active = true OR v_cv.trang_thai = 'DA_HUY' THEN RAISE EXCEPTION 'Không phải đề xuất chờ duyệt'; END IF;
--       v_next := 'DA_HUY'; v_loai_hd := 'PHE_DUYET';
--       v_noi_dung := 'Đã từ chối đề xuất. Lý do: ' || coalesce(nullif(trim(p_ly_do), ''), 'Không có');
--       UPDATE public.qlcv_fact_cong_viec SET trang_thai = v_next, is_active = false, updated_at = now()
--       WHERE id = p_cong_viec_id AND is_active = false AND trang_thai IS DISTINCT FROM 'DA_HUY'
--       RETURNING id INTO v_updated_id;
--
--     WHEN 'SET_TRANG_THAI' THEN
--       v_next := upper(nullif(p_patch->>'next_trang_thai', ''));
--       IF v_next IS NULL THEN RAISE EXCEPTION 'Thiếu next_trang_thai'; END IF;
--       IF upper(coalesce(v_cv.loai_cong_viec, '')) = 'DINH_KY' THEN
--         IF v_next = 'CHO_DUYET' THEN
--           RAISE EXCEPTION 'Việc định kỳ (DINH_KY) không vào CHO_DUYET — dùng HOAN_THANH khi đủ 100%%.';
--         END IF;
--         IF v_next = 'HOAN_THANH' AND v_pct < 100 THEN
--           RAISE EXCEPTION 'DINH_KY chỉ hoàn thành khi đủ 100%%.';
--         END IF;
--       ELSE
--         IF v_next = 'HOAN_THANH' THEN
--           RAISE EXCEPTION 'DOT/KHAN chỉ đóng qua NGHIEM_THU — không SET_TRANG_THAI → HOAN_THANH.';
--         END IF;
--         IF v_next = 'CHO_DUYET' AND v_pct < 100 THEN
--           RAISE EXCEPTION 'Chỉ vào CHO_DUYET khi đã báo 100%%.';
--         END IF;
--       END IF;
--       IF v_next = 'HOAN_THANH' AND v_from IN ('DA_HUY') THEN
--         RAISE EXCEPTION 'Không mở lại việc đã hủy thành HOAN_THANH.';
--       END IF;
--       v_loai_hd := coalesce(nullif(p_patch->>'loai_hoat_dong', ''), 'CAP_NHAT');
--       v_noi_dung := coalesce(nullif(trim(p_ly_do), ''), 'Cập nhật trạng thái');
--       UPDATE public.qlcv_fact_cong_viec SET
--         trang_thai = v_next, updated_at = now(),
--         phan_tram_hoan_thanh = CASE WHEN p_patch ? 'phan_tram_hoan_thanh'
--           THEN (p_patch->>'phan_tram_hoan_thanh')::integer ELSE phan_tram_hoan_thanh END
--       WHERE id = p_cong_viec_id AND (
--         nullif(p_patch->>'current_trang_thai', '') IS NULL OR trang_thai = p_patch->>'current_trang_thai'
--       ) RETURNING id INTO v_updated_id;
--       IF p_patch ? 'phan_tram_hoan_thanh' THEN v_pct := (p_patch->>'phan_tram_hoan_thanh')::integer; END IF;
--
--     ELSE RAISE EXCEPTION 'Action không hợp lệ: %', p_action;
--   END CASE;
--
--   IF v_updated_id IS NULL THEN RAISE EXCEPTION 'Trạng thái công việc đã thay đổi hoặc không cập nhật được'; END IF;
--
--   PERFORM public.fn_qlcv_append_nhat_ky(
--     p_cong_viec_id, v_loai_hd, p_actor_nhan_su_id, v_noi_dung, v_next, v_pct
--   );
--
--   RETURN jsonb_build_object('id', v_updated_id, 'trang_thai', v_next);
-- END;
-- $function$;
