-- Lát S4-DB / plan C′: các hàm/view đọc-ghi BOM theo bộ chuyển sang thành phần hiệu lực.
-- Additive. Không đổi chữ ký, SECURITY, search_path, ACL của đối tượng có sẵn. Không di chuyển dữ liệu.
-- Phải đúng ở CẢ hai trạng thái: trước S2 (dòng cũ còn trên bộ con) và sau S2 (mọi dòng trên bộ tổng).
--
-- Quyết định từng đối tượng:
--   fn_cssd_apply_bom_lines_tx  ĐỔI  bộ con CN/KCN → ghi bộ tổng; phạm vi dòng = cả họ (tổng + con CN/KCN).
--   fn_cssd_apply_bom_plan_tx   ĐỔI  như trên (chốt chặn DB; TS đã quy về tổng ở S4a).
--   fn_cssd_ensure_bom_lines    ĐỔI  quy trình chạy trên bộ con → khuôn mẫu lấy từ thành phần hiệu lực.
--   fn_cssd_me_ly_do_lech_phuong_phap ĐỔI  nạp mẻ theo bộ con; sau S2 bộ con không còn dòng riêng → sẽ chặn nhầm.
--   v_cssd_bo_dung_cu_summary   ĐỔI  so_khoan/tong_so_luong_dung_cu chỉ hiển thị theo từng bộ (nhãn, danh mục),
--                                    không bị cộng dồn qua bộ → đọc thành phần hiệu lực.
--   fn_cssd_check_set_heat_resistance GIỮ  không còn caller (src/DB).
--   v_cssd_bo_heat_split_hint   GIỮ  không còn caller (src/DB).
--   v_cssd_bo_dung_cu_chi_tiet_full GIỮ  view dòng vật lý (id = chi_tiet.id) cho export/import/tìm kiếm/CRUD;
--                                    thêm dòng dẫn xuất sẽ trùng id và vỡ re-import (23514).
--   v_cssd_bo_dung_cu_chi_tiet_realtime GIỮ  được cộng tồn theo loại trên bộ active (đếm đôi nếu dẫn xuất).
--   v_cssd_bo_thanh_phan_hieu_luc_realtime MỚI  cùng cột realtime, bo_dung_cu_id = bộ được hỏi (cho đối chiếu
--                                    cấu phần theo bộ); KHÔNG dùng để cộng tồn.

