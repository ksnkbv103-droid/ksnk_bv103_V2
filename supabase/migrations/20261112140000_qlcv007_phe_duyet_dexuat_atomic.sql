-- CHƯA APPLY PROD — chờ PO.
--
-- QLCV-007: phê duyệt đề xuất không nguyên tử.
-- Lỗi: updateCongViec (cong-viec.actions.ts) UPDATE riêng 7 cột mở rộng rồi mới gọi
-- fn_qlcv_transition('PHE_DUYET_DEXUAT'); RPC lỗi → đề xuất đã bị sửa mà chưa được duyệt.
-- Sửa: nhánh PHE_DUYET_DEXUAT ghi thêm 7 cột (dia_diem_khoa_id, dia_diem_khoa_ids, nhiem_vu_id,
-- nhom_chuyen_mon_id, vi_tri_thuc_hien, nguoi_phoi_hop_ids, nguoi_theo_doi_ids) khi khóa có
-- trong p_patch (khóa có mặt → ghi, kể cả null/mảng rỗng; khóa vắng → giữ nguyên). Cùng một
-- UPDATE với phê duyệt → nguyên tử. Trigger trg_a_qlcv_sync_dia_diem_khoa_ids vẫn chuẩn hóa
-- cặp dia_diem_khoa_id/ids như UPDATE trực tiếp trước đây.
-- Không thêm kiểm quyền/quy tắc mới. Giữ chữ ký, SECURITY DEFINER, search_path, mọi nhánh khác.
-- CREATE OR REPLACE giữ ACL (postgres + service_role) — không GRANT thêm.
-- Phạm vi đã rà: 3 nơi gọi PHE_DUYET_DEXUAT (cong-viec.actions.ts updateCongViec;
-- dexuat.actions.ts ×2 — không gửi 7 khóa nên hành vi không đổi).
-- Gốc: pg_get_functiondef trên DB local 2026-11-12 (trùng 20261111200000).
-- Khôi phục: chạy lại khối CREATE OR REPLACE trong 20261111200000_qlcv003_nghiem_thu_khong_tu_nghiem_thu.sql.
--
-- SQL kiểm prod (chỉ đọc):
--   SELECT position('nguoi_theo_doi_ids = CASE WHEN p_patch' in pg_get_functiondef(
--     'public.fn_qlcv_transition(uuid,text,uuid,text,jsonb)'::regprocedure)) > 0 AS da_co_qlcv007,
--     (SELECT proacl FROM pg_proc WHERE oid = 'public.fn_qlcv_transition(uuid,text,uuid,text,jsonb)'::regprocedure) AS acl;

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
        -- QLCV-007: 7 cột mở rộng ghi cùng lần phê duyệt (khóa có mặt → ghi, kể cả null/mảng rỗng).
        dia_diem_khoa_id = CASE WHEN p_patch ? 'dia_diem_khoa_id'
          THEN nullif(p_patch->>'dia_diem_khoa_id', '')::uuid ELSE dia_diem_khoa_id END,
        dia_diem_khoa_ids = CASE WHEN p_patch ? 'dia_diem_khoa_ids'
          THEN CASE WHEN jsonb_typeof(p_patch->'dia_diem_khoa_ids') = 'array'
            THEN ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(p_patch->'dia_diem_khoa_ids') AS x)
            ELSE '{}'::uuid[] END
          ELSE dia_diem_khoa_ids END,
        nhiem_vu_id = CASE WHEN p_patch ? 'nhiem_vu_id'
          THEN nullif(p_patch->>'nhiem_vu_id', '')::uuid ELSE nhiem_vu_id END,
        nhom_chuyen_mon_id = CASE WHEN p_patch ? 'nhom_chuyen_mon_id'
          THEN nullif(p_patch->>'nhom_chuyen_mon_id', '')::uuid ELSE nhom_chuyen_mon_id END,
        vi_tri_thuc_hien = CASE WHEN p_patch ? 'vi_tri_thuc_hien'
          THEN nullif(btrim(p_patch->>'vi_tri_thuc_hien'), '') ELSE vi_tri_thuc_hien END,
        nguoi_phoi_hop_ids = CASE WHEN p_patch ? 'nguoi_phoi_hop_ids'
          THEN CASE WHEN jsonb_typeof(p_patch->'nguoi_phoi_hop_ids') = 'array'
            THEN ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(p_patch->'nguoi_phoi_hop_ids') AS x)
            ELSE '{}'::uuid[] END
          ELSE nguoi_phoi_hop_ids END,
        nguoi_theo_doi_ids = CASE WHEN p_patch ? 'nguoi_theo_doi_ids'
          THEN CASE WHEN jsonb_typeof(p_patch->'nguoi_theo_doi_ids') = 'array'
            THEN ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(p_patch->'nguoi_theo_doi_ids') AS x)
            ELSE '{}'::uuid[] END
          ELSE nguoi_theo_doi_ids END,
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
