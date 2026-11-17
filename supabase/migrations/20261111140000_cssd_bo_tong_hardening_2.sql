-- Lát C′ S2-fix / file B (sau S2 20261111130000). Chỉ CREATE OR REPLACE hai hàm của S1b; chữ ký, SECURITY DEFINER,
-- search_path, ACL (postgres, service_role) giữ nguyên. Idempotent. Áp trong MỘT giao dịch (psql -1).
--   Major 1: guard fn_cssd_bom_chi_tiet_guard_ho — kiểm trùng loại trong họ BỎ QUA dòng trên con
--            KHONG_CHIU_NHIET_EO (G3: con EO giữ dòng riêng, view hiệu lực không dẫn xuất nó); dòng trên con EO
--            chỉ kiểm trùng trong chính bộ EO. Nhánh (i) «chặn thêm dòng vào con chỉ áp CN/KCN» giữ nguyên.
--   Major 4: core fn_cssd_dong_bo_tach_nhiet_core nhánh NOT v_can — khi bộ tổng active, chưa có quy trình active,
--            không con CN/KCN nào đang chạy: MỘT quy trình chờ tiếp nhận của con -CN trỏ về bộ tổng thay vì vô hiệu
--            (cùng điều kiện S2 D4). Kết quả thêm khóa 'quy_trinh_tro_ve_tong' (additive).

CREATE OR REPLACE FUNCTION public.fn_cssd_bom_chi_tiet_guard_ho()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_bo public.cssd_dm_bo_dung_cu%ROWTYPE;
  v_tong uuid;
  v_dup record;
