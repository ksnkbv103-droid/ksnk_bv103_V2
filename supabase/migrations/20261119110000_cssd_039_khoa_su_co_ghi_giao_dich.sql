-- ADR: docs/adr/20261119-cssd-039-khoa-su-co-ghi-giao-dich.md
-- CSSD-039: phiếu XUẤT kho hóa chất gắn sự cố đã vô hiệu.
-- (a) rpc_cssd_kho_hoa_chat_ghi_giao_dich khóa advisory theo sự cố nhưng không đọc cssd_fact_su_co → lập được phiếu cho sự cố is_active=false.
-- (b) rpc_cssd_apply_incident_void (đã FOR UPDATE dòng sự cố) không kiểm lại phiếu kho; app kiểm trước RPC → đua với lập phiếu.
-- Sửa: (a) FOR SHARE dòng sự cố + chặn khi không còn hiệu lực; (b) kiểm lại phiếu kho dưới FOR UPDATE, cùng quy tắc app.
-- Thân hàm chép nguyên bản mới nhất (ghi: 20261118090000; void: 20261110110000; đã so prosrc local: trùng), chỉ thêm 2 khối.
-- Không đổi chữ ký, SECURITY DEFINER, search_path; REVOKE/GRANT lặp lại y như cũ (chỉ service_role). Hai hàm không có COMMENT.
-- Không BEGIN/COMMIT trong file: db push tự bọc transaction.

