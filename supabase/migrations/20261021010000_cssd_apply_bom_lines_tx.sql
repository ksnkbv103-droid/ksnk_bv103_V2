-- Lát KD-1 (phần còn lại) · Duyệt phiếu rà soát bộ → áp sổ chuẩn BOM trong MỘT transaction.
-- Lỗi: src/lib/master-data/cssd-set-bom-apply-core.ts `applyApprovedBomLines` ghi nhiều câu lệnh rời
-- (insert / update / đổi mã-tên loại) → lỗi giữa chừng để BOM đổi một phần, phiếu thành BOM_APPLY_FAILED.
-- Sửa: RPC fn_cssd_apply_bom_lines_tx làm trọn trong 1 transaction (all-or-nothing):
--   1. Khóa phiếu (FOR UPDATE), chỉ nhận SET_RECONCILE_STATUS = 'BOM_PENDING' (một winner).
--   2. Chặn tự duyệt (port checkCatalogApprover): người duyệt trùng người đề nghị theo nhân sự
--      (nguoi_bao_id / NGUOI_PHAT_HIEN_ID) hoặc tài khoản (REPORTER_AUTH_USER_ID) → lỗi, kể cả ADMIN.
--      Tài khoản không map nhân sự: chỉ ADMIN (p_approver_is_admin) được duyệt, nguoi_xac_nhan_id để trống.
--   3. Đọc dòng từ SET_RECONCILE_SNAPSHOT của chính phiếu (không tin dòng do client gửi), lọc
--      DOI_CHUAN/DOI_LOAI/THEM_DONG/XOA_DONG (catalogLinesOf); BO_SUNG/TRA_KHO/DIEU_CHUYEN → lỗi.
--   4. Kiểm dòng (prevalidateSetBomLines), giải DOI_LOAI (resolveDoiLoaiLine), mô phỏng + lập thứ tự ghi
--      (planSetBomWrites): xóa mềm → sửa cùng loại → đổi loại → thêm; DOI_LOAI sang loại đã có dòng active
--      trong bộ → GỘP (cộng số lượng vào dòng đích, tắt dòng nguồn) để không chạm
--      uq_cssd_bom_chi_tiet_bo_loai_active; đổi chéo loại giữa hai dòng → lỗi.
--   5. Đổi mã/tên loại toàn cục sau cùng; đặt phiếu BOM_APPROVED + nguoi_xac_nhan_id.
--   Mọi RAISE → rollback toàn bộ, phiếu giữ BOM_PENDING.
-- Quyền: SECURITY DEFINER, search_path = public, pg_temp; EXECUTE chỉ service_role
-- (action dùng createAdminSupabaseClient; quyền DC_LE/BO_DC edit kiểm ở server action).
-- TS: set-reconcile-approve.actions.ts gọi RPC này; applyApprovedBomLines (TS) không còn caller.

CREATE OR REPLACE FUNCTION public.fn_cssd_apply_bom_lines_tx(
  p_incident_id uuid,
  p_approver_auth_user_id uuid,
  p_approver_is_admin boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  c_claimed constant text := 'Phiếu đã được xử lý hoặc không còn chờ duyệt.';
  v_inc public.cssd_fact_su_co%ROWTYPE;
  v_attrs jsonb;
  v_status text;
  v_snap jsonb;
  v_lines jsonb;
  v_bo uuid;
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

  -- 4c. Ảnh BOM active của bộ (khóa) + mô phỏng (planSetBomWrites) ---------------------------
  FOR v_row IN
    SELECT id, loai_dung_cu_id, so_luong FROM public.cssd_dm_bo_dung_cu_chi_tiet
    WHERE bo_dung_cu_id = v_bo AND is_active = true
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
    WHERE id = v_key::uuid AND bo_dung_cu_id = v_bo;
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
      WHERE id = v_key::uuid AND bo_dung_cu_id = v_bo;
      v_n_upd := v_n_upd + 1;
    END LOOP;
  END LOOP;
  -- 5d. Thêm
  FOR v_st IN SELECT * FROM jsonb_array_elements(v_added) LOOP
    INSERT INTO public.cssd_dm_bo_dung_cu_chi_tiet
      (bo_dung_cu_id, loai_dung_cu_id, ten_dung_cu_le, ten_chi_tiet, so_luong, is_active, updated_at, specs)
    VALUES
      (v_bo, (v_st->>'loaiId')::uuid, v_st->>'ten', v_st->>'ten', (v_st->>'soLuong')::int, true, v_now,
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
    'status', 'BOM_APPROVED',
    'approved_by_id', v_ap_ns,
    'deactivated', v_n_deact,
    'updated', v_n_upd,
    'inserted', v_n_ins,
    'renamed', v_n_ren);
END;
$function$;

COMMENT ON FUNCTION public.fn_cssd_apply_bom_lines_tx(uuid, uuid, boolean) IS
  'KD-1: duyệt phiếu rà soát bộ BOM_PENDING → áp sổ chuẩn BOM + đổi mã/tên loại trong 1 transaction, chặn tự duyệt. Chỉ service_role.';

REVOKE ALL ON FUNCTION public.fn_cssd_apply_bom_lines_tx(uuid, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_cssd_apply_bom_lines_tx(uuid, uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.fn_cssd_apply_bom_lines_tx(uuid, uuid, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cssd_apply_bom_lines_tx(uuid, uuid, boolean) TO service_role;

-- CHƯA APPLY PROD — chờ PO.
-- SQL kiểm prod (chỉ đọc), sau khi apply:
--   SELECT p.oid::regprocedure, p.prosecdef, p.proconfig,
--          has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_exec,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
--          has_function_privilege('service_role', p.oid, 'EXECUTE')  AS svc_exec
--   FROM pg_proc p WHERE p.proname = 'fn_cssd_apply_bom_lines_tx';
--   -- kỳ vọng: prosecdef=t, search_path=public, pg_temp, anon_exec=f, auth_exec=f, svc_exec=t
-- Trước khi apply (chỉ đọc): phiếu đang chờ / kẹt sẽ đi qua RPC
--   SELECT attributes->>'SET_RECONCILE_STATUS' AS st, count(*) FROM public.cssd_fact_su_co
--   WHERE attributes ? 'SET_RECONCILE_STATUS' GROUP BY 1;