-- 1. fn_cssd_apply_bom_lines_tx --------------------------------------------------------------------
-- Khác bản 20261021010000: v_tong (bộ ghi) + phạm vi họ ở 4c/5a/5b; INSERT lên v_tong; kết quả thêm 'bo_ghi_id'.
CREATE OR REPLACE FUNCTION public.fn_cssd_apply_bom_lines_tx(p_incident_id uuid, p_approver_auth_user_id uuid, p_approver_is_admin boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  c_claimed constant text := 'Phiếu đã được xử lý hoặc không còn chờ duyệt.';
  v_inc public.cssd_fact_su_co%ROWTYPE;
  v_attrs jsonb;
  v_status text;
  v_snap jsonb;
  v_lines jsonb;
  v_bo uuid;
  v_tong uuid;
  v_ho uuid[];
  v_ap_ns uuid;
  v_ns_count int;
  v_rq_ns text;
  v_rq_auth text;
  v_line jsonb;
  v_kind text;
  v_label text;
  v_id text;
  v_seen text[] := '{}';
  v_qty int;
  v_steps jsonb := '[]'::jsonb;
  v_renames jsonb := '{}'::jsonb;
  -- DOI_LOAI
  v_cur_loai text;
  v_next_ma text;
  v_next_ten text;
  v_relink boolean;
  v_code text;
  v_exist_id uuid;
  v_exist_n int;
  v_target_id uuid;
  v_target public.cssd_dm_loai_dung_cu%ROWTYPE;
  v_ten_sau text;
  v_ten_changed boolean;
  v_prev jsonb;
  -- mô phỏng
  v_init jsonb := '{}'::jsonb;
  v_state jsonb := '{}'::jsonb;
  v_added jsonb := '[]'::jsonb;
  v_row record;
  v_st jsonb;
  v_s jsonb;
  v_holder text;
  v_dest text;
  v_i int;
  v_found boolean;
  v_key text;
  v_o jsonb;
  v_patch jsonb;
  v_n_deact int := 0;
  v_n_upd int := 0;
  v_n_ins int := 0;
  v_n_ren int := 0;
  v_now timestamptz := now();
BEGIN
  IF p_incident_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu phiếu.';
  END IF;
  IF p_approver_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Phiên đăng nhập không hợp lệ.';
  END IF;

  -- 1. Khóa phiếu + kiểm trạng thái ---------------------------------------------------------
  SELECT * INTO v_inc FROM public.cssd_fact_su_co WHERE id = p_incident_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không thấy phiếu.';
  END IF;
  v_attrs := coalesce(v_inc.attributes, '{}'::jsonb);
  v_status := btrim(coalesce(v_attrs->>'SET_RECONCILE_STATUS', v_attrs->>'set_reconcile_status', ''));
  IF v_status <> 'BOM_PENDING' THEN
    RAISE EXCEPTION '%', c_claimed;
  END IF;

  -- 2. Chặn tự duyệt ------------------------------------------------------------------------
  SELECT count(*), (array_agg(id))[1] INTO v_ns_count, v_ap_ns
  FROM public.mdm_nhan_su WHERE auth_user_id = p_approver_auth_user_id;
  IF v_ns_count > 1 THEN
    RAISE EXCEPTION 'Tài khoản gắn hơn một hồ sơ nhân sự — không xác định được người duyệt.';
  END IF;
  v_rq_ns := nullif(btrim(coalesce(v_inc.nguoi_bao_id::text, v_attrs->>'NGUOI_PHAT_HIEN_ID', '')), '');
  v_rq_auth := nullif(btrim(coalesce(v_attrs->>'REPORTER_AUTH_USER_ID', '')), '');
  IF (v_ap_ns IS NOT NULL AND v_rq_ns IS NOT NULL AND v_ap_ns::text = v_rq_ns)
     OR (v_rq_auth IS NOT NULL AND p_approver_auth_user_id::text = v_rq_auth) THEN
    RAISE EXCEPTION 'Không được tự duyệt phiếu do chính mình đề nghị — nhờ người khác có quyền duyệt.';
  END IF;
  IF v_ap_ns IS NULL AND NOT coalesce(p_approver_is_admin, false) THEN
    RAISE EXCEPTION 'Tài khoản duyệt chưa gắn hồ sơ nhân sự — không ghi được người duyệt. Liên hệ quản trị gắn nhân sự trước khi duyệt.';
  END IF;

  -- 3. Ảnh phiếu ----------------------------------------------------------------------------
  v_snap := v_attrs->'SET_RECONCILE_SNAPSHOT';
  IF v_snap IS NOT NULL AND jsonb_typeof(v_snap) = 'string' THEN
    BEGIN
      v_snap := (v_snap #>> '{}')::jsonb;
    EXCEPTION WHEN others THEN
      v_snap := NULL;
    END;
  END IF;
  IF v_snap IS NULL OR jsonb_typeof(v_snap) <> 'object' OR jsonb_typeof(v_snap->'lines') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Thiếu ảnh bảng thành phần.';
  END IF;
  v_bo := nullif(btrim(coalesce(v_attrs->>'BO_DUNG_CU_ID', v_attrs->>'bo_dung_cu_id', v_snap->>'boDungCuId', '')), '')::uuid;
  IF v_bo IS NULL THEN
    RAISE EXCEPTION 'Thiếu ảnh bảng thành phần.';
  END IF;

  -- C′: bộ con CN/KCN → ghi lên bộ tổng; phạm vi dòng = bộ ghi + con CN/KCN của nó (dòng cũ trước S2).
  -- Bộ con KHONG_CHIU_NHIET_EO giữ dòng riêng (G3) → không quy.
  SELECT CASE WHEN b.parent_bo_id IS NOT NULL AND b.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
              THEN b.parent_bo_id ELSE b.id END
    INTO v_tong
    FROM public.cssd_dm_bo_dung_cu b WHERE b.id = v_bo;
  v_tong := coalesce(v_tong, v_bo);
  SELECT array_agg(x.id) INTO v_ho FROM (
    SELECT v_tong AS id
    UNION ALL
    SELECT k.id FROM public.cssd_dm_bo_dung_cu k
     WHERE k.parent_bo_id = v_tong AND k.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
  ) x;

  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_snap->'lines') l
             WHERE l->>'kind' IN ('BO_SUNG', 'TRA_KHO', 'DIEU_CHUYEN')) THEN
    RAISE EXCEPTION 'Lấy kho, trả kho và điều chuyển chỉ dùng cửa Luân chuyển trên /cssd-dung-cu — không dùng Hỏng/Mất và không dùng đề nghị danh mục.';
  END IF;
  SELECT coalesce(jsonb_agg(l ORDER BY o), '[]'::jsonb) INTO v_lines
  FROM jsonb_array_elements(v_snap->'lines') WITH ORDINALITY AS t(l, o)
  WHERE l->>'kind' IN ('DOI_CHUAN', 'DOI_LOAI', 'THEM_DONG', 'XOA_DONG');

  -- 4a. Kiểm dòng (prevalidateSetBomLines) --------------------------------------------------
  FOR v_line IN SELECT * FROM jsonb_array_elements(v_lines) LOOP
    v_kind := v_line->>'kind';
    v_label := coalesce(nullif(btrim(coalesce(v_line->>'tenDungCuLe', '')), ''), 'Dòng');
    v_id := btrim(coalesce(v_line->>'chiTietId', ''));
    IF v_kind IN ('DOI_CHUAN', 'DOI_LOAI', 'XOA_DONG') THEN
      IF v_id = '' THEN RAISE EXCEPTION '%: thiếu dòng thành phần.', v_label; END IF;
      IF v_id = ANY (v_seen) THEN
        RAISE EXCEPTION '%: một dòng thành phần có nhiều đề nghị trong cùng phiếu.', v_label;
      END IF;
      v_seen := v_seen || v_id;
    END IF;
    IF v_kind = 'DOI_CHUAN' THEN
      v_qty := floor(CASE WHEN btrim(coalesce(v_line->>'soLuongChuanDeXuat', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
                          THEN (v_line->>'soLuongChuanDeXuat')::numeric END);
      IF v_qty IS NULL OR v_qty < 1 THEN RAISE EXCEPTION '%: số chuẩn đề nghị phải ≥ 1.', v_label; END IF;
    ELSIF v_kind = 'DOI_LOAI' THEN
      IF btrim(coalesce(v_line->>'loaiDungCuId', '')) = '' THEN RAISE EXCEPTION '%: thiếu loại hiện tại.', v_label; END IF;
      IF btrim(coalesce(v_line->>'maLoaiDeXuat', '')) = '' AND btrim(coalesce(v_line->>'loaiDungCuIdDeXuat', '')) = '' THEN
        RAISE EXCEPTION '%: thiếu mã loại đề nghị.', v_label;
      END IF;
    ELSIF v_kind = 'THEM_DONG' THEN
      IF btrim(coalesce(v_line->>'loaiDungCuId', '')) = '' THEN RAISE EXCEPTION '%: thêm dòng cần loại dụng cụ.', v_label; END IF;
      IF btrim(coalesce(v_line->>'tenDungCuLe', '')) = '' THEN RAISE EXCEPTION 'Thêm dòng cần tên dụng cụ.'; END IF;
      v_qty := floor(CASE WHEN btrim(coalesce(v_line->>'soLuongChuan', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
                          THEN (v_line->>'soLuongChuan')::numeric END);
      IF v_qty IS NULL OR v_qty < 1 THEN RAISE EXCEPTION '%: thêm dòng cần số chuẩn ≥ 1.', v_label; END IF;
    END IF;
  END LOOP;

  -- 4b. Lập bước + giải DOI_LOAI (resolveDoiLoaiLine) ---------------------------------------
  FOR v_line IN SELECT * FROM jsonb_array_elements(v_lines) LOOP
    v_kind := v_line->>'kind';
    v_label := coalesce(nullif(v_line->>'tenDungCuLe', ''), 'Dòng');
    IF v_kind = 'DOI_CHUAN' THEN
      v_steps := v_steps || jsonb_build_array(jsonb_build_object(
        'kind', 'CHUAN', 'chiTietId', btrim(v_line->>'chiTietId'),
        'soLuong', floor((v_line->>'soLuongChuanDeXuat')::numeric)::int, 'label', v_label));
    ELSIF v_kind = 'XOA_DONG' THEN
      v_steps := v_steps || jsonb_build_array(jsonb_build_object(
        'kind', 'XOA', 'chiTietId', btrim(v_line->>'chiTietId'), 'label', v_label));
    ELSIF v_kind = 'THEM_DONG' THEN
      v_steps := v_steps || jsonb_build_array(jsonb_build_object(
        'kind', 'THEM', 'loaiId', btrim(v_line->>'loaiDungCuId'), 'ten', btrim(v_line->>'tenDungCuLe'),
        'soLuong', floor((v_line->>'soLuongChuan')::numeric)::int, 'label', v_label));
    ELSIF v_kind = 'DOI_LOAI' THEN
      v_id := btrim(coalesce(v_line->>'chiTietId', ''));
      v_cur_loai := btrim(coalesce(v_line->>'loaiDungCuId', ''));
      v_next_ma := upper(btrim(coalesce(v_line->>'maLoaiDeXuat', '')));
      v_next_ten := btrim(coalesce(v_line->>'tenDungCuLeDeXuat', ''));
      v_relink := btrim(coalesce(v_line->>'loaiDungCuIdDeXuat', '')) <> ''
                  AND btrim(v_line->>'loaiDungCuIdDeXuat') <> v_cur_loai;
      IF v_id = '' OR v_cur_loai = '' OR (v_next_ma = '' AND NOT v_relink) THEN
        RAISE EXCEPTION '%: thiếu dữ liệu đổi mã loại.', coalesce(v_line->>'tenDungCuLe', '');
      END IF;

      v_exist_id := NULL;
      v_code := replace(replace(v_next_ma, '%', ''), '_', '');
      IF v_next_ma <> '' AND v_code <> '' THEN
        SELECT count(*), (array_agg(id))[1] INTO v_exist_n, v_exist_id
        FROM public.cssd_dm_loai_dung_cu
        WHERE is_active = true AND lower(ma_loai) = lower(v_code);
        IF v_exist_n > 1 THEN
          RAISE EXCEPTION 'Mã loại % trùng hơn một dòng danh mục — sửa tại Quản trị trước khi duyệt.', v_code;
        END IF;
      END IF;

      v_target_id := v_cur_loai::uuid;
      IF v_relink THEN
        v_target_id := btrim(v_line->>'loaiDungCuIdDeXuat')::uuid;
      ELSIF v_exist_id IS NOT NULL AND v_exist_id::text <> v_cur_loai THEN
        v_target_id := v_exist_id;
      END IF;

      SELECT * INTO v_target FROM public.cssd_dm_loai_dung_cu
      WHERE id = v_target_id AND is_active = true
      FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION '%: loại đề nghị không còn hiệu lực.', coalesce(v_line->>'tenDungCuLe', '');
      END IF;

      v_ten_sau := coalesce(nullif(v_next_ten, ''), nullif(v_target.ten_loai, ''), v_line->>'tenDungCuLe');
      v_ten_changed := v_next_ten <> '' AND v_next_ten <> btrim(coalesce(v_target.ten_loai, ''));
      IF v_next_ma <> ''
         AND (v_next_ma <> upper(btrim(coalesce(v_target.ma_loai, ''))) OR v_ten_changed)
         AND v_target.id::text = v_cur_loai
         AND NOT v_relink THEN
        IF v_exist_id IS NOT NULL AND v_exist_id <> v_target.id THEN
          RAISE EXCEPTION '%: mã % đã thuộc loại khác. Chọn loại đó trên phiếu, không đổi mã gốc trùng.',
            coalesce(v_line->>'tenDungCuLe', ''), v_next_ma;
        END IF;
        v_prev := v_renames->(v_target.id::text);
        IF v_prev IS NOT NULL AND (v_prev->>'ma' <> v_next_ma OR v_prev->>'ten' <> v_ten_sau) THEN
          RAISE EXCEPTION '%: phiếu đổi cùng một loại thành hai mã/tên khác nhau.', v_label;
        END IF;
        v_renames := v_renames || jsonb_build_object(v_target.id::text, jsonb_build_object(
          'ma', v_next_ma, 'ten', v_ten_sau,
          'specs', CASE WHEN jsonb_typeof(v_target.specs) = 'object' THEN v_target.specs ELSE '{}'::jsonb END));
      END IF;

      v_steps := v_steps || jsonb_build_array(jsonb_build_object(
        'kind', 'DOI_LOAI', 'chiTietId', v_id, 'currentLoaiId', v_cur_loai,
        'targetLoaiId', v_target.id::text, 'ten', v_ten_sau, 'label', v_label));
    END IF;
  END LOOP;

  -- 4c. Ảnh BOM active của họ (khóa) + mô phỏng (planSetBomWrites) ---------------------------
  FOR v_row IN
    SELECT id, loai_dung_cu_id, so_luong FROM public.cssd_dm_bo_dung_cu_chi_tiet
    WHERE bo_dung_cu_id = ANY (v_ho) AND is_active = true
    ORDER BY id
    FOR UPDATE
  LOOP
    v_init := v_init || jsonb_build_object(v_row.id::text, jsonb_build_object(
      'loai', coalesce(v_row.loai_dung_cu_id::text, ''),
      'qty', greatest(0, coalesce(v_row.so_luong, 0)),
      'active', true));
  END LOOP;
  v_state := v_init;

  FOR v_st IN SELECT * FROM jsonb_array_elements(v_steps) LOOP
    IF v_st->>'kind' = 'THEM' THEN
      SELECT k INTO v_holder FROM jsonb_each(v_state) AS e(k, v)
      WHERE (v->>'active')::boolean AND v->>'loai' = v_st->>'loaiId' LIMIT 1;
      IF v_holder IS NOT NULL THEN
        v_state := jsonb_set(v_state, ARRAY[v_holder, 'qty'],
          to_jsonb((v_state->v_holder->>'qty')::int + (v_st->>'soLuong')::int));
      ELSE
        v_found := false;
        FOR v_i IN 0 .. jsonb_array_length(v_added) - 1 LOOP
          IF v_added->v_i->>'loaiId' = v_st->>'loaiId' THEN
            v_added := jsonb_set(v_added, ARRAY[v_i::text, 'soLuong'],
              to_jsonb((v_added->v_i->>'soLuong')::int + (v_st->>'soLuong')::int));
            v_found := true;
            EXIT;
          END IF;
        END LOOP;
        IF NOT v_found THEN
          v_added := v_added || jsonb_build_array(jsonb_build_object(
            'loaiId', v_st->>'loaiId', 'ten', v_st->>'ten', 'soLuong', (v_st->>'soLuong')::int));
        END IF;
      END IF;
      CONTINUE;
    END IF;

    v_key := v_st->>'chiTietId';
    v_s := v_state->v_key;
    IF v_s IS NULL OR NOT (v_s->>'active')::boolean THEN
      RAISE EXCEPTION '%: dòng không còn trong bộ (đã đổi trong lúc chờ duyệt).', v_st->>'label';
    END IF;
    IF v_st->>'kind' = 'CHUAN' THEN
      v_state := jsonb_set(v_state, ARRAY[v_key, 'qty'], v_st->'soLuong');
    ELSIF v_st->>'kind' = 'XOA' THEN
      v_state := jsonb_set(v_state, ARRAY[v_key, 'active'], 'false'::jsonb);
    ELSE
      IF v_s->>'loai' <> v_st->>'currentLoaiId' THEN
        RAISE EXCEPTION '%: loại của dòng đã đổi trong lúc chờ duyệt — lập phiếu mới.', v_st->>'label';
      END IF;
      IF v_st->>'targetLoaiId' = v_s->>'loai' THEN
        v_state := jsonb_set(v_state, ARRAY[v_key, 'ten'], v_st->'ten');
        CONTINUE;
      END IF;
      v_dest := NULL;
      SELECT k INTO v_dest FROM jsonb_each(v_state) AS e(k, v)
      WHERE (v->>'active')::boolean AND v->>'loai' = v_st->>'targetLoaiId' AND k <> v_key LIMIT 1;
      IF v_dest IS NOT NULL THEN
        -- GỘP: cộng số lượng vào dòng đích, tắt dòng nguồn.
        v_state := jsonb_set(v_state, ARRAY[v_dest, 'qty'],
          to_jsonb((v_state->v_dest->>'qty')::int + (v_s->>'qty')::int));
        v_state := jsonb_set(v_state, ARRAY[v_key, 'active'], 'false'::jsonb);
      ELSIF EXISTS (SELECT 1 FROM jsonb_array_elements(v_added) a WHERE a->>'loaiId' = v_st->>'targetLoaiId') THEN
        RAISE EXCEPTION '%: loại đích đang được thêm mới trong cùng phiếu.', v_st->>'label';
      ELSE
        v_state := jsonb_set(v_state, ARRAY[v_key, 'loai'], to_jsonb(v_st->>'targetLoaiId'));
        v_state := jsonb_set(v_state, ARRAY[v_key, 'ten'], v_st->'ten');
      END IF;
    END IF;
    v_holder := NULL;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_added) a
    JOIN jsonb_each(v_state) AS e(k, v) ON (v->>'active')::boolean AND v->>'loai' = a->>'loaiId'
  ) THEN
    RAISE EXCEPTION 'Thêm dòng trùng loại đã có trong bộ.';
  END IF;

  -- Đổi chéo loại giữa hai dòng: chặn, tách hai phiếu.
  IF EXISTS (
    SELECT 1
    FROM jsonb_each(v_state) AS s(k, v)
    JOIN jsonb_each(v_init) AS o(k, v) ON o.k = s.k
    WHERE (s.v->>'active')::boolean AND s.v->>'loai' <> o.v->>'loai'
      AND EXISTS (
        SELECT 1 FROM jsonb_each(v_init) AS p(k, v)
        WHERE p.v->>'loai' = s.v->>'loai' AND p.k <> s.k AND (v_state->p.k->>'active')::boolean)
  ) THEN
    RAISE EXCEPTION 'Phiếu đổi chéo loại giữa hai dòng — tách thành hai phiếu.';
  END IF;

  -- 5. Ghi theo thứ tự an toàn với unique index ----------------------------------------------
  -- 5a. Xóa mềm
  FOR v_key IN SELECT k FROM jsonb_each(v_state) AS e(k, v) WHERE NOT (v->>'active')::boolean LOOP
    UPDATE public.cssd_dm_bo_dung_cu_chi_tiet
    SET is_active = false, updated_at = v_now
    WHERE id = v_key::uuid AND bo_dung_cu_id = ANY (v_ho);
    v_n_deact := v_n_deact + 1;
  END LOOP;
  -- 5b. Sửa cùng loại, 5c. Đổi loại
  FOR v_i IN 0 .. 1 LOOP
    FOR v_key, v_s IN SELECT k, v FROM jsonb_each(v_state) AS e(k, v) WHERE (v->>'active')::boolean LOOP
      v_o := v_init->v_key;
      IF (v_i = 0) <> (v_s->>'loai' = v_o->>'loai') THEN CONTINUE; END IF;
      IF (v_s->>'qty')::int = (v_o->>'qty')::int AND NOT (v_s ? 'ten') AND v_s->>'loai' = v_o->>'loai' THEN
        CONTINUE;
      END IF;
      UPDATE public.cssd_dm_bo_dung_cu_chi_tiet
      SET so_luong = CASE WHEN (v_s->>'qty')::int <> (v_o->>'qty')::int THEN (v_s->>'qty')::int ELSE so_luong END,
          loai_dung_cu_id = CASE WHEN v_s->>'loai' <> v_o->>'loai' THEN (v_s->>'loai')::uuid ELSE loai_dung_cu_id END,
          ten_dung_cu_le = CASE WHEN v_s ? 'ten' THEN v_s->>'ten' ELSE ten_dung_cu_le END,
          ten_chi_tiet = CASE WHEN v_s ? 'ten' THEN v_s->>'ten' ELSE ten_chi_tiet END,
          updated_at = v_now
      WHERE id = v_key::uuid AND bo_dung_cu_id = ANY (v_ho);
      v_n_upd := v_n_upd + 1;
    END LOOP;
  END LOOP;
  -- 5d. Thêm (luôn lên bộ ghi = bộ tổng nếu phiếu lập trên bộ con CN/KCN)
  FOR v_st IN SELECT * FROM jsonb_array_elements(v_added) LOOP
    INSERT INTO public.cssd_dm_bo_dung_cu_chi_tiet
      (bo_dung_cu_id, loai_dung_cu_id, ten_dung_cu_le, ten_chi_tiet, so_luong, is_active, updated_at, specs)
    VALUES
      (v_tong, (v_st->>'loaiId')::uuid, v_st->>'ten', v_st->>'ten', (v_st->>'soLuong')::int, true, v_now,
       jsonb_build_object('ma_chi_tiet',
         'DC-R' || upper(substr(md5(gen_random_uuid()::text), 1, 6))));
    v_n_ins := v_n_ins + 1;
  END LOOP;
  -- 5e. Đổi mã/tên loại toàn cục sau cùng
  FOR v_key, v_s IN SELECT k, v FROM jsonb_each(v_renames) AS e(k, v) LOOP
    UPDATE public.cssd_dm_loai_dung_cu
    SET ma_loai = v_s->>'ma',
        ten_loai = v_s->>'ten',
        specs = (v_s->'specs') || jsonb_build_object('ma_loai_dung_cu', v_s->>'ma', 'ten_loai_dung_cu', v_s->>'ten'),
        updated_at = v_now
    WHERE id = v_key::uuid;
    v_n_ren := v_n_ren + 1;
  END LOOP;

  -- 6. Chốt phiếu ---------------------------------------------------------------------------
  UPDATE public.cssd_fact_su_co
  SET attributes = v_attrs || jsonb_build_object('SET_RECONCILE_STATUS', 'BOM_APPROVED'),
      nguoi_xac_nhan_id = coalesce(v_ap_ns, nguoi_xac_nhan_id),
      updated_at = v_now
  WHERE id = p_incident_id;

  RETURN jsonb_build_object(
    'incident_id', p_incident_id,
    'bo_dung_cu_id', v_bo,
    'bo_ghi_id', v_tong,
    'status', 'BOM_APPROVED',
    'approved_by_id', v_ap_ns,
    'deactivated', v_n_deact,
    'updated', v_n_upd,
    'inserted', v_n_ins,
    'renamed', v_n_ren);
END;
$function$;
-- ACL giữ nguyên (CREATE OR REPLACE không đổi proacl): postgres, service_role.

-- 2. fn_cssd_apply_bom_plan_tx ---------------------------------------------------------------------
-- Khác bản 20261105120000: p_bo_id con CN/KCN → ghi bộ tổng; deactivate/update nhận dòng trong cả họ; INSERT lên tổng.
CREATE OR REPLACE FUNCTION public.fn_cssd_apply_bom_plan_tx(p_bo_id uuid, p_writes jsonb, p_now timestamp with time zone DEFAULT clock_timestamp())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_w jsonb;
  v_type text;
  v_id uuid;
  v_patch jsonb;
  v_row jsonb;
  v_count int := 0;
  v_state text;
  v_msg text;
  v_detail text;
  v_hint text;
  v_tong uuid;
  v_ho uuid[];
BEGIN
  IF p_bo_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu mã bộ đích.' USING ERRCODE = '22004';
  END IF;

  -- C′: bộ con CN/KCN → ghi lên bộ tổng; dòng sửa/tắt được nằm trong họ (dòng cũ trên con trước S2).
  SELECT CASE WHEN b.parent_bo_id IS NOT NULL AND b.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
              THEN b.parent_bo_id ELSE b.id END
    INTO v_tong
    FROM public.cssd_dm_bo_dung_cu b WHERE b.id = p_bo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy bộ dụng cụ đích %.', p_bo_id USING ERRCODE = 'P0002';
  END IF;
  -- Khóa theo thứ tự tổng → con, khớp fn_cssd_dong_bo_tach_nhiet_core (tránh deadlock).
  PERFORM 1 FROM public.cssd_dm_bo_dung_cu WHERE id = v_tong FOR UPDATE;
  IF v_tong <> p_bo_id THEN
    PERFORM 1 FROM public.cssd_dm_bo_dung_cu WHERE id = p_bo_id FOR UPDATE;
  END IF;
  SELECT array_agg(x.id) INTO v_ho FROM (
    SELECT v_tong AS id
    UNION ALL
    SELECT k.id FROM public.cssd_dm_bo_dung_cu k
     WHERE k.parent_bo_id = v_tong AND k.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
  ) x;

  FOR v_w IN SELECT * FROM jsonb_array_elements(COALESCE(p_writes, '[]'::jsonb))
  LOOP
    v_type := v_w->>'type';

    IF v_type = 'deactivate' THEN
      v_id := (v_w->>'id')::uuid;
      UPDATE public.cssd_dm_bo_dung_cu_chi_tiet
         SET is_active = false,
             updated_at = p_now
       WHERE id = v_id AND bo_dung_cu_id = ANY (v_ho);
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy dòng cấu phần % trong bộ % (deactivate).', v_id, p_bo_id
          USING ERRCODE = 'P0002';
      END IF;
      v_count := v_count + 1;

    ELSIF v_type = 'update' THEN
      v_id := (v_w->>'id')::uuid;
      v_patch := v_w->'patch';
      UPDATE public.cssd_dm_bo_dung_cu_chi_tiet
         SET so_luong = COALESCE((v_patch->>'so_luong')::int, so_luong),
             loai_dung_cu_id = CASE WHEN v_patch ? 'loai_dung_cu_id' THEN (v_patch->>'loai_dung_cu_id')::uuid ELSE loai_dung_cu_id END,
             ten_dung_cu_le = COALESCE(v_patch->>'ten_dung_cu_le', ten_dung_cu_le),
             ten_chi_tiet = COALESCE(v_patch->>'ten_chi_tiet', ten_chi_tiet),
             ghi_chu = CASE WHEN v_patch ? 'ghi_chu' THEN v_patch->>'ghi_chu' ELSE ghi_chu END,
             specs = CASE WHEN v_patch ? 'specs' THEN v_patch->'specs' ELSE specs END,
             is_active = COALESCE((v_patch->>'is_active')::boolean, is_active),
             updated_at = p_now
       WHERE id = v_id AND bo_dung_cu_id = ANY (v_ho);
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy dòng cấu phần % trong bộ % (update).', v_id, p_bo_id
          USING ERRCODE = 'P0002';
      END IF;
      v_count := v_count + 1;

    ELSIF v_type = 'insert' THEN
      v_row := v_w->'row';
      INSERT INTO public.cssd_dm_bo_dung_cu_chi_tiet (
        bo_dung_cu_id,
        loai_dung_cu_id,
        ten_dung_cu_le,
        ten_chi_tiet,
        so_luong,
        ghi_chu,
        specs,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        v_tong,
        (v_row->>'loai_dung_cu_id')::uuid,
        v_row->>'ten_dung_cu_le',
        v_row->>'ten_chi_tiet',
        COALESCE((v_row->>'so_luong')::int, 1),
        v_row->>'ghi_chu',
        COALESCE(v_row->'specs', '{}'::jsonb),
        COALESCE((v_row->>'is_active')::boolean, true),
        COALESCE((v_row->>'created_at')::timestamptz, p_now),
        p_now
      );
      v_count := v_count + 1;

    ELSE
      RAISE EXCEPTION 'Loại thao tác BOM không hợp lệ: %.', COALESCE(v_type, '<null>')
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'applied_count', v_count, 'bo_ghi_id', v_tong);
EXCEPTION WHEN OTHERS THEN
  -- Giữ SQLSTATE gốc (không ép về P0001) để caller phân biệt lỗi.
  GET STACKED DIAGNOSTICS
    v_state = RETURNED_SQLSTATE,
    v_msg = MESSAGE_TEXT,
    v_detail = PG_EXCEPTION_DETAIL,
    v_hint = PG_EXCEPTION_HINT;
  RAISE EXCEPTION USING
    ERRCODE = v_state,
    MESSAGE = 'Lỗi giao dịch cấu phần BOM: ' || v_msg,
    DETAIL = COALESCE(v_detail, ''),
    HINT = COALESCE(v_hint, '');
END;
$function$;
-- ACL giữ nguyên: postgres, service_role.

-- 3. fn_cssd_ensure_bom_lines: khuôn mẫu theo thành phần hiệu lực của bộ quy trình ----------------------
CREATE OR REPLACE FUNCTION public.fn_cssd_ensure_bom_lines(p_quy_trinh_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_meta jsonb;
  v_bo uuid;
  v_lines jsonb;
BEGIN
  SELECT COALESCE(metadata, '{}'::jsonb), bo_dung_cu_id
    INTO v_meta, v_bo
    FROM public.cssd_fact_quy_trinh
   WHERE id = p_quy_trinh_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy quy trình.';
  END IF;

  v_lines := v_meta->'bom_lines';
  IF jsonb_typeof(v_lines) = 'array' AND jsonb_array_length(v_lines) > 0 THEN
    RETURN;
  END IF;
  IF v_bo IS NULL THEN
    RAISE EXCEPTION 'Chưa gán bộ dụng cụ — không có khuôn mẫu cấu phần.';
  END IF;

  -- C′: bộ con CN/KCN không có dòng riêng → đọc thành phần hiệu lực (view chỉ trả dòng active).
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'line_key', c.id::text,
      'chi_tiet_id', c.id::text,
      'ten_dung_cu_le', COALESCE(NULLIF(trim(c.ten_dung_cu_le), ''), '—'),
      'so_luong_ke_hoach', COALESCE(c.so_luong, 1),
      'so_luong_thuc_te', COALESCE(c.so_luong, 1)
    ) ORDER BY c.created_at, c.id
  ), '[]'::jsonb)
    INTO v_lines
    FROM public.v_cssd_bo_thanh_phan_hieu_luc v
    JOIN public.cssd_dm_bo_dung_cu_chi_tiet c ON c.id = v.chi_tiet_id
   WHERE v.bo_dung_cu_id = v_bo;

  IF v_lines = '[]'::jsonb THEN
    RETURN;
  END IF;

  UPDATE public.cssd_fact_quy_trinh
     SET metadata = jsonb_set(v_meta, '{bom_lines}', v_lines, true),
         updated_at = now()
   WHERE id = p_quy_trinh_id;