CREATE OR REPLACE FUNCTION public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(p_loai text, p_dm_hoa_chat_id uuid, p_so_luong numeric, p_ma_lo text, p_han_su_dung date, p_ghi_chu text, p_su_co_id uuid, p_actor_user_id uuid, p_ma_phieu text, p_ly_do_xuat text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_loai text := upper(btrim(coalesce(p_loai, '')));
  v_ma_lo text := nullif(btrim(coalesce(p_ma_lo, '')), '');
  v_ly_do text := nullif(upper(btrim(coalesce(p_ly_do_xuat, ''))), '');
  v_delta numeric;
  v_ton numeric;
  v_ns uuid;
  v_ma text;
  v_id uuid;
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_qua_han boolean := p_han_su_dung IS NOT NULL AND p_han_su_dung < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF v_loai = 'DIEU_CHINH' THEN
    RAISE EXCEPTION 'Không được sửa số tồn. Dùng phiếu Nhập hoặc Xuất có lý do.';
  END IF;
  IF v_loai NOT IN ('NHAP', 'XUAT') THEN
    RAISE EXCEPTION 'Loại giao dịch không hợp lệ.';
  END IF;
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người lập phiếu.';
  END IF;
  IF p_dm_hoa_chat_id IS NULL THEN
    RAISE EXCEPTION 'Chọn hóa chất.';
  END IF;
  IF p_so_luong IS NULL OR p_so_luong <= 0 THEN
    RAISE EXCEPTION 'Số lượng % phải > 0.', CASE WHEN v_loai = 'NHAP' THEN 'nhập' ELSE 'xuất' END;
  END IF;

  IF v_loai = 'NHAP' THEN
    v_ly_do := NULL;  -- phiếu nhập không có lý do xuất
  ELSE
    IF v_ly_do IS NULL THEN
      RAISE EXCEPTION 'Chọn lý do xuất.';
    END IF;
    IF v_ly_do NOT IN ('CAP_SU_DUNG', 'HET_HAN_HUY', 'VO_HONG', 'THAT_THOAT', 'KIEM_KE_THIEU') THEN
      RAISE EXCEPTION 'Lý do xuất không hợp lệ.';
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('cssd_kho_hoa_chat:' || p_dm_hoa_chat_id::text, 0));
  IF p_su_co_id IS NOT NULL AND v_loai = 'XUAT' THEN
    -- CSSD-032: tuần tự hóa theo sự cố rồi mới kiểm, để hai lời gọi đồng thời không cùng lọt.
    PERFORM pg_advisory_xact_lock(hashtextextended('cssd_kho_hoa_chat_su_co:' || p_su_co_id::text, 0));
    -- CSSD-039: sự cố phải còn hiệu lực. FOR SHARE chờ rpc_cssd_apply_incident_void (FOR UPDATE cùng dòng)
    -- commit xong rồi đọc bản mới nhất, nên hủy chạy đồng thời không lọt phiếu gắn sự cố đã hủy.
    -- Thứ tự khóa: advisory hóa chất → advisory sự cố → dòng sự cố (void chỉ khóa dòng sự cố, không vòng).
    -- Phiếu ngược (CSSD-034) không đi qua nhánh này: su_co_id luôn NULL (CHECK cssd_fact_kho_hc_phieu_nguoc_check).
    PERFORM 1 FROM public.cssd_fact_su_co s
     WHERE s.id = p_su_co_id AND s.is_active = true
       FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sự cố không tồn tại hoặc đã bị vô hiệu. Không lập phiếu xuất kho hóa chất cho sự cố này.'
        USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.cssd_fact_kho_hoa_chat_giao_dich g
       WHERE g.su_co_id = p_su_co_id
         AND g.is_active = true
         AND g.trang_thai <> 'TU_CHOI'
    ) THEN
      RAISE EXCEPTION 'Sự cố này đã có phiếu xuất kho hóa chất (chưa bị từ chối). Không lập phiếu thứ hai.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cssd_dm_hoa_chat WHERE id = p_dm_hoa_chat_id) THEN
    RAISE EXCEPTION 'Không tìm thấy hóa chất.';
  END IF;

  v_delta := CASE v_loai WHEN 'XUAT' THEN -p_so_luong ELSE p_so_luong END;

  IF v_delta < 0 THEN
    IF v_qua_han AND v_ly_do <> 'HET_HAN_HUY' THEN
      RAISE EXCEPTION 'Không xuất lô đã quá hạn sử dụng. Chọn lý do «Hết hạn – hủy» để xuất hủy lô này.';
    END IF;
    IF NOT v_qua_han AND v_ly_do = 'HET_HAN_HUY' THEN
      RAISE EXCEPTION 'Lý do «Hết hạn – hủy» chỉ dùng cho lô đã quá hạn sử dụng (lô này còn hạn hoặc không có hạn).';
    END IF;
    SELECT COALESCE(SUM(so_luong_co_dau), 0) INTO v_ton
      FROM public.cssd_fact_kho_hoa_chat_giao_dich
     WHERE dm_hoa_chat_id = p_dm_hoa_chat_id
       AND COALESCE(is_active, true)
       AND ma_lo IS NOT DISTINCT FROM v_ma_lo
       AND han_su_dung IS NOT DISTINCT FROM p_han_su_dung
       AND (trang_thai = 'DA_DUYET' OR (trang_thai = 'CHO_DUYET' AND so_luong_co_dau < 0));
    IF v_ton + v_delta < 0 THEN
      RAISE EXCEPTION 'Không đủ tồn tại lô đã chọn (tồn khả dụng %, cần %).', v_ton, p_so_luong;
    END IF;
  END IF;

  SELECT ns.id INTO v_ns FROM public.mdm_nhan_su ns
   WHERE ns.auth_user_id = p_actor_user_id AND ns.is_active = true LIMIT 1;

  v_ma := coalesce(
    nullif(btrim(p_ma_phieu), ''),
    CASE v_loai WHEN 'NHAP' THEN 'NK' ELSE 'XK' END || '-'
      || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMMDDHH24MISS') || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
  );

  INSERT INTO public.cssd_fact_kho_hoa_chat_giao_dich (
    ma_phieu, dm_hoa_chat_id, loai_giao_dich, so_luong_co_dau, ma_lo, han_su_dung,
    ghi_chu, su_co_id, nguoi_thuc_hien_id, created_by, trang_thai, ly_do_xuat, updated_at
  ) VALUES (
    v_ma, p_dm_hoa_chat_id, v_loai, v_delta, v_ma_lo, p_han_su_dung,
    nullif(btrim(coalesce(p_ghi_chu, '')), ''), p_su_co_id, v_ns, p_actor_user_id, 'CHO_DUYET', v_ly_do, now()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(text, uuid, numeric, text, date, text, uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(text, uuid, numeric, text, date, text, uuid, uuid, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.rpc_cssd_apply_incident_void(
  p_su_co_id uuid,
  p_attributes jsonb,
  p_deactivate_ledger_ids uuid[],
  p_kho_delta jsonb,
  p_quy_trinh_id uuid,
  p_quy_trinh_patch jsonb,
  p_event jsonb,
  p_expected_status text DEFAULT NULL,
  p_expected_tram_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_active boolean;
  v_attrs jsonb;
  v_tram uuid;
  v_n int;
  v_want int;
  d record;
  v_cur int;
  v_cols text;
  v_bad text;
BEGIN
  PERFORM public.fn_cssd_assert_ledger_write();

  IF p_su_co_id IS NULL OR p_attributes IS NULL OR jsonb_typeof(p_attributes) <> 'object' THEN
    RAISE EXCEPTION 'Thiếu dữ liệu vô hiệu phiếu.';
  END IF;

  SELECT is_active, attributes INTO v_active, v_attrs FROM public.cssd_fact_su_co WHERE id = p_su_co_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phiếu sự cố.';
  END IF;
  IF v_active = false THEN
    RETURN jsonb_build_object('already', true);
  END IF;
  -- Kế hoạch tính từ trạng thái app đã đọc: phiếu đã đổi trạng thái thì không ghi đè.
  IF COALESCE(v_attrs ->> 'INCIDENT_STATUS', '') <> COALESCE(p_expected_status, '') THEN
    RAISE EXCEPTION 'Phiếu đã đổi trạng thái, tải lại phiếu rồi thử lại.';
  END IF;

  -- CSSD-039: kiểm lại phiếu kho hóa chất dưới khóa dòng sự cố (cùng quy tắc với app,
  -- src/modules/cssd-su-co/application/void-incident.application.ts): phiếu hiệu lực (is_active, chưa TU_CHOI)
  -- chặn hủy, trừ khi đã có phiếu ngược DA_DUYET còn hiệu lực trỏ về nó (phieu_goc_id, CSSD-034).
  -- Phiếu ngược có su_co_id NULL (CHECK) nên không tự bị đếm ở vế ngoài.
  -- rpc_cssd_kho_hoa_chat_ghi_giao_dich khóa FOR SHARE cùng dòng sự cố: phiếu lập đồng thời hoặc đã commit
  -- trước khi ta khóa (ta thấy ở câu dưới), hoặc phải chờ ta commit rồi thấy sự cố đã hủy.
  IF EXISTS (
    SELECT 1 FROM public.cssd_fact_kho_hoa_chat_giao_dich g
     WHERE g.su_co_id = p_su_co_id
       AND g.is_active = true
       AND g.trang_thai <> 'TU_CHOI'
       AND NOT EXISTS (
         SELECT 1 FROM public.cssd_fact_kho_hoa_chat_giao_dich n
          WHERE n.phieu_goc_id = g.id
            AND n.is_active = true
            AND n.trang_thai = 'DA_DUYET'
       )
  ) THEN
    RAISE EXCEPTION 'Đã ghi xuất kho hóa chất theo phiếu này. Từ chối phiếu chưa duyệt, hoặc lập phiếu ngược cho phiếu đã duyệt và chờ duyệt xong, rồi mới vô hiệu.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 1) Tắt dòng sổ: phải đúng số dòng còn hiệu lực đã lập kế hoạch.
  v_want := COALESCE(array_length(p_deactivate_ledger_ids, 1), 0);
  IF v_want > 0 THEN
    UPDATE public.cssd_fact_kho_giao_dich
       SET is_active = false, updated_at = now()
     WHERE id = ANY (p_deactivate_ledger_ids)
       AND su_co_id = p_su_co_id
       AND is_active = true;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n <> v_want THEN
      RAISE EXCEPTION 'Sổ dụng cụ đã thay đổi, tải lại phiếu rồi thử lại.';
    END IF;
  END IF;
  -- Không còn dòng sổ hiệu lực nào của phiếu ngoài danh sách đã lập kế hoạch (dòng mới chen vào).
  IF EXISTS (
    SELECT 1 FROM public.cssd_fact_kho_giao_dich
     WHERE su_co_id = p_su_co_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sổ dụng cụ đã thay đổi, tải lại phiếu rồi thử lại.';
  END IF;

  -- 2) Kho dự phòng: khóa dòng, cộng/trừ tại chỗ, không để âm. Thứ tự id cố định để tránh deadlock.
  IF p_kho_delta IS NOT NULL AND jsonb_typeof(p_kho_delta) <> 'array' THEN
    RAISE EXCEPTION 'Dữ liệu hoàn kho không hợp lệ.';
  END IF;
  IF p_kho_delta IS NOT NULL THEN
    FOR d IN
      SELECT (e ->> 'loaiDungCuId')::uuid AS loai_id, (e ->> 'delta')::int AS delta
        FROM jsonb_array_elements(p_kho_delta) e
       ORDER BY 1
    LOOP
      IF d.loai_id IS NULL OR d.delta IS NULL THEN
        RAISE EXCEPTION 'Dòng hoàn kho thiếu loại dụng cụ hoặc số lượng.';
      END IF;
      SELECT so_luong_kho_du_phong INTO v_cur
        FROM public.cssd_dm_loai_dung_cu WHERE id = d.loai_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy loại dụng cụ để hoàn kho.';
      END IF;
      IF COALESCE(v_cur, 0) + d.delta < 0 THEN
        RAISE EXCEPTION 'Kho dự phòng không đủ để hoàn phiếu nhập kho.';
      END IF;
      UPDATE public.cssd_dm_loai_dung_cu
         SET so_luong_kho_du_phong = COALESCE(so_luong_kho_du_phong, 0) + d.delta,
             updated_at = now()
       WHERE id = d.loai_id;
    END LOOP;
  END IF;

  -- 3) Chu trình: chỉ cột đang có của bảng, trừ nhóm khóa/định danh.
  IF p_quy_trinh_id IS NOT NULL THEN
    SELECT tram_hien_tai_id INTO v_tram FROM public.cssd_fact_quy_trinh WHERE id = p_quy_trinh_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Không tìm thấy chu trình của phiếu.';
    END IF;
    IF v_tram IS DISTINCT FROM p_expected_tram_id THEN
      RAISE EXCEPTION 'Chu trình đã chuyển trạm, tải lại phiếu rồi thử lại.';
    END IF;

    IF p_quy_trinh_patch IS NOT NULL AND jsonb_typeof(p_quy_trinh_patch) = 'object'
       AND p_quy_trinh_patch <> '{}'::jsonb THEN
      SELECT string_agg(k, ', ') INTO v_bad
        FROM jsonb_object_keys(p_quy_trinh_patch) k
       WHERE k IN ('id', 'created_at', 'metadata', 'is_active', 'updated_at')
          OR NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
             WHERE c.table_schema = 'public' AND c.table_name = 'cssd_fact_quy_trinh' AND c.column_name = k
          );
      IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'Cột chu trình không hợp lệ: %', v_bad;
      END IF;
      SELECT string_agg(format('%1$I = r.%1$I', k), ', ') INTO v_cols
        FROM jsonb_object_keys(p_quy_trinh_patch) k;
      EXECUTE format(
        'UPDATE public.cssd_fact_quy_trinh q SET %s, updated_at = now() '
        'FROM jsonb_populate_record(NULL::public.cssd_fact_quy_trinh, $1) r WHERE q.id = $2',
        v_cols
      ) USING p_quy_trinh_patch, p_quy_trinh_id;
    END IF;

    IF p_event IS NOT NULL AND jsonb_typeof(p_event) = 'object' THEN
      UPDATE public.cssd_fact_quy_trinh
         SET metadata = jsonb_set(
               COALESCE(metadata, '{}'::jsonb),
               '{ngoai_le}',
               COALESCE(metadata -> 'ngoai_le', '[]'::jsonb) || jsonb_build_array(p_event),
               true
             ),
             updated_at = now()
       WHERE id = p_quy_trinh_id;
    END IF;
  END IF;

  -- 4) Đóng phiếu.
  UPDATE public.cssd_fact_su_co
     SET is_active = false,
         is_red_alert = false,
         attributes = p_attributes,
         updated_at = now()
   WHERE id = p_su_co_id AND is_active = true;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Không vô hiệu được phiếu (đã bị đổi trạng thái).';
  END IF;

  RETURN jsonb_build_object('already', false);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_cssd_apply_incident_void(uuid, jsonb, uuid[], jsonb, uuid, jsonb, jsonb, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_apply_incident_void(uuid, jsonb, uuid[], jsonb, uuid, jsonb, jsonb, text, uuid) TO service_role;


-- Hoàn tác: migration ngược chép lại nguyên thân hàm của 20261118090000 (ghi_giao_dich) và 20261110110000 (apply_incident_void).

-- CHƯA APPLY PROD — chờ PO.
-- SQL kiểm prod (chỉ đọc), trước khi apply:
--   -- Phiếu hiệu lực đang gắn sự cố đã vô hiệu (dữ liệu lọt cũ; migration KHÔNG dọn):
--   SELECT g.ma_phieu, g.trang_thai, s.id AS su_co_id
--     FROM public.cssd_fact_kho_hoa_chat_giao_dich g JOIN public.cssd_fact_su_co s ON s.id = g.su_co_id
--    WHERE s.is_active = false AND g.is_active = true AND g.trang_thai <> 'TU_CHOI'
--      AND NOT EXISTS (SELECT 1 FROM public.cssd_fact_kho_hoa_chat_giao_dich n
--                       WHERE n.phieu_goc_id = g.id AND n.is_active AND n.trang_thai = 'DA_DUYET');
--   SELECT oid::regprocedure FROM pg_proc WHERE proname IN ('rpc_cssd_kho_hoa_chat_ghi_giao_dich', 'rpc_cssd_apply_incident_void');  -- kỳ vọng 2 dòng
--   -- Cột phieu_goc_id phải có (CSSD-034 đã apply trước):
--   SELECT 1 FROM information_schema.columns WHERE table_name = 'cssd_fact_kho_hoa_chat_giao_dich' AND column_name = 'phieu_goc_id';
-- Sau apply:
--   SELECT position('CSSD-039' IN pg_get_functiondef(oid)) > 0 FROM pg_proc
--    WHERE proname IN ('rpc_cssd_kho_hoa_chat_ghi_giao_dich', 'rpc_cssd_apply_incident_void');  -- kỳ vọng 2 × true
