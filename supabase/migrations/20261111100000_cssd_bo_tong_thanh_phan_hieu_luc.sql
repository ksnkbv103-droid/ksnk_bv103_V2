-- Lát S1 / plan C′ (PO đã duyệt): tách nhiệt bộ dụng cụ — BOM chỉ ghi trên bộ tổng, bộ con dẫn xuất.
-- Additive, KHÔNG chuyển dữ liệu (S2). Không đổi chữ ký hàm có sẵn.
--
-- Mô hình C′:
--   * BOM (cssd_dm_bo_dung_cu_chi_tiet) chỉ ghi trên bộ tổng (parent_bo_id IS NULL).
--   * Bộ con (parent_bo_id = bộ tổng, vai_tro_tach ∈ {CHIU_NHIET, KHONG_CHIU_NHIET}) không có dòng riêng;
--     thành phần = dòng của bộ tổng lọc theo cssd_dm_loai_dung_cu.is_chiu_nhiet.
--   * Sổ kho cssd_fact_kho_giao_dich luôn quy về bộ tổng (trigger dưới).
-- Giai đoạn chuyển tiếp (trước S2): dòng cũ còn nằm trên bộ con vẫn được tính (UNION, xem view).
--
-- Giả định (ghi rõ):
--   G1. Dòng có loai_dung_cu_id NULL hoặc loại có is_chiu_nhiet NULL → xếp phía CHỊU NHIỆT
--       (khớp TS cssd-heat-split-apply.ts: isChiuNhiet = loai?.is_chiu_nhiet !== false).
--   G2. Chỉ một tầng cha–con (kiểm local: 0 bộ con có cha cũng là bộ con).
--   G3. vai_tro_tach = 'KHONG_CHIU_NHIET_EO' (CHECK cho phép, local 0 dòng): KHÔNG dẫn xuất, RPC không đụng;
--       bộ đó chỉ có dòng của chính nó.
--   G4. Biến động sổ kho tính theo (họ bộ tổng, loại). Một loại chỉ thuộc một phía nhiệt nên không đếm đôi,
--       với điều kiện trong một họ mỗi loại chỉ có một dòng active (local: 0 họ vi phạm). S2 phải giữ bất biến này.

