-- Lát S1b / plan C′: gia cố sau review độc lập của S1 (20261111100000_cssd_bo_tong_thanh_phan_hieu_luc.sql).
-- Additive. Không đổi chữ ký / ACL công khai. Không di chuyển dữ liệu.
--   1. fn_cssd_apply_instrument_ledger_tx: DIEU_CHUYEN khóa theo BỘ TỔNG (khử trùng, thứ tự cố định) — chống deadlock
--      chéo họ (A-CN→B song song B→A-KCN).
--   2. G4 thành ràng buộc DB: trigger trên cssd_dm_bo_dung_cu_chi_tiet (một dòng active / (họ bộ tổng, loại);
--      không thêm dòng mới lên bộ con). View: nhánh dẫn xuất chỉ lấy bộ con active.
--   3. Vô hiệu bộ con → vô hiệu luôn quy trình chờ tiếp nhận của nó (cùng giao dịch).
--   4. Trigger quy trình bộ con về chờ tiếp nhận / bị vô hiệu → đồng bộ (chỉ vô hiệu) bộ tổng.
--   5. Trigger bật/tắt bộ tổng → đồng bộ bộ con.
-- Chống đệ quy: core đặt GUC giao dịch cssd.dong_bo_tach_nhiet='on' trong lúc chạy (khôi phục giá trị cũ khi xong);
-- trigger 4/5 thấy cờ thì bỏ qua. pg_trigger_depth() không đủ vì UPDATE trực tiếp và UPDATE từ core đều ở depth 1.