BEGIN
  IF NEW.is_active IS NOT TRUE OR NEW.bo_dung_cu_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD.is_active IS TRUE
     AND OLD.bo_dung_cu_id IS NOT DISTINCT FROM NEW.bo_dung_cu_id
     AND OLD.loai_dung_cu_id IS NOT DISTINCT FROM NEW.loai_dung_cu_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_bo FROM public.cssd_dm_bo_dung_cu WHERE id = NEW.bo_dung_cu_id;

  -- (i) Không thêm dòng mới lên bộ con: INSERT, hoặc UPDATE dời dòng sang bộ con.
  --     UPDATE dòng cũ đang nằm trên con (kể cả bật lại) vẫn cho; dời dòng con → cha vẫn cho.
  --     Chỉ áp cho bộ con dẫn xuất (CN/KCN); bộ con KHONG_CHIU_NHIET_EO giữ dòng riêng (G3).
  IF v_bo.parent_bo_id IS NOT NULL
     AND v_bo.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
     AND (TG_OP = 'INSERT' OR OLD.bo_dung_cu_id IS DISTINCT FROM NEW.bo_dung_cu_id) THEN
    RAISE EXCEPTION 'Bộ % là bộ con tách nhiệt: thành phần chỉ ghi trên bộ tổng (C′). Hãy thêm dòng vào bộ tổng.',
      v_bo.ma_bo USING ERRCODE = '23514';
  END IF;

  -- (ii) G4: trong cả họ bộ tổng mỗi loại chỉ một dòng active.
  IF NEW.loai_dung_cu_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- S2-fix (Major 1): bộ con KHONG_CHIU_NHIET_EO giữ dòng riêng (G3), không thuộc G4 của họ → chỉ kiểm trùng
  -- trong chính bộ EO (như bộ thường); dòng trên con EO cũng không tính khi kiểm trùng cho tổng/CN/KCN.
  IF v_bo.parent_bo_id IS NOT NULL AND v_bo.vai_tro_tach = 'KHONG_CHIU_NHIET_EO' THEN
    v_tong := v_bo.id;
  ELSE
    v_tong := public.fn_cssd_bo_tong_id(NEW.bo_dung_cu_id);
  END IF;
  PERFORM pg_advisory_xact_lock(
    hashtextextended('cssd_bom_ho:' || v_tong::text || ':' || NEW.loai_dung_cu_id::text, 0));

  SELECT c.id, b.ma_bo INTO v_dup
    FROM public.cssd_dm_bo_dung_cu_chi_tiet c
    JOIN public.cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
   WHERE c.is_active = true
     AND c.loai_dung_cu_id = NEW.loai_dung_cu_id
     AND c.id <> NEW.id
     AND (b.id = v_tong OR (b.parent_bo_id = v_tong AND b.vai_tro_tach IS DISTINCT FROM 'KHONG_CHIU_NHIET_EO'))
   LIMIT 1;
  IF FOUND THEN
    -- 23505: để EXCEPTION WHEN unique_violation trong fn_cssd_ensure_chi_tiet_for_ledger vẫn bắt được ca đua.
    RAISE EXCEPTION 'Loại dụng cụ này đã có dòng đang dùng trong bộ % (cùng họ bộ tổng). Mỗi loại chỉ một dòng trong cả bộ tổng và các bộ con — sửa dòng đó thay vì thêm mới.',
      v_dup.ma_bo USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_cssd_dong_bo_tach_nhiet_core(p_bo_tong_id uuid, p_chi_vo_hieu boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tong public.cssd_dm_bo_dung_cu%ROWTYPE;
  v_tong_id uuid;
  v_ma_tong text;
  v_has_cn boolean;
  v_has_kcn boolean;
  v_can boolean;
  v_role text;
  v_ma text;
  v_child public.cssd_dm_bo_dung_cu%ROWTYPE;
  v_new_id uuid;
  v_tram uuid;
  v_qt uuid;
  v_run record;
  v_prev_flag text;
  v_created jsonb := '[]'::jsonb;
  v_reactivated jsonb := '[]'::jsonb;
  v_deactivated jsonb := '[]'::jsonb;
  v_pending jsonb := '[]'::jsonb;
  v_qt_created jsonb := '[]'::jsonb;
  v_qt_deactivated jsonb := '[]'::jsonb;
  v_qt_tro jsonb := '[]'::jsonb;
  v_co_the_tro boolean := false;
  v_tro_id uuid;
BEGIN
  IF p_bo_tong_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu bộ dụng cụ.' USING ERRCODE = '22004';
  END IF;

  v_tong_id := public.fn_cssd_bo_tong_id(p_bo_tong_id);
  SELECT * INTO v_tong FROM public.cssd_dm_bo_dung_cu WHERE id = v_tong_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy bộ dụng cụ %.', p_bo_tong_id USING ERRCODE = 'P0002';
  END IF;

  -- Cờ chống đệ quy (trigger quy trình / bộ tổng bỏ qua khi cờ bật). Khôi phục trước RETURN.
  v_prev_flag := current_setting('cssd.dong_bo_tach_nhiet', true);
  PERFORM set_config('cssd.dong_bo_tach_nhiet', 'on', true);

  v_ma_tong := upper(btrim(v_tong.ma_bo));
  PERFORM 1 FROM public.cssd_dm_bo_dung_cu WHERE parent_bo_id = v_tong_id ORDER BY id FOR UPDATE;

  -- Thành phần hiệu lực của họ: dòng trên bộ tổng + dòng cũ còn trên bộ con (G1: NULL → chịu nhiệt).
  SELECT COALESCE(bool_or(l.is_chiu_nhiet IS NOT FALSE), false),
         COALESCE(bool_or(l.is_chiu_nhiet IS FALSE), false)
    INTO v_has_cn, v_has_kcn
    FROM public.cssd_dm_bo_dung_cu_chi_tiet c
    JOIN public.cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
    LEFT JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
   WHERE c.is_active = true
     AND (b.id = v_tong_id OR b.parent_bo_id = v_tong_id);

  v_can := COALESCE(v_tong.is_active, true) AND v_has_cn AND v_has_kcn;

  IF v_can AND NOT COALESCE(p_chi_vo_hieu, false) THEN
    SELECT id INTO v_tram FROM public.cssd_dm_tram WHERE ma_tram = 'TIEP_NHAN' LIMIT 1;
    IF v_tram IS NULL THEN
      RAISE EXCEPTION 'Không tìm thấy trạm TIEP_NHAN trong danh mục.';
    END IF;

    FOREACH v_role IN ARRAY ARRAY['CHIU_NHIET', 'KHONG_CHIU_NHIET'] LOOP
      v_ma := v_ma_tong || CASE v_role WHEN 'CHIU_NHIET' THEN '-CN' ELSE '-KCN' END;

      SELECT * INTO v_child
        FROM public.cssd_dm_bo_dung_cu
       WHERE parent_bo_id = v_tong_id AND vai_tro_tach = v_role
       ORDER BY is_active IS TRUE DESC, (ma_bo = v_ma) DESC, created_at, id
       LIMIT 1;

      IF FOUND THEN
        IF v_child.is_active IS NOT TRUE THEN
          UPDATE public.cssd_dm_bo_dung_cu
             SET is_active = true, trang_thai = 'ACTIVE', updated_at = now()
           WHERE id = v_child.id;
          v_reactivated := v_reactivated || jsonb_build_array(jsonb_build_object(
            'id', v_child.id, 'ma_bo', v_child.ma_bo, 'vai_tro_tach', v_role));
        END IF;
        v_new_id := v_child.id;
        v_ma := v_child.ma_bo;
      ELSE
        IF EXISTS (SELECT 1 FROM public.cssd_dm_bo_dung_cu WHERE ma_bo = v_ma) THEN
          RAISE EXCEPTION 'Mã % đã dùng cho bộ khác (không phải thành phần % của %) — sửa danh mục trước.',
            v_ma, v_role, v_ma_tong USING ERRCODE = '23505';
        END IF;
        INSERT INTO public.cssd_dm_bo_dung_cu (
          ma_bo, ten_bo, khoa_su_dung_id, phan_loai_bo, loai_bao_goi_id,
          trang_thai, co_ma_dinh_danh_rieng, is_active, ghi_chu,
          parent_bo_id, vai_tro_tach, updated_at
        ) VALUES (
          v_ma,
          btrim(COALESCE(NULLIF(btrim(v_tong.ten_bo), ''), v_tong.ma_bo))
            || CASE v_role WHEN 'CHIU_NHIET' THEN ' (chịu nhiệt)' ELSE ' (không chịu nhiệt)' END,
          v_tong.khoa_su_dung_id,
          COALESCE(v_tong.phan_loai_bo, 'PHAU_THUAT'),
          v_tong.loai_bao_goi_id,
          'ACTIVE', true, true,
          format('Tách nhiệt danh mục · mẹ %s · %s', v_tong.ma_bo, v_role),
          v_tong_id, v_role, now()
        )
        RETURNING id INTO v_new_id;
        v_created := v_created || jsonb_build_array(jsonb_build_object(
          'id', v_new_id, 'ma_bo', v_ma, 'vai_tro_tach', v_role));
      END IF;

      -- Quy trình bộ con (tương đương ensureQuyTrinhForComponent, không có quy trình mẹ).
      IF NOT EXISTS (
        SELECT 1 FROM public.cssd_fact_quy_trinh
         WHERE ma_qr_quy_trinh = v_ma AND is_active = true
      ) THEN
        INSERT INTO public.cssd_fact_quy_trinh (
          ma_qr_quy_trinh, ma_qr_bo_vinh_vien, bo_dung_cu_id, tram_hien_tai_id, is_active, updated_at
        ) VALUES (v_ma, v_ma, v_new_id, v_tram, true, now())
        RETURNING id INTO v_qt;
        v_qt_created := v_qt_created || jsonb_build_array(jsonb_build_object(
          'quy_trinh_id', v_qt, 'bo_dung_cu_id', v_new_id, 'ma_bo', v_ma));
      END IF;
    END LOOP;
  ELSIF NOT v_can THEN
    -- S2-fix (Major 4): cùng điều kiện an toàn với S2 bước 4 (D4) — bộ tổng active, bộ tổng chưa có quy trình
    -- active, không con CN/KCN active nào có quy trình đang chạy. Khi đó MỘT quy trình chờ tiếp nhận của con -CN
    -- được trỏ về bộ tổng (thay vì vô hiệu); các quy trình chờ khác vẫn vô hiệu như cũ.
    v_co_the_tro := v_tong.is_active IS TRUE
      AND NOT EXISTS (SELECT 1 FROM public.cssd_fact_quy_trinh q3 WHERE q3.bo_dung_cu_id = v_tong_id AND q3.is_active)
      AND NOT EXISTS (
        SELECT 1 FROM public.cssd_dm_bo_dung_cu k2
          JOIN public.cssd_fact_quy_trinh q2 ON q2.bo_dung_cu_id = k2.id AND q2.is_active
          LEFT JOIN public.cssd_dm_tram t2 ON t2.id = q2.tram_hien_tai_id
         WHERE k2.parent_bo_id = v_tong_id AND k2.is_active IS TRUE
           AND k2.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
           AND NOT (t2.ma_tram IS NOT DISTINCT FROM 'TIEP_NHAN' AND q2.thoi_gian_tiep_nhan IS NULL));

    FOR v_child IN
      SELECT * FROM public.cssd_dm_bo_dung_cu
       WHERE parent_bo_id = v_tong_id
         AND vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
         AND is_active IS TRUE
       ORDER BY id
    LOOP
      SELECT q.id, t.ma_tram INTO v_run
        FROM public.cssd_fact_quy_trinh q
        LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
       WHERE q.bo_dung_cu_id = v_child.id
         AND q.is_active = true
         AND NOT (t.ma_tram IS NOT DISTINCT FROM 'TIEP_NHAN' AND q.thoi_gian_tiep_nhan IS NULL)
       ORDER BY q.updated_at DESC NULLS LAST, q.id
       LIMIT 1;
      IF v_run.id IS NOT NULL THEN
        v_pending := v_pending || jsonb_build_array(jsonb_build_object(
          'id', v_child.id, 'ma_bo', v_child.ma_bo, 'vai_tro_tach', v_child.vai_tro_tach,
          'quy_trinh_id', v_run.id, 'ma_tram', v_run.ma_tram));
      ELSE
        UPDATE public.cssd_dm_bo_dung_cu
           SET is_active = false, trang_thai = 'INACTIVE', updated_at = now()
         WHERE id = v_child.id;
        -- S2-fix (Major 4): trỏ một quy trình chờ của con -CN về bộ tổng (mã QR = ma_bo tổng, như S2 D4).
        IF v_co_the_tro AND v_child.vai_tro_tach = 'CHIU_NHIET' THEN
          v_tro_id := NULL;
          SELECT q.id INTO v_tro_id
            FROM public.cssd_fact_quy_trinh q
            JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id AND t.ma_tram = 'TIEP_NHAN'
           WHERE q.bo_dung_cu_id = v_child.id
             AND q.is_active = true
             AND q.quy_trinh_cha_id IS NULL
             AND q.thoi_gian_tiep_nhan IS NULL
             AND NOT EXISTS (SELECT 1 FROM public.cssd_fact_quy_trinh q4
                              WHERE q4.is_active AND q4.id <> q.id
                                AND upper(btrim(COALESCE(q4.ma_qr_bo_vinh_vien, q4.ma_qr_quy_trinh::text))) = upper(btrim(v_tong.ma_bo)))
           ORDER BY q.updated_at DESC NULLS LAST, q.id
           LIMIT 1;
          IF v_tro_id IS NOT NULL THEN
            UPDATE public.cssd_fact_quy_trinh
               SET bo_dung_cu_id = v_tong_id, ma_qr_quy_trinh = v_tong.ma_bo, ma_qr_bo_vinh_vien = v_tong.ma_bo,
                   updated_at = now()
             WHERE id = v_tro_id;
            v_qt_tro := v_qt_tro || jsonb_build_array(jsonb_build_object(
              'quy_trinh_id', v_tro_id, 'tu_bo_id', v_child.id, 'tu_ma_bo', v_child.ma_bo,
              'bo_tong_id', v_tong_id, 'ma_bo', v_tong.ma_bo));
            v_co_the_tro := false;
          END IF;
        END IF;
        -- S1b (3): quy trình chờ tiếp nhận của bộ con vô hiệu cùng giao dịch (phần bù đúng của "đang chạy";
        -- cùng cách các RPC quét trạm: is_active=false, updated_at=now()).
        WITH q AS (
          UPDATE public.cssd_fact_quy_trinh qq
             SET is_active = false, updated_at = now()
            FROM public.cssd_dm_tram t
           WHERE qq.bo_dung_cu_id = v_child.id
             AND qq.is_active = true
             AND t.id = qq.tram_hien_tai_id
             AND t.ma_tram = 'TIEP_NHAN'
             AND qq.thoi_gian_tiep_nhan IS NULL
          RETURNING qq.id
        )
        SELECT v_qt_deactivated || COALESCE(jsonb_agg(q.id), '[]'::jsonb) INTO v_qt_deactivated FROM q;
        v_deactivated := v_deactivated || jsonb_build_array(jsonb_build_object(
          'id', v_child.id, 'ma_bo', v_child.ma_bo, 'vai_tro_tach', v_child.vai_tro_tach));
      END IF;
      v_run := NULL;
    END LOOP;
  END IF;

  PERFORM set_config('cssd.dong_bo_tach_nhiet', COALESCE(v_prev_flag, ''), true);

  RETURN jsonb_build_object(
    'bo_tong_id', v_tong_id,
    'can_tach', v_can,
    'created', v_created,
    'reactivated', v_reactivated,
    'deactivated', v_deactivated,
    'pending', v_pending,
    'quy_trinh_created', v_qt_created,
    'quy_trinh_deactivated', v_qt_deactivated,
    'quy_trinh_tro_ve_tong', v_qt_tro);
END;
$function$;

COMMENT ON FUNCTION public.fn_cssd_dong_bo_tach_nhiet_core(uuid, boolean) IS
  'C′ S1b/S2-fix: lõi đồng bộ bộ con -CN/-KCN, KHÔNG kiểm quyền (chỉ gọi từ RPC đã kiểm quyền hoặc trigger). '
  'p_chi_vo_hieu=true: chỉ vô hiệu khi hết điều kiện tách. Vô hiệu bộ con kéo theo vô hiệu quy trình chờ tiếp nhận, '
  'trừ một quy trình chờ của con -CN được trỏ về bộ tổng khi bộ tổng active và chưa có quy trình (quy_trinh_tro_ve_tong). '
  'Đặt cờ GUC cssd.dong_bo_tach_nhiet=on trong lúc chạy để trigger không đệ quy.';

REVOKE ALL ON FUNCTION public.fn_cssd_bom_chi_tiet_guard_ho() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_cssd_dong_bo_tach_nhiet_core(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cssd_dong_bo_tach_nhiet_core(uuid, boolean) TO service_role;

NOTIFY pgrst, 'reload schema';

-- CHƯA APPLY PROD — chờ PO. Thứ tự prod: … → 20261111125000 → 20261111130000 (S2) → file này.
-- Rủi ro: trỏ quy trình về tổng xảy ra cả ở đường RPC công khai (p_chi_vo_hieu=false) lẫn trigger; đường quét trạm
-- CAP_PHAT→TIEP_NHAN chèn quy trình MỚI đã tiếp nhận rồi mới vô hiệu cũ → con vẫn pending, nhánh này không kích.
-- Kiểm prod (chỉ đọc) — SQL đo đặt ở cuối 20261111125000; sau khi áp:
--   SELECT pg_get_functiondef('public.fn_cssd_dong_bo_tach_nhiet_core(uuid,boolean)'::regprocedure) ~ 'quy_trinh_tro_ve_tong' AS core_moi,
--          pg_get_functiondef('public.fn_cssd_bom_chi_tiet_guard_ho()'::regprocedure) ~ 'KHONG_CHIU_NHIET_EO'' THEN' AS guard_moi;