END;
$function$;
-- ACL giữ nguyên: postgres, service_role.

-- 4. fn_cssd_me_ly_do_lech_phuong_phap: kiểm phương pháp theo thành phần hiệu lực ----------------------
-- Giữ SECURITY INVOKER/STABLE/ACL. View security_invoker: quyền đọc = quyền bảng nguồn như trước
-- (cssd_dm_bo_dung_cu cùng bộ quyền xem với chi_tiet); nhánh sổ kho của view bị planner bỏ (không dùng cột).
CREATE OR REPLACE FUNCTION public.fn_cssd_me_ly_do_lech_phuong_phap(p_bo_id uuid, p_phuong_phap text, p_chuong_trinh text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pp text := upper(btrim(coalesce(p_phuong_phap, '')));
  v_ct text := upper(btrim(coalesce(p_chuong_trinh, '')));
  v_cho text[];
  v_n int;
  r record;
BEGIN
  IF v_pp NOT IN ('HOI_NUOC', 'PLASMA_H2O2', 'EO') THEN
    RETURN 'Không xác định được phương pháp máy — đã chặn nạp.';
  END IF;
  IF p_bo_id IS NULL THEN
    RETURN 'Không kiểm tra được phương pháp tiệt khuẩn — đã chặn thao tác.';
  END IF;

  IF v_pp = 'HOI_NUOC' THEN
    IF v_ct ~ '(121|HN_121|STEAM_121)' THEN v_cho := ARRAY['STEAM_121'];
    ELSIF v_ct ~ '(134|HN_134|STEAM_134)' THEN v_cho := ARRAY['STEAM_134'];
    ELSE v_cho := ARRAY['STEAM_134','STEAM_121'];
    END IF;
  ELSIF v_pp = 'PLASMA_H2O2' THEN v_cho := ARRAY['PLASMA'];
  ELSE v_cho := ARRAY['EO'];
  END IF;

  SELECT count(*)::int INTO v_n
  FROM public.v_cssd_bo_thanh_phan_hieu_luc v
  WHERE v.bo_dung_cu_id = p_bo_id;
  IF v_n = 0 THEN
    RETURN 'Không kiểm tra được phương pháp tiệt khuẩn — đã chặn thao tác.';
  END IF;

  FOR r IN
    SELECT coalesce(nullif(btrim(v.ten_dung_cu_le), ''), l.ten_loai, 'cấu phần') AS ten,
           l.id AS loai_id, l.phuong_phap_cho_phep AS cho_phep
    FROM public.v_cssd_bo_thanh_phan_hieu_luc v
    LEFT JOIN public.cssd_dm_loai_dung_cu l ON l.id = v.loai_dung_cu_id
    WHERE v.bo_dung_cu_id = p_bo_id
    ORDER BY v.chi_tiet_id  -- thông báo ổn định trước/sau S2 (cùng chi_tiet_id)
  LOOP
    IF r.loai_id IS NULL OR r.cho_phep IS NULL OR cardinality(r.cho_phep) = 0 THEN
      RETURN 'Không kiểm tra được phương pháp tiệt khuẩn — đã chặn thao tác.';
    END IF;
    IF NOT (r.cho_phep && v_cho) THEN
      RETURN format('Cấu phần «%s» không được tiệt khuẩn bằng máy này (cho phép: %s) — không thêm vào mẻ. Nếu là bộ gộp, tách thành phần tại danh mục.',
                    r.ten, array_to_string(r.cho_phep, ', '));
    END IF;
  END LOOP;
  RETURN NULL;
END;
$function$;
-- ACL giữ nguyên (PUBLIC, anon, authenticated, service_role).

-- 5. v_cssd_bo_dung_cu_summary: so_khoan / tong_so_luong_dung_cu theo thành phần hiệu lực ----------------
-- Cột giữ nguyên tên/kiểu/thứ tự. Bộ tổng = cả họ; bộ con = phía nhiệt của nó. Chỉ hiển thị theo bộ.
CREATE OR REPLACE VIEW public.v_cssd_bo_dung_cu_summary
WITH (security_invoker = true) AS
 SELECT b.id,
    b.ma_bo,
    b.ten_bo,
    b.loai_dung_cu_id,
    b.khoa_su_dung_id,
    b.trang_thai,
    b.quy_cach,
    b.ghi_chu,
    b.ngay_kiem_ke_gan_nhat,
    b.is_active,
    b.created_at,
    b.updated_at,
    COALESCE(q_active.cnt, 0::bigint)::integer AS so_luong_bo,
    COALESCE(c_agg.so_khoan, 0::bigint)::integer AS so_khoan,
    COALESCE(c_agg.tong_so_luong_dung_cu, 0::bigint)::integer AS tong_so_luong_dung_cu,
    COALESCE(p_agg.tong_phan_bo, 0::bigint)::integer AS tong_phan_bo,
    b.phan_loai_bo,
    b.co_ma_dinh_danh_rieng
   FROM public.cssd_dm_bo_dung_cu b
     LEFT JOIN ( SELECT cssd_fact_quy_trinh.bo_dung_cu_id,
            count(cssd_fact_quy_trinh.id) AS cnt
           FROM public.cssd_fact_quy_trinh
          WHERE cssd_fact_quy_trinh.is_active = true AND cssd_fact_quy_trinh.tinh_trang::text IS DISTINCT FROM 'MAT'::text
          GROUP BY cssd_fact_quy_trinh.bo_dung_cu_id) q_active ON q_active.bo_dung_cu_id = b.id
     LEFT JOIN ( SELECT v.bo_dung_cu_id,
            count(DISTINCT v.chi_tiet_id) AS so_khoan,
            COALESCE(sum(v.so_luong), 0::bigint) AS tong_so_luong_dung_cu
           FROM public.v_cssd_bo_thanh_phan_hieu_luc v
          GROUP BY v.bo_dung_cu_id) c_agg ON c_agg.bo_dung_cu_id = b.id
     LEFT JOIN ( SELECT cssd_dm_bo_phan_bo.bo_dung_cu_id,
            COALESCE(sum(cssd_dm_bo_phan_bo.so_luong_hien_tai) FILTER (WHERE cssd_dm_bo_phan_bo.is_active = true), 0::bigint) AS tong_phan_bo
           FROM public.cssd_dm_bo_phan_bo
          GROUP BY cssd_dm_bo_phan_bo.bo_dung_cu_id) p_agg ON p_agg.bo_dung_cu_id = b.id;
-- ACL view giữ nguyên (CREATE OR REPLACE VIEW không đổi relacl).

-- 6. View mới: thành phần hiệu lực dạng realtime (đối chiếu cấu phần theo bộ) ------------------------------
-- Cùng cột với v_cssd_bo_dung_cu_chi_tiet_realtime; bo_dung_cu_id/ma_bo/ten_bo = bộ được hỏi (con → dòng dẫn xuất
-- từ bộ tổng). INNER JOIN loại như realtime (bỏ dòng loại NULL). Chỉ dòng active (is_active luôn true).
-- so_luong_thuc_te theo sổ kho (họ bộ tổng, loại). KHÔNG dùng để cộng tồn (mỗi dòng xuất hiện ở tổng và con).
CREATE OR REPLACE VIEW public.v_cssd_bo_thanh_phan_hieu_luc_realtime
WITH (security_invoker = true) AS
 SELECT v.chi_tiet_id,
    v.bo_dung_cu_id,
    b.ma_bo,
    b.ten_bo,
    v.loai_dung_cu_id,
    l.ma_loai AS ma_loai_dung_cu,
    l.ten_loai AS ten_loai_dung_cu,
    l.is_chiu_nhiet,
    l.phan_loai_spaulding,
    l.phuong_phap_tiet_khuan_chi_dinh AS phuong_phap_tiet_khuan,
    v.so_luong AS so_luong_tieu_chuan,
    v.so_luong_thuc_te,
    v.so_luong_thuc_te < v.so_luong AS is_missing,
    CASE WHEN v.so_luong_thuc_te < v.so_luong THEN v.so_luong - v.so_luong_thuc_te ELSE 0 END AS missing_count,
    true AS is_active,
    v.ghi_chu,
    v.bo_tong_id,
    v.nguon_bo_dung_cu_id
   FROM public.v_cssd_bo_thanh_phan_hieu_luc v
     JOIN public.cssd_dm_bo_dung_cu b ON b.id = v.bo_dung_cu_id
     JOIN public.cssd_dm_loai_dung_cu l ON l.id = v.loai_dung_cu_id;

COMMENT ON VIEW public.v_cssd_bo_thanh_phan_hieu_luc_realtime IS
  'C′: đối chiếu cấu phần theo bộ được hỏi (bộ con dẫn xuất từ bộ tổng). Cùng cột v_cssd_bo_dung_cu_chi_tiet_realtime '
  '+ bo_tong_id, nguon_bo_dung_cu_id. KHÔNG cộng tồn qua bộ (đếm đôi tổng/con) — tồn dùng v_cssd_bo_dung_cu_chi_tiet_realtime.';

-- Default privileges cấp ALL cho authenticated khi tạo view → thu lại, chỉ SELECT (khớp realtime cũ).
REVOKE ALL ON public.v_cssd_bo_thanh_phan_hieu_luc_realtime FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_cssd_bo_thanh_phan_hieu_luc_realtime TO authenticated, service_role;

-- CHƯA APPLY PROD — chờ PO. Apply SAU 20261111100000 + 20261111110000, cùng lượt với S4 TS
-- (cssd-composition-reconcile đổi sang v_cssd_bo_thanh_phan_hieu_luc_realtime). Không phụ thuộc S2.
-- Kiểm prod (chỉ đọc) trước khi apply — mong đợi: co_view_hieu_luc = 1; bo_con_eo = 0
-- (nếu > 0: dòng của con EO được tính vào thành phần bộ tổng trong summary/ensure — xem lại G3);
-- me_chan_bo_con = số bộ con active đang bị chặn nạp mẻ (sau apply nên giảm, không tăng):
--   SELECT
--     (SELECT count(*) FROM pg_views WHERE viewname = 'v_cssd_bo_thanh_phan_hieu_luc') AS co_view_hieu_luc,
--     (SELECT count(*) FROM cssd_dm_bo_dung_cu WHERE vai_tro_tach = 'KHONG_CHIU_NHIET_EO') AS bo_con_eo,
--     (SELECT count(*) FROM cssd_dm_bo_dung_cu b WHERE b.is_active AND b.parent_bo_id IS NOT NULL
--        AND fn_cssd_me_ly_do_lech_phuong_phap(b.id, 'HOI_NUOC', NULL) IS NOT NULL) AS me_chan_bo_con;