-- 1. Ledger: khóa kho DIEU_CHUYEN theo bộ tổng ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_cssd_apply_instrument_ledger_tx(p_su_co_id uuid, p_loai_dung_cu_id uuid, p_bo_dung_cu_id uuid, p_quy_trinh_id uuid, p_loai_giao_dich text, p_so_luong_thay_doi integer, p_ghi_chu text, p_bo_dung_cu_id_den uuid, p_nguoi_thuc_hien_id uuid, p_chi_tiet_id uuid, p_issue_type text, p_ten_dung_cu_le text, p_ma_qr_nguon text, p_ma_qr_den text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_abs integer;
  v_thuc integer;
  v_reserve integer;
  v_den uuid;
  v_qt_tu uuid;
  v_qt_den uuid;
  v_issue text;
  v_ma_den text;
  v_ma_nguon text;
  v_src_qty integer;
  v_lock_tong uuid;
BEGIN
  IF p_loai_dung_cu_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu loại dụng cụ.';
  END IF;
  IF p_so_luong_thay_doi IS NULL OR p_so_luong_thay_doi = 0 THEN
    RAISE EXCEPTION 'Số lượng phải lớn hơn 0.';
  END IF;
  v_abs := abs(p_so_luong_thay_doi);
  IF v_abs <= 0 THEN
    RAISE EXCEPTION 'Số lượng phải lớn hơn 0.';
  END IF;
  IF p_loai_giao_dich NOT IN ('NHAP_KHO', 'BAO_HONG', 'BAO_MAT', 'BO_SUNG', 'DIEU_CHUYEN') THEN
    RAISE EXCEPTION 'Loại giao dịch không hợp lệ.';
  END IF;

  v_den := p_bo_dung_cu_id_den;
  v_ma_den := NULLIF(upper(trim(COALESCE(p_ma_qr_den, ''))), '');
  v_ma_nguon := NULLIF(upper(trim(COALESCE(p_ma_qr_nguon, ''))), '');
  v_src_qty := p_so_luong_thay_doi;

  -- KD-4: điều chuyển bắt buộc có bộ nguồn + bộ đích (khác nhau); không đích = lỗi, không trừ nguồn
  IF p_loai_giao_dich = 'DIEU_CHUYEN' THEN
    IF p_bo_dung_cu_id IS NULL THEN
      RAISE EXCEPTION 'Điều chuyển cần bộ nguồn.';
    END IF;
    IF v_den IS NULL AND v_ma_den IS NOT NULL THEN
      SELECT b.id INTO v_den
        FROM public.cssd_dm_bo_dung_cu b
       WHERE upper(b.ma_bo) = v_ma_den
         AND b.is_active = true
       LIMIT 1;
      IF v_den IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy bộ đích theo QR.';
      END IF;
    END IF;
    IF v_den IS NULL THEN
      RAISE EXCEPTION 'Điều chuyển bắt buộc có bộ đích.';
    END IF;
    IF v_den = p_bo_dung_cu_id THEN
      RAISE EXCEPTION 'Bộ đích trùng bộ nguồn.';
    END IF;
    v_src_qty := -v_abs;
    -- S1b: khóa kho băm theo BỘ TỔNG (fn_cssd_kho_lock) → sắp và khử trùng theo bộ tổng, không theo id thô,
    -- để mọi giao dịch lấy khóa cùng thứ tự (tránh deadlock chéo họ A-CN→B / B→A-KCN). Vòng lặp tường minh
    -- để thứ tự gọi khóa chắc chắn theo ORDER BY.
    FOR v_lock_tong IN
      SELECT s.t
        FROM (SELECT DISTINCT public.fn_cssd_bo_tong_id(x) AS t
                FROM unnest(ARRAY[p_bo_dung_cu_id, v_den]) AS x) s
       ORDER BY s.t::text
    LOOP
      PERFORM public.fn_cssd_kho_lock(v_lock_tong, p_loai_dung_cu_id);
    END LOOP;
  ELSIF p_bo_dung_cu_id IS NOT NULL THEN
    PERFORM public.fn_cssd_kho_lock(p_bo_dung_cu_id, p_loai_dung_cu_id);
  END IF;

  IF p_loai_giao_dich IN ('BAO_HONG', 'BAO_MAT', 'DIEU_CHUYEN', 'NHAP_KHO')
     AND p_bo_dung_cu_id IS NOT NULL THEN
    v_thuc := public.fn_cssd_set_thuc_te(p_bo_dung_cu_id, p_loai_dung_cu_id);
    IF v_thuc IS NULL OR v_thuc < v_abs THEN
      IF p_loai_giao_dich = 'NHAP_KHO' THEN
        RAISE EXCEPTION 'Bộ không đủ số để trả kho (hiện có %).', COALESCE(v_thuc, 0);
      END IF;
      RAISE EXCEPTION 'Số lượng vượt quá số thực tế (%).', COALESCE(v_thuc, 0);
    END IF;
  END IF;

  IF p_loai_giao_dich = 'BO_SUNG' THEN
    UPDATE public.cssd_dm_loai_dung_cu
       SET so_luong_kho_du_phong = so_luong_kho_du_phong - v_abs,
           updated_at = now()
     WHERE id = p_loai_dung_cu_id
       AND is_active = true
       AND so_luong_kho_du_phong >= v_abs;
    IF NOT FOUND THEN
      SELECT COALESCE(so_luong_kho_du_phong, 0) INTO v_reserve
        FROM public.cssd_dm_loai_dung_cu
       WHERE id = p_loai_dung_cu_id;
      RAISE EXCEPTION 'Kho dự phòng không đủ (hiện có %).', COALESCE(v_reserve, 0);
    END IF;
    PERFORM public.fn_cssd_ensure_chi_tiet_for_ledger(
      p_bo_dung_cu_id, p_loai_dung_cu_id, p_ten_dung_cu_le
    );
  ELSIF p_loai_giao_dich = 'NHAP_KHO' THEN
    UPDATE public.cssd_dm_loai_dung_cu
       SET so_luong_kho_du_phong = so_luong_kho_du_phong + v_abs,
           updated_at = now()
     WHERE id = p_loai_dung_cu_id
       AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Không tìm thấy loại dụng cụ để cộng kho dự phòng.';
    END IF;
  END IF;

  v_issue := NULLIF(upper(trim(COALESCE(p_issue_type, ''))), '');
  IF v_issue IS NULL AND p_loai_giao_dich = 'BAO_HONG' THEN
    v_issue := 'HONG';
  ELSIF v_issue IS NULL AND p_loai_giao_dich = 'BAO_MAT' THEN
    v_issue := 'MAT';
  END IF;
  IF p_chi_tiet_id IS NOT NULL AND v_issue IN ('HONG', 'MAT') THEN
    PERFORM public.fn_cssd_append_chi_tiet_issue_note(p_chi_tiet_id, v_issue, p_ghi_chu, v_abs);
  END IF;

  -- Approach A: DIEU_CHUYEN dest — ensure chi_tiet (trước metadata để dòng BOM đích mang chi_tiet_id đích)
  IF p_loai_giao_dich = 'DIEU_CHUYEN' THEN
    PERFORM public.fn_cssd_ensure_chi_tiet_for_ledger(
      v_den, p_loai_dung_cu_id, p_ten_dung_cu_le
    );
  END IF;

  IF p_loai_giao_dich = 'DIEU_CHUYEN'
     AND v_ma_nguon IS NOT NULL
     AND v_ma_den IS NOT NULL THEN
    SELECT q.id INTO v_qt_tu
      FROM public.cssd_fact_quy_trinh q
     WHERE upper(q.ma_qr_quy_trinh) = v_ma_nguon
       AND q.is_active = true
     ORDER BY q.created_at DESC
     LIMIT 1;
    SELECT q.id INTO v_qt_den
      FROM public.cssd_fact_quy_trinh q
     WHERE upper(q.ma_qr_quy_trinh) = v_ma_den
       AND q.is_active = true
     ORDER BY q.created_at DESC
     LIMIT 1;
    IF v_qt_tu IS NOT NULL AND v_qt_den IS NOT NULL AND v_qt_tu <> v_qt_den THEN
      PERFORM public.fn_cssd_transfer_bom_metadata_by_id(
        v_qt_tu, v_qt_den, p_loai_dung_cu_id, p_chi_tiet_id, p_ten_dung_cu_le, v_abs
      );
    END IF;
  END IF;

  INSERT INTO public.cssd_fact_kho_giao_dich (
    loai_dung_cu_id, bo_dung_cu_id, quy_trinh_id, loai_giao_dich,
    so_luong_thay_doi, ghi_chu, su_co_id, nguoi_thuc_hien_id, created_at, updated_at
  ) VALUES (
    p_loai_dung_cu_id, p_bo_dung_cu_id, p_quy_trinh_id, p_loai_giao_dich,
    v_src_qty, NULLIF(trim(COALESCE(p_ghi_chu, '')), ''),
    p_su_co_id, p_nguoi_thuc_hien_id, now(), now()
  );

  IF p_loai_giao_dich = 'DIEU_CHUYEN' THEN
    INSERT INTO public.cssd_fact_kho_giao_dich (
      loai_dung_cu_id, bo_dung_cu_id, quy_trinh_id, loai_giao_dich,
      so_luong_thay_doi, ghi_chu, su_co_id, nguoi_thuc_hien_id, created_at, updated_at
    ) VALUES (
      p_loai_dung_cu_id, v_den, p_quy_trinh_id, 'DIEU_CHUYEN',
      v_abs, COALESCE(NULLIF(trim(COALESCE(p_ghi_chu, '')), ''), 'Nhận điều chuyển'),
      p_su_co_id, p_nguoi_thuc_hien_id, now(), now()
    );
  END IF;
END;
$function$;
-- ACL giữ nguyên (CREATE OR REPLACE không đổi proacl): postgres, service_role.

-- 2a. G4 thành ràng buộc DB ---------------------------------------------------------------------------
-- Chỉ xét khi cột liên quan thực sự đổi → dữ liệu cũ (nếu có trùng) không chặn UPDATE khác (vd so_luong).
-- Kiểm local khi viết: 0 họ trùng loại; 4031 dòng active còn trên bộ con (chuyển tiếp, S2 dời).
CREATE OR REPLACE FUNCTION public.fn_cssd_bom_chi_tiet_guard_ho()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
  v_tong := public.fn_cssd_bo_tong_id(NEW.bo_dung_cu_id);
  PERFORM pg_advisory_xact_lock(
    hashtextextended('cssd_bom_ho:' || v_tong::text || ':' || NEW.loai_dung_cu_id::text, 0));

  SELECT c.id, b.ma_bo INTO v_dup
    FROM public.cssd_dm_bo_dung_cu_chi_tiet c
    JOIN public.cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
   WHERE c.is_active = true
     AND c.loai_dung_cu_id = NEW.loai_dung_cu_id
     AND c.id <> NEW.id
     AND (b.id = v_tong OR b.parent_bo_id = v_tong)
   LIMIT 1;
  IF FOUND THEN
    -- 23505: để EXCEPTION WHEN unique_violation trong fn_cssd_ensure_chi_tiet_for_ledger vẫn bắt được ca đua.
    RAISE EXCEPTION 'Loại dụng cụ này đã có dòng đang dùng trong bộ % (cùng họ bộ tổng). Mỗi loại chỉ một dòng trong cả bộ tổng và các bộ con — sửa dòng đó thay vì thêm mới.',
      v_dup.ma_bo USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_bom_chi_tiet_guard_ho() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cssd_bom_chi_tiet_guard_ho ON public.cssd_dm_bo_dung_cu_chi_tiet;
CREATE TRIGGER trg_cssd_bom_chi_tiet_guard_ho
  BEFORE INSERT OR UPDATE ON public.cssd_dm_bo_dung_cu_chi_tiet
  FOR EACH ROW EXECUTE FUNCTION public.fn_cssd_bom_chi_tiet_guard_ho();

-- 2b. View: nhánh dẫn xuất chỉ cho bộ con active -------------------------------------------------------
-- CẢNH BÁO: so_luong_thuc_te tính theo (họ bộ tổng, loại). Mỗi dòng xuất hiện ở bộ tổng VÀ bộ con, nên nơi đọc
-- cộng dồn theo họ phải lọc bo_dung_cu_id = bo_tong_id (nếu không sẽ đếm đôi).
CREATE OR REPLACE VIEW public.v_cssd_bo_thanh_phan_hieu_luc
WITH (security_invoker = true) AS
WITH dong AS (
  SELECT b.id AS bo_dung_cu_id,
         COALESCE(b.parent_bo_id, b.id) AS bo_tong_id,
         c.id AS chi_tiet_id
    FROM public.cssd_dm_bo_dung_cu b
    JOIN public.cssd_dm_bo_dung_cu_chi_tiet c ON c.bo_dung_cu_id = b.id AND c.is_active = true
  UNION ALL
  SELECT k.id, k.parent_bo_id, c.id
    FROM public.cssd_dm_bo_dung_cu k
    JOIN public.cssd_dm_bo_dung_cu_chi_tiet c ON c.bo_dung_cu_id = k.parent_bo_id AND c.is_active = true
    LEFT JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
   WHERE k.parent_bo_id IS NOT NULL
     AND k.is_active IS TRUE
     AND (
       (k.vai_tro_tach = 'CHIU_NHIET' AND l.is_chiu_nhiet IS NOT FALSE)
       OR (k.vai_tro_tach = 'KHONG_CHIU_NHIET' AND l.is_chiu_nhiet IS FALSE)
     )
  UNION ALL
  SELECT k.parent_bo_id, k.parent_bo_id, c.id
    FROM public.cssd_dm_bo_dung_cu k
    JOIN public.cssd_dm_bo_dung_cu_chi_tiet c ON c.bo_dung_cu_id = k.id AND c.is_active = true
   WHERE k.parent_bo_id IS NOT NULL
)
SELECT d.bo_dung_cu_id,
       d.bo_tong_id,
       d.chi_tiet_id,
       c.bo_dung_cu_id AS nguon_bo_dung_cu_id,
       c.loai_dung_cu_id,
       c.ten_chi_tiet,
       c.ten_dung_cu_le,
       c.so_luong,
       c.so_luong + COALESCE(bd.so_luong_bien_dong, 0) AS so_luong_thuc_te,
       l.is_chiu_nhiet,
       c.ghi_chu,
       c.specs
  FROM dong d
  JOIN public.cssd_dm_bo_dung_cu_chi_tiet c ON c.id = d.chi_tiet_id
  LEFT JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
  LEFT JOIN LATERAL (
    SELECT SUM(g.so_luong_thay_doi)::integer AS so_luong_bien_dong
      FROM public.cssd_fact_kho_giao_dich g
      JOIN public.cssd_dm_bo_dung_cu gb ON gb.id = g.bo_dung_cu_id
     WHERE g.is_active = true
       AND g.loai_dung_cu_id = c.loai_dung_cu_id
       AND (gb.id = d.bo_tong_id OR gb.parent_bo_id = d.bo_tong_id)
  ) bd ON true;

COMMENT ON VIEW public.v_cssd_bo_thanh_phan_hieu_luc IS
  'C′: thành phần hiệu lực mỗi bộ (bộ con active dẫn xuất từ bộ tổng theo is_chiu_nhiet; NULL → chịu nhiệt). '
  'Chuyển tiếp: gồm cả dòng cũ còn nằm trên bộ con. so_luong_thuc_te theo sổ kho (họ bộ tổng, loại). '
  'CẢNH BÁO: cộng dồn theo họ phải lọc bo_dung_cu_id = bo_tong_id, nếu không đếm đôi.';

REVOKE ALL ON public.v_cssd_bo_thanh_phan_hieu_luc FROM PUBLIC, anon;
GRANT SELECT ON public.v_cssd_bo_thanh_phan_hieu_luc TO authenticated, service_role;

-- 3 + 4. Core đồng bộ (không kiểm quyền) + RPC công khai ---------------------------------------------
-- p_chi_vo_hieu = true (đường trigger quy trình): KHÔNG tạo/kích hoạt bộ con, KHÔNG tạo quy trình — chỉ vô hiệu
-- khi họ hết điều kiện tách. Lý do: nhiều RPC vô hiệu quy trình cũ rồi mới chèn quy trình mới; nếu core chèn
-- quy trình chen giữa sẽ vỡ exclusion ex_cssd_qt_mot_chu_trinh_active_bo lúc commit.
CREATE OR REPLACE FUNCTION public.fn_cssd_dong_bo_tach_nhiet_core(p_bo_tong_id uuid, p_chi_vo_hieu boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
    'quy_trinh_deactivated', v_qt_deactivated);
END;
$$;

COMMENT ON FUNCTION public.fn_cssd_dong_bo_tach_nhiet_core(uuid, boolean) IS
  'C′ S1b: lõi đồng bộ bộ con -CN/-KCN, KHÔNG kiểm quyền (chỉ gọi từ RPC đã kiểm quyền hoặc trigger). '
  'p_chi_vo_hieu=true: chỉ vô hiệu khi hết điều kiện tách. Vô hiệu bộ con kéo theo vô hiệu quy trình chờ tiếp nhận. '
  'Đặt cờ GUC cssd.dong_bo_tach_nhiet=on trong lúc chạy để trigger không đệ quy.';

REVOKE ALL ON FUNCTION public.fn_cssd_dong_bo_tach_nhiet_core(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cssd_dong_bo_tach_nhiet_core(uuid, boolean) TO service_role;

-- RPC công khai: chữ ký, SECURITY, search_path, ACL giữ nguyên; kiểm quyền rồi gọi core.
-- Kết quả thêm khóa 'quy_trinh_deactivated' (additive).
CREATE OR REPLACE FUNCTION public.fn_cssd_dong_bo_tach_nhiet(p_bo_tong_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT COALESCE(public.fn_sys_is_admin(), false) THEN
    RAISE EXCEPTION 'Không đủ quyền đồng bộ tách nhiệt bộ dụng cụ.' USING ERRCODE = '42501';
  END IF;
  RETURN public.fn_cssd_dong_bo_tach_nhiet_core(p_bo_tong_id, false);
END;
$$;

COMMENT ON FUNCTION public.fn_cssd_dong_bo_tach_nhiet(uuid) IS
  'C′ S1/S1b: đồng bộ bộ con -CN/-KCN theo thành phần hiệu lực của bộ tổng (không di chuyển dòng BOM). '
  'Cần tách → tạo/kích hoạt + tạo quy trình TIEP_NHAN nếu thiếu; không cần → vô hiệu bộ con (và quy trình chờ tiếp nhận), '
  'bộ con có quy trình đang chạy vào pending. Chỉ service_role/ADMIN; lõi ở fn_cssd_dong_bo_tach_nhiet_core.';

REVOKE ALL ON FUNCTION public.fn_cssd_dong_bo_tach_nhiet(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cssd_dong_bo_tach_nhiet(uuid) TO service_role;

-- 4. Quy trình bộ con đóng vòng → đồng bộ (chỉ vô hiệu) ------------------------------------------------
-- Kích khi quy trình của bộ con tách nhiệt ĐANG active: (a) is_active true→false, hoặc (b) chuyển VÀO trạng thái
-- chờ tiếp nhận (TIEP_NHAN, thoi_gian_tiep_nhan NULL). Bộ con pending sẽ được vô hiệu nếu họ hết điều kiện tách
-- và không còn quy trình đang chạy (vd RPC vô hiệu cũ + chèn mới thì quy trình mới vẫn giữ bộ con pending).
CREATE OR REPLACE FUNCTION public.fn_cssd_qt_bo_con_dong_bo_tach_nhiet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tong uuid;
  v_tram uuid;
  v_old_cho boolean;
  v_new_cho boolean;
BEGIN
  IF current_setting('cssd.dong_bo_tach_nhiet', true) = 'on' THEN
    RETURN NULL;
  END IF;

  SELECT k.parent_bo_id INTO v_tong
    FROM public.cssd_dm_bo_dung_cu k
   WHERE k.id = NEW.bo_dung_cu_id
     AND k.parent_bo_id IS NOT NULL
     AND k.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')
     AND k.is_active IS TRUE;
  IF v_tong IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_tram FROM public.cssd_dm_tram WHERE ma_tram = 'TIEP_NHAN' LIMIT 1;
  v_old_cho := OLD.is_active IS TRUE AND OLD.tram_hien_tai_id IS NOT DISTINCT FROM v_tram
               AND v_tram IS NOT NULL AND OLD.thoi_gian_tiep_nhan IS NULL;
  v_new_cho := NEW.is_active IS TRUE AND NEW.tram_hien_tai_id IS NOT DISTINCT FROM v_tram
               AND v_tram IS NOT NULL AND NEW.thoi_gian_tiep_nhan IS NULL;

  IF (OLD.is_active IS TRUE AND NEW.is_active IS NOT TRUE) OR (v_new_cho AND NOT v_old_cho) THEN
    PERFORM public.fn_cssd_dong_bo_tach_nhiet_core(v_tong, true);
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_qt_bo_con_dong_bo_tach_nhiet() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cssd_qt_bo_con_dong_bo_tach_nhiet ON public.cssd_fact_quy_trinh;
CREATE TRIGGER trg_cssd_qt_bo_con_dong_bo_tach_nhiet
  AFTER UPDATE OF is_active, tram_hien_tai_id, thoi_gian_tiep_nhan ON public.cssd_fact_quy_trinh
  FOR EACH ROW
  WHEN (NEW.bo_dung_cu_id IS NOT NULL AND (
        OLD.is_active IS DISTINCT FROM NEW.is_active
     OR OLD.tram_hien_tai_id IS DISTINCT FROM NEW.tram_hien_tai_id
     OR OLD.thoi_gian_tiep_nhan IS DISTINCT FROM NEW.thoi_gian_tiep_nhan))
  EXECUTE FUNCTION public.fn_cssd_qt_bo_con_dong_bo_tach_nhiet();

-- 5. Bật/tắt bộ tổng → đồng bộ bộ con ------------------------------------------------------------------
-- Tắt: core (v_can=false vì bộ tổng inactive) vô hiệu bộ con không có quy trình đang chạy (+ quy trình chờ).
-- Bật lại: chỉ gọi core khi họ ĐÃ có bộ con CN/KCN (tạo lại/kích hoạt lại); bộ tổng chưa từng tách thì không tự
-- tách ở đây (đường tách đầu tiên vẫn là RPC/hook S3). Local khi viết: 0 bộ tổng có cả 2 phía nhiệt mà chưa có con.
-- Lỗi của core (vd mã -CN đã dùng cho bộ khác) làm UPDATE bộ tổng thất bại với thông báo rõ.
CREATE OR REPLACE FUNCTION public.fn_cssd_bo_tong_bat_tat_dong_bo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('cssd.dong_bo_tach_nhiet', true) = 'on' THEN
    RETURN NULL;
  END IF;
  IF NEW.is_active IS NOT TRUE
     OR EXISTS (SELECT 1 FROM public.cssd_dm_bo_dung_cu k
                 WHERE k.parent_bo_id = NEW.id
                   AND k.vai_tro_tach IN ('CHIU_NHIET', 'KHONG_CHIU_NHIET')) THEN
    PERFORM public.fn_cssd_dong_bo_tach_nhiet_core(NEW.id, false);
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_bo_tong_bat_tat_dong_bo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cssd_bo_tong_bat_tat_dong_bo ON public.cssd_dm_bo_dung_cu;
CREATE TRIGGER trg_cssd_bo_tong_bat_tat_dong_bo
  AFTER UPDATE OF is_active ON public.cssd_dm_bo_dung_cu
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active AND NEW.parent_bo_id IS NULL)
  EXECUTE FUNCTION public.fn_cssd_bo_tong_bat_tat_dong_bo();

NOTIFY pgrst, 'reload schema';

-- CHƯA APPLY PROD — chờ PO. Apply SAU 20261111100000 và cùng/sau lát S2 (dời dòng BOM khỏi bộ con):
-- trigger 2a chặn INSERT dòng BOM lên bộ con → các đường TS còn ghi theo id bộ con (import, master-crud,
-- set-bom-apply, catalog-de-nghi-apply) sẽ lỗi cho tới khi S2/S3 chuyển sang ghi bộ tổng.
-- Kiểm prod (chỉ đọc) — mong đợi: ho_trung_loai = 0 (nếu > 0 migration vẫn chạy, chỉ chặn thao tác mới);
-- dong_tren_bo_con = số dòng S2 phải dời; tong_tron_chua_con = số bộ tổng KHÔNG tự tách khi bật lại.
--   SELECT
--     (SELECT count(*) FROM (SELECT coalesce(b.parent_bo_id, b.id), c.loai_dung_cu_id
--        FROM cssd_dm_bo_dung_cu_chi_tiet c JOIN cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
--       WHERE c.is_active AND c.loai_dung_cu_id IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1) x) AS ho_trung_loai,
--     (SELECT count(*) FROM cssd_dm_bo_dung_cu_chi_tiet c JOIN cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
--       WHERE c.is_active AND b.parent_bo_id IS NOT NULL) AS dong_tren_bo_con,
--     (SELECT count(*) FROM cssd_dm_bo_dung_cu b
--       WHERE b.parent_bo_id IS NULL
--         AND NOT EXISTS (SELECT 1 FROM cssd_dm_bo_dung_cu k WHERE k.parent_bo_id = b.id)
--         AND EXISTS (SELECT 1 FROM cssd_dm_bo_dung_cu_chi_tiet c LEFT JOIN cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
--                      WHERE c.bo_dung_cu_id = b.id AND c.is_active AND l.is_chiu_nhiet IS FALSE)
--         AND EXISTS (SELECT 1 FROM cssd_dm_bo_dung_cu_chi_tiet c LEFT JOIN cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
--                      WHERE c.bo_dung_cu_id = b.id AND c.is_active AND l.is_chiu_nhiet IS NOT FALSE)) AS tong_tron_chua_con,
--     (SELECT count(*) FROM pg_trigger WHERE tgname IN ('trg_cssd_bom_chi_tiet_guard_ho',
--        'trg_cssd_qt_bo_con_dong_bo_tach_nhiet', 'trg_cssd_bo_tong_bat_tat_dong_bo')) AS da_co_trigger;