-- 1. Bộ tổng của một bộ ----------------------------------------------------------------------------
-- SECURITY DEFINER: bảng có forced RLS; hàm không được trả NULL cho id khác NULL (fallback = chính id),
-- nếu không trigger sổ kho sẽ xóa bo_dung_cu_id và lật nhánh CHECK NHAP_KHO.
CREATE OR REPLACE FUNCTION public.fn_cssd_bo_tong_id(p_bo_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
           WHEN p_bo_id IS NULL THEN NULL
           ELSE COALESCE(
             (SELECT COALESCE(b.parent_bo_id, b.id) FROM public.cssd_dm_bo_dung_cu b WHERE b.id = p_bo_id),
             p_bo_id)
         END;
$$;

COMMENT ON FUNCTION public.fn_cssd_bo_tong_id(uuid) IS
  'C′: bộ tổng = coalesce(parent_bo_id, id); id không tồn tại → trả chính id. Một tầng cha–con.';

REVOKE ALL ON FUNCTION public.fn_cssd_bo_tong_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_cssd_bo_tong_id(uuid) TO authenticated, service_role;

-- 1b. Dòng BOM hiệu lực cho (bộ, loại) trong cả họ bộ tổng ---------------------------------------
-- Dùng chung cho fn_cssd_ensure_chi_tiet_for_ledger, fn_cssd_set_thuc_te, fn_cssd_transfer_bom_metadata_by_id
-- để không chèn dòng trùng loại lên bộ tổng khi dòng cũ còn nằm trên bộ con.
-- Ưu tiên: dòng trên chính bộ được hỏi → dòng trên bộ tổng → dòng trên bộ anh em.
CREATE OR REPLACE FUNCTION public.fn_cssd_bo_chi_tiet_hieu_luc(p_bo_id uuid, p_loai_dung_cu_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH t AS (SELECT public.fn_cssd_bo_tong_id(p_bo_id) AS id)
  SELECT c.id
    FROM public.cssd_dm_bo_dung_cu_chi_tiet c
    JOIN public.cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
    CROSS JOIN t
   WHERE c.is_active = true
     AND c.loai_dung_cu_id = p_loai_dung_cu_id
     AND (b.id = t.id OR b.parent_bo_id = t.id)
   ORDER BY (b.id = p_bo_id) DESC, (b.id = t.id) DESC, c.created_at, c.id
   LIMIT 1;
$$;

COMMENT ON FUNCTION public.fn_cssd_bo_chi_tiet_hieu_luc(uuid, uuid) IS
  'C′: id dòng BOM active của loại trong họ bộ tổng (ưu tiên bộ được hỏi, rồi bộ tổng, rồi anh em).';

REVOKE ALL ON FUNCTION public.fn_cssd_bo_chi_tiet_hieu_luc(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cssd_bo_chi_tiet_hieu_luc(uuid, uuid) TO service_role;

-- 2. View thành phần hiệu lực ----------------------------------------------------------------------
-- Mỗi bộ được hỏi (bo_dung_cu_id):
--   (1) dòng active nằm trên chính nó (bộ thường; bộ tổng; dòng cũ còn trên bộ con — chuyển tiếp, không lọc);
--   (2) bộ con CN/KCN: dòng active của bộ tổng lọc nhiệt (G1: NULL → chịu nhiệt);
--   (3) bộ tổng: dòng cũ còn nằm trên bộ con bất kỳ (chuyển tiếp), để thành phần bộ tổng = cả họ.
-- so_luong_thuc_te = so_luong + biến động sổ kho active theo (họ bộ tổng, loại) (G4).
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
  'C′: thành phần hiệu lực mỗi bộ (bộ con dẫn xuất từ bộ tổng theo is_chiu_nhiet; NULL → chịu nhiệt). '
  'Chuyển tiếp: gồm cả dòng cũ còn nằm trên bộ con. so_luong_thuc_te theo sổ kho (họ bộ tổng, loại).';

REVOKE ALL ON public.v_cssd_bo_thanh_phan_hieu_luc FROM PUBLIC, anon;
GRANT SELECT ON public.v_cssd_bo_thanh_phan_hieu_luc TO authenticated, service_role;

-- 3. Sổ kho luôn quy về bộ tổng --------------------------------------------------------------------
-- CHECK cssd_fact_kho_giao_dich_dau_so_luong_check chỉ xét bo_dung_cu_id NULL / NOT NULL → không đổi
-- (fn_cssd_bo_tong_id không trả NULL cho id khác NULL). FK thỏa vì bộ tổng tồn tại.
CREATE OR REPLACE FUNCTION public.fn_cssd_kho_gd_quy_ve_bo_tong()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.bo_dung_cu_id IS NOT NULL THEN
    NEW.bo_dung_cu_id := public.fn_cssd_bo_tong_id(NEW.bo_dung_cu_id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cssd_kho_gd_quy_ve_bo_tong() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cssd_kho_gd_quy_ve_bo_tong ON public.cssd_fact_kho_giao_dich;
CREATE TRIGGER trg_cssd_kho_gd_quy_ve_bo_tong
  BEFORE INSERT OR UPDATE OF bo_dung_cu_id ON public.cssd_fact_kho_giao_dich
  FOR EACH ROW EXECUTE FUNCTION public.fn_cssd_kho_gd_quy_ve_bo_tong();

-- 3b. Các hàm ghi sổ phải nhìn cùng khóa (bộ tổng) với trigger -------------------------------------
-- fn_cssd_kho_lock: khóa advisory theo bộ tổng (bộ con và bộ tổng dùng chung một khóa).
CREATE OR REPLACE FUNCTION public.fn_cssd_kho_lock(p_bo_dung_cu_id uuid, p_loai_dung_cu_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_advisory_xact_lock(
    hashtextextended('cssd_kho:' || public.fn_cssd_bo_tong_id(p_bo_dung_cu_id)::text || ':' || p_loai_dung_cu_id::text, 0)
  );
$$;

-- fn_cssd_set_thuc_te: số thực tế = so_luong dòng hiệu lực trong họ + sổ kho active của (họ bộ tổng, loại).
-- Dùng để kiểm hạn trong fn_cssd_apply_instrument_ledger_tx; nếu để theo id bộ con thì sau trigger
-- biến động mới (đã quy về bộ tổng) không bao giờ bị trừ → báo hỏng/mất vượt số thật.
CREATE OR REPLACE FUNCTION public.fn_cssd_set_thuc_te(p_bo_dung_cu_id uuid, p_loai_dung_cu_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT SUM(tx.so_luong_thay_doi)::integer
      FROM public.cssd_fact_kho_giao_dich tx
      JOIN public.cssd_dm_bo_dung_cu b ON b.id = tx.bo_dung_cu_id
     WHERE tx.loai_dung_cu_id = p_loai_dung_cu_id
       AND tx.is_active = true
       AND (b.id = public.fn_cssd_bo_tong_id(p_bo_dung_cu_id)
            OR b.parent_bo_id = public.fn_cssd_bo_tong_id(p_bo_dung_cu_id))
  ), 0)
  + COALESCE((
    SELECT ct.so_luong
      FROM public.cssd_dm_bo_dung_cu_chi_tiet ct
     WHERE ct.id = public.fn_cssd_bo_chi_tiet_hieu_luc(p_bo_dung_cu_id, p_loai_dung_cu_id)
  ), 0);
$$;

-- fn_cssd_ensure_chi_tiet_for_ledger: tìm dòng trong cả họ; chỉ chèn (so_luong 0) lên BỘ TỔNG khi cả họ chưa có loại.
CREATE OR REPLACE FUNCTION public.fn_cssd_ensure_chi_tiet_for_ledger(p_bo_dung_cu_id uuid, p_loai_dung_cu_id uuid, p_ten_dung_cu_le text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chi uuid;
  v_ten text;
  v_tong uuid;
BEGIN
  IF p_bo_dung_cu_id IS NULL OR p_loai_dung_cu_id IS NULL THEN
    RETURN;
  END IF;
  v_tong := public.fn_cssd_bo_tong_id(p_bo_dung_cu_id);

  -- 1) loai row lock (same TX; BO_SUNG may already hold it via kho UPDATE)
  PERFORM 1
    FROM public.cssd_dm_loai_dung_cu
   WHERE id = p_loai_dung_cu_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy loại dụng cụ.';
  END IF;

  -- 2) existing active chi_tiet trong họ bộ tổng (kể cả dòng cũ còn trên bộ con) — lock
  v_chi := public.fn_cssd_bo_chi_tiet_hieu_luc(p_bo_dung_cu_id, p_loai_dung_cu_id);
  IF v_chi IS NOT NULL THEN
    PERFORM 1 FROM public.cssd_dm_bo_dung_cu_chi_tiet WHERE id = v_chi FOR UPDATE;
    RETURN;
  END IF;

  SELECT COALESCE(
           NULLIF(trim(COALESCE(p_ten_dung_cu_le, '')), ''),
           NULLIF(trim(l.ten_loai), ''),
           '—'
         )
    INTO v_ten
    FROM public.cssd_dm_loai_dung_cu l
   WHERE l.id = p_loai_dung_cu_id;

  BEGIN
    INSERT INTO public.cssd_dm_bo_dung_cu_chi_tiet (
      bo_dung_cu_id,
      loai_dung_cu_id,
      ten_dung_cu_le,
      ten_chi_tiet,
      so_luong,
      is_active,
      specs,
      created_at,
      updated_at
    ) VALUES (
      v_tong,
      p_loai_dung_cu_id,
      COALESCE(v_ten, '—'),
      COALESCE(v_ten, '—'),
      0,
      true,
      '{}'::jsonb,
      now(),
      now()
    );
  EXCEPTION WHEN unique_violation THEN
    -- concurrent ensure under partial unique — lock winner and continue
    v_chi := public.fn_cssd_bo_chi_tiet_hieu_luc(p_bo_dung_cu_id, p_loai_dung_cu_id);
    PERFORM 1 FROM public.cssd_dm_bo_dung_cu_chi_tiet WHERE id = v_chi FOR UPDATE;
  END;
END;
$$;

-- fn_cssd_transfer_bom_metadata_by_id: giữ nguyên, chỉ đổi tra dòng đích (v_den_chi) sang dòng hiệu lực
-- trong họ, khớp với chỗ fn_cssd_ensure_chi_tiet_for_ledger vừa chèn (bộ tổng) → không mất chi_tiet_id.
CREATE OR REPLACE FUNCTION public.fn_cssd_transfer_bom_metadata_by_id(p_tu_id uuid, p_den_id uuid, p_loai_dung_cu_id uuid, p_chi_tiet_tu_id uuid, p_ten text, p_qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tu_meta jsonb;
  v_den_meta jsonb;
  v_den_bo uuid;
  v_tu_lines jsonb;
  v_den_lines jsonb;
  v_tu_idx integer;
  v_den_idx integer;
  v_thuc integer;
  v_den_chi uuid;
  v_ten text := NULLIF(trim(COALESCE(p_ten, '')), '');
  v_uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  IF p_loai_dung_cu_id IS NULL OR COALESCE(p_qty, 0) < 1 THEN
    RAISE EXCEPTION 'Thiếu loại dụng cụ hoặc số lượng không hợp lệ.';
  END IF;
  IF p_tu_id = p_den_id THEN
    RAISE EXCEPTION 'Quy trình nguồn và đích trùng nhau.';
  END IF;

  PERFORM public.fn_cssd_ensure_bom_lines(p_tu_id);
  PERFORM public.fn_cssd_ensure_bom_lines(p_den_id);

  SELECT COALESCE(metadata, '{}'::jsonb) INTO v_tu_meta
    FROM public.cssd_fact_quy_trinh WHERE id = p_tu_id FOR UPDATE;
  SELECT COALESCE(metadata, '{}'::jsonb), bo_dung_cu_id INTO v_den_meta, v_den_bo
    FROM public.cssd_fact_quy_trinh WHERE id = p_den_id FOR UPDATE;

  v_tu_lines := v_tu_meta->'bom_lines';
  v_den_lines := v_den_meta->'bom_lines';
  IF jsonb_typeof(v_tu_lines) IS DISTINCT FROM 'array' THEN v_tu_lines := '[]'::jsonb; END IF;
  IF jsonb_typeof(v_den_lines) IS DISTINCT FROM 'array' THEN v_den_lines := '[]'::jsonb; END IF;

  -- Nguồn: ưu tiên đúng chi_tiet_id; rồi dòng có chi_tiet cùng loại; tên chỉ dùng cho dòng cũ không có chi_tiet_id hợp lệ.
  SELECT e.ord - 1 INTO v_tu_idx
    FROM jsonb_array_elements(v_tu_lines) WITH ORDINALITY AS e(line, ord)
    LEFT JOIN public.cssd_dm_bo_dung_cu_chi_tiet c
      ON (e.line->>'chi_tiet_id') ~ v_uuid_re AND c.id = (e.line->>'chi_tiet_id')::uuid
   WHERE (p_chi_tiet_tu_id IS NOT NULL AND c.id = p_chi_tiet_tu_id)
      OR c.loai_dung_cu_id = p_loai_dung_cu_id
      OR (c.id IS NULL AND v_ten IS NOT NULL AND trim(e.line->>'ten_dung_cu_le') = v_ten)
   ORDER BY (p_chi_tiet_tu_id IS NOT NULL AND c.id = p_chi_tiet_tu_id) DESC,
            (c.loai_dung_cu_id = p_loai_dung_cu_id) DESC NULLS LAST,
            e.ord
   LIMIT 1;
  IF v_tu_idx IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy cấu phần trên bộ nguồn.';
  END IF;

  v_thuc := COALESCE((v_tu_lines->v_tu_idx->>'so_luong_thuc_te')::numeric, 0)::integer;
  IF v_thuc < p_qty THEN
    RAISE EXCEPTION 'Không đủ số lượng thực tế trên nguồn (còn %).', v_thuc;
  END IF;
  v_tu_lines := jsonb_set(v_tu_lines, ARRAY[v_tu_idx::text, 'so_luong_thuc_te'], to_jsonb(v_thuc - p_qty), false);

  -- Đích: dòng có chi_tiet cùng loại (id), tên chỉ cho dòng cũ không có chi_tiet_id hợp lệ.
  SELECT e.ord - 1 INTO v_den_idx
    FROM jsonb_array_elements(v_den_lines) WITH ORDINALITY AS e(line, ord)
    LEFT JOIN public.cssd_dm_bo_dung_cu_chi_tiet c
      ON (e.line->>'chi_tiet_id') ~ v_uuid_re AND c.id = (e.line->>'chi_tiet_id')::uuid
   WHERE c.loai_dung_cu_id = p_loai_dung_cu_id
      OR (c.id IS NULL AND v_ten IS NOT NULL AND trim(e.line->>'ten_dung_cu_le') = v_ten)
   ORDER BY (c.loai_dung_cu_id = p_loai_dung_cu_id) DESC NULLS LAST, e.ord
   LIMIT 1;

  IF v_den_idx IS NOT NULL THEN
    v_thuc := COALESCE((v_den_lines->v_den_idx->>'so_luong_thuc_te')::numeric, 0)::integer;
    v_den_lines := jsonb_set(v_den_lines, ARRAY[v_den_idx::text, 'so_luong_thuc_te'], to_jsonb(v_thuc + p_qty), false);
  ELSE
    IF v_den_bo IS NOT NULL THEN
      -- C′: dòng hiệu lực trong họ bộ tổng (S1 — trước đây chỉ tìm trên chính v_den_bo).
      v_den_chi := public.fn_cssd_bo_chi_tiet_hieu_luc(v_den_bo, p_loai_dung_cu_id);
    END IF;
    v_den_lines := v_den_lines || jsonb_build_array(jsonb_build_object(
      'line_key', COALESCE(v_den_chi, gen_random_uuid())::text,
      'chi_tiet_id', v_den_chi::text,
      'ten_dung_cu_le', COALESCE(v_ten, v_tu_lines->v_tu_idx->>'ten_dung_cu_le', '—'),
      'so_luong_ke_hoach', 0,
      'so_luong_thuc_te', p_qty
    ));
  END IF;

  UPDATE public.cssd_fact_quy_trinh
     SET metadata = jsonb_set(v_tu_meta, '{bom_lines}', v_tu_lines, true), updated_at = now()
   WHERE id = p_tu_id;
  UPDATE public.cssd_fact_quy_trinh
     SET metadata = jsonb_set(v_den_meta, '{bom_lines}', v_den_lines, true), updated_at = now()
   WHERE id = p_den_id;
END;
$$;

-- 4. RPC đồng bộ bộ con tách nhiệt ------------------------------------------------------------------
-- Không di chuyển dòng BOM. Quyền: chỉ service_role (app gọi bằng admin client sau verifyPermission)
-- hoặc ADMIN; mẫu 20261105120000 (RPC ghi danh mục CSSD). Ghi danh mục bộ vốn chỉ ADMIN theo RLS.
-- Bộ con: sao chép như ensureComponentBo (TS) + loai_bao_goi_id (yêu cầu S1, TS không sao chép).
-- Quy trình bộ con: tạo ngay trong SQL, tương đương ensureQuyTrinhForComponent nhánh không có quy trình mẹ
-- (trạm TIEP_NHAN, ma_qr_quy_trinh = ma_qr_bo_vinh_vien = ma_bo con), chỉ khi chưa có quy trình active cùng mã.
-- "Đang chạy" (không vô hiệu được): quy trình active của bộ con, trừ quy trình chờ tiếp nhận
-- (trạm TIEP_NHAN và thoi_gian_tiep_nhan IS NULL). Bộ đã cấp phát (đang ở khoa) vẫn tính là đang chạy.
CREATE OR REPLACE FUNCTION public.fn_cssd_dong_bo_tach_nhiet(p_bo_tong_id uuid)
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
  v_created jsonb := '[]'::jsonb;
  v_reactivated jsonb := '[]'::jsonb;
  v_deactivated jsonb := '[]'::jsonb;
  v_pending jsonb := '[]'::jsonb;
  v_qt_created jsonb := '[]'::jsonb;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT COALESCE(public.fn_sys_is_admin(), false) THEN
    RAISE EXCEPTION 'Không đủ quyền đồng bộ tách nhiệt bộ dụng cụ.' USING ERRCODE = '42501';
  END IF;
  IF p_bo_tong_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu bộ dụng cụ.' USING ERRCODE = '22004';
  END IF;

  v_tong_id := public.fn_cssd_bo_tong_id(p_bo_tong_id);
  SELECT * INTO v_tong FROM public.cssd_dm_bo_dung_cu WHERE id = v_tong_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy bộ dụng cụ %.', p_bo_tong_id USING ERRCODE = 'P0002';
  END IF;
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

  IF v_can THEN
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
  ELSE
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
        v_deactivated := v_deactivated || jsonb_build_array(jsonb_build_object(
          'id', v_child.id, 'ma_bo', v_child.ma_bo, 'vai_tro_tach', v_child.vai_tro_tach));
      END IF;
      v_run := NULL;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'bo_tong_id', v_tong_id,
    'can_tach', v_can,
    'created', v_created,
    'reactivated', v_reactivated,
    'deactivated', v_deactivated,
    'pending', v_pending,
    'quy_trinh_created', v_qt_created);
END;
$$;

COMMENT ON FUNCTION public.fn_cssd_dong_bo_tach_nhiet(uuid) IS
  'C′ S1: đồng bộ bộ con -CN/-KCN theo thành phần hiệu lực của bộ tổng (không di chuyển dòng BOM). '
  'Cần tách → tạo/kích hoạt + tạo quy trình TIEP_NHAN nếu thiếu; không cần → vô hiệu, bộ con có quy trình đang chạy vào pending. '
  'Chỉ service_role/ADMIN.';

REVOKE ALL ON FUNCTION public.fn_cssd_dong_bo_tach_nhiet(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cssd_dong_bo_tach_nhiet(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';

-- CHƯA APPLY PROD — chờ PO. KHÔNG apply prod trước lát S4: sau trigger, mọi chỗ đọc sổ kho theo id bộ con
-- (v_cssd_bo_dung_cu_bien_dong, v_cssd_bo_dung_cu_chi_tiet_realtime, app) không thấy biến động mới của bộ đã tách.
-- Kiểm prod (chỉ đọc) trước khi apply — mong đợi 0 | 0 | 0 | 0:
--   SELECT
--     (SELECT count(*) FROM cssd_dm_bo_dung_cu c JOIN cssd_dm_bo_dung_cu p ON p.id = c.parent_bo_id
--       WHERE p.parent_bo_id IS NOT NULL) AS nhieu_tang,
--     (SELECT count(*) FROM cssd_fact_kho_giao_dich g JOIN cssd_dm_bo_dung_cu b ON b.id = g.bo_dung_cu_id
--       WHERE b.parent_bo_id IS NOT NULL AND g.is_active) AS so_kho_tren_bo_con,
--     (SELECT count(*) FROM (SELECT coalesce(b.parent_bo_id, b.id), c.loai_dung_cu_id
--        FROM cssd_dm_bo_dung_cu_chi_tiet c JOIN cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
--       WHERE c.is_active AND c.loai_dung_cu_id IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1) x) AS ho_trung_loai,
--     (SELECT count(*) FROM pg_proc WHERE proname IN ('fn_cssd_bo_tong_id', 'fn_cssd_dong_bo_tach_nhiet')) AS da_co_ham;
