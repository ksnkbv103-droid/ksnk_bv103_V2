-- HC-C (PO 2026-10-28): phiếu nhập/xuất kho hóa chất qua duyệt CHO_DUYET → DA_DUYET | TU_CHOI.
-- Quyết định PO (đã chốt):
--  Q1. Quyền duyệt = sys_permissions CSSD_HOA_CHAT.approve (gán ADMIN; PO tự gán cho CNK / HC trưởng / Tổ trưởng CSSD).
--      Server kiểm theo quyền, không theo tên vai trò.
--  Q2. Người duyệt ≠ người lập, TRỪ khi cả hệ thống chỉ có đúng 1 người có quyền duyệt → cho tự duyệt,
--      đánh dấu tu_duyet_ngoai_le = true. Đếm theo dữ liệu thật: nhân sự active + vai trò active + quyền.
--  Q3. Tồn chỉ tính phiếu DA_DUYET. Dòng cũ backfill DA_DUYET (tồn không đổi).
--  Q4. Ghi sổ trực tiếp bị chặn (RLS + REVOKE); chỉ qua RPC SECURITY DEFINER (service_role).
-- Giả định (chưa hỏi PO): DIEU_CHINH (kiểm kê) giữ ghi ngay DA_DUYET như cũ — không qua hàng chờ.
-- Không BEGIN/COMMIT trong file: db push tự bọc transaction; thử nghiệm bằng \i trong BEGIN…ROLLBACK.

-- 1) Quyền duyệt (mẫu 20261005154200_adm04_approve_permissions_seed.sql)
INSERT INTO public.sys_permissions (module_name, action, description)
VALUES ('CSSD_HOA_CHAT', 'approve', 'Duyệt / từ chối phiếu nhập·xuất kho hóa chất (≠ người lập)')
ON CONFLICT (module_name, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.sys_roles r
 CROSS JOIN public.sys_permissions p
 WHERE r.name = 'ADMIN'
   AND p.module_name = 'CSSD_HOA_CHAT' AND p.action = 'approve'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 2) Cột trạng thái + người lập/duyệt (additive). DEFAULT 'DA_DUYET' khi ADD = backfill dòng cũ.
ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
  ADD COLUMN IF NOT EXISTS trang_thai varchar(16) NOT NULL DEFAULT 'DA_DUYET',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS nguoi_duyet_id uuid,
  ADD COLUMN IF NOT EXISTS duyet_at timestamptz,
  ADD COLUMN IF NOT EXISTS ly_do_tu_choi text,
  ADD COLUMN IF NOT EXISTS tu_duyet_ngoai_le boolean NOT NULL DEFAULT false;

-- Dòng mới mặc định chờ duyệt (RPC ghi tường minh; default chỉ là lưới an toàn).
ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich ALTER COLUMN trang_thai SET DEFAULT 'CHO_DUYET';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cssd_fact_kho_hc_trang_thai_check') THEN
    ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
      ADD CONSTRAINT cssd_fact_kho_hc_trang_thai_check
      CHECK (trang_thai IN ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cssd_fact_kho_hc_tu_choi_ly_do_check') THEN
    ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
      ADD CONSTRAINT cssd_fact_kho_hc_tu_choi_ly_do_check
      CHECK (trang_thai <> 'TU_CHOI' OR nullif(btrim(coalesce(ly_do_tu_choi, '')), '') IS NOT NULL);
  END IF;
END $$;

-- Backfill người lập best-effort từ nhân sự thực hiện (HC-1); dòng không map để NULL.
UPDATE public.cssd_fact_kho_hoa_chat_giao_dich g
   SET created_by = ns.auth_user_id
  FROM public.mdm_nhan_su ns
 WHERE g.created_by IS NULL AND g.nguoi_thuc_hien_id = ns.id AND ns.auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fact_kho_hc_cho_duyet
  ON public.cssd_fact_kho_hoa_chat_giao_dich (created_at DESC) WHERE trang_thai = 'CHO_DUYET';

COMMENT ON COLUMN public.cssd_fact_kho_hoa_chat_giao_dich.trang_thai IS
  'HC-C: CHO_DUYET (không tính tồn) | DA_DUYET (tính tồn) | TU_CHOI. Dòng trước HC-C backfill DA_DUYET.';
COMMENT ON COLUMN public.cssd_fact_kho_hoa_chat_giao_dich.created_by IS 'HC-C: auth user id người lập phiếu.';
COMMENT ON COLUMN public.cssd_fact_kho_hoa_chat_giao_dich.nguoi_duyet_id IS 'HC-C: auth user id người duyệt / từ chối.';
COMMENT ON COLUMN public.cssd_fact_kho_hoa_chat_giao_dich.tu_duyet_ngoai_le IS
  'HC-C: true = người lập tự duyệt vì hệ thống chỉ có đúng 1 người có quyền CSSD_HOA_CHAT.approve.';

-- 3) Tồn lô chỉ tính DA_DUYET (giữ cột + security_invoker).
CREATE OR REPLACE VIEW public.v_cssd_kho_hoa_chat_ton_lo
WITH (security_invoker = true) AS
SELECT dm_hoa_chat_id, ma_lo, han_su_dung, sum(so_luong_co_dau) AS ton_so_luong
  FROM public.cssd_fact_kho_hoa_chat_giao_dich g
 WHERE COALESCE(is_active, true) = true
   AND trang_thai = 'DA_DUYET'
 GROUP BY dm_hoa_chat_id, ma_lo, han_su_dung;

-- 4) Siết ghi trực tiếp: chỉ đọc qua RLS; ghi chỉ qua RPC (service_role / definer).
DROP POLICY IF EXISTS cssd_fact_kho_hoa_chat_giao_dich_insert ON public.cssd_fact_kho_hoa_chat_giao_dich;
DROP POLICY IF EXISTS cssd_fact_kho_hoa_chat_giao_dich_update ON public.cssd_fact_kho_hoa_chat_giao_dich;
DROP POLICY IF EXISTS cssd_fact_kho_hoa_chat_giao_dich_delete ON public.cssd_fact_kho_hoa_chat_giao_dich;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.cssd_fact_kho_hoa_chat_giao_dich FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.v_cssd_kho_hoa_chat_ton_lo FROM anon, authenticated;

-- 5) Hàm quyền duyệt theo dữ liệu thật (không dựa auth.uid(): RPC gọi bằng service_role).
CREATE OR REPLACE FUNCTION public.fn_cssd_hoa_chat_is_approver(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1
      FROM public.mdm_nhan_su ns
      JOIN public.sys_user_roles ur       ON ur.user_id = ns.auth_user_id
      JOIN public.sys_roles r             ON r.id = ur.role_id
      JOIN public.sys_role_permissions rp ON rp.role_id = ur.role_id
      JOIN public.sys_permissions p       ON p.id = rp.permission_id
     WHERE ns.auth_user_id = p_user_id
       AND ns.is_active = true
       AND r.is_active = true
       AND p.module_name = 'CSSD_HOA_CHAT'
       AND p.action = 'approve'
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_cssd_hoa_chat_approver_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT count(DISTINCT ns.auth_user_id)::integer
    FROM public.mdm_nhan_su ns
    JOIN public.sys_user_roles ur       ON ur.user_id = ns.auth_user_id
    JOIN public.sys_roles r             ON r.id = ur.role_id
    JOIN public.sys_role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.sys_permissions p       ON p.id = rp.permission_id
   WHERE ns.is_active = true
     AND r.is_active = true
     AND p.module_name = 'CSSD_HOA_CHAT'
     AND p.action = 'approve';
$function$;

REVOKE ALL ON FUNCTION public.fn_cssd_hoa_chat_is_approver(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_cssd_hoa_chat_approver_count() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cssd_hoa_chat_is_approver(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_cssd_hoa_chat_approver_count() TO service_role;

-- 6) RPC tạo phiếu — giữ nguyên chữ ký HC-1. NHAP/XUAT → CHO_DUYET (không đổi tồn); DIEU_CHINH → DA_DUYET.
--    Kiểm tồn khi lập xuất: tồn đã duyệt trừ các phiếu xuất đang chờ cùng lô (tránh hứa vượt tồn).
CREATE OR REPLACE FUNCTION public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(
  p_loai text,
  p_dm_hoa_chat_id uuid,
  p_so_luong numeric,
  p_ma_lo text,
  p_han_su_dung date,
  p_ghi_chu text,
  p_su_co_id uuid,
  p_actor_user_id uuid,
  p_ma_phieu text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_loai text := upper(btrim(coalesce(p_loai, '')));
  v_ma_lo text := nullif(btrim(coalesce(p_ma_lo, '')), '');
  v_delta numeric;
  v_ton numeric;
  v_ns uuid;
  v_ma text;
  v_id uuid;
  v_trang_thai text;
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF v_loai NOT IN ('NHAP', 'XUAT', 'DIEU_CHINH') THEN
    RAISE EXCEPTION 'Loại giao dịch không hợp lệ.';
  END IF;
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người lập phiếu.';
  END IF;
  IF p_dm_hoa_chat_id IS NULL THEN
    RAISE EXCEPTION 'Chọn hóa chất.';
  END IF;
  IF p_so_luong IS NULL OR p_so_luong = 0 THEN
    RAISE EXCEPTION 'Số lượng phải khác 0.';
  END IF;
  IF v_loai <> 'DIEU_CHINH' AND p_so_luong <= 0 THEN
    RAISE EXCEPTION 'Số lượng % phải > 0.', CASE WHEN v_loai = 'NHAP' THEN 'nhập' ELSE 'xuất' END;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('cssd_kho_hoa_chat:' || p_dm_hoa_chat_id::text, 0));
  IF NOT EXISTS (SELECT 1 FROM public.cssd_dm_hoa_chat WHERE id = p_dm_hoa_chat_id) THEN
    RAISE EXCEPTION 'Không tìm thấy hóa chất.';
  END IF;

  v_delta := CASE v_loai WHEN 'XUAT' THEN -p_so_luong ELSE p_so_luong END;
  v_trang_thai := CASE WHEN v_loai = 'DIEU_CHINH' THEN 'DA_DUYET' ELSE 'CHO_DUYET' END;

  IF v_delta < 0 THEN
    IF p_han_su_dung IS NOT NULL AND p_han_su_dung < v_today THEN
      RAISE EXCEPTION 'Không xuất lô đã quá hạn sử dụng. Hủy hoặc điều chỉnh tồn qua kiểm kê.';
    END IF;
    SELECT COALESCE(SUM(so_luong_co_dau), 0) INTO v_ton
      FROM public.cssd_fact_kho_hoa_chat_giao_dich
     WHERE dm_hoa_chat_id = p_dm_hoa_chat_id
       AND COALESCE(is_active, true)
       AND ma_lo IS NOT DISTINCT FROM v_ma_lo
       AND han_su_dung IS NOT DISTINCT FROM p_han_su_dung
       AND (trang_thai = 'DA_DUYET' OR (trang_thai = 'CHO_DUYET' AND so_luong_co_dau < 0));
    IF v_ton + v_delta < 0 THEN
      IF v_loai = 'XUAT' THEN
        RAISE EXCEPTION 'Không đủ tồn tại lô đã chọn (tồn khả dụng %, cần %).', v_ton, p_so_luong;
      END IF;
      RAISE EXCEPTION 'Điều chỉnh âm vượt tồn khả dụng (%).', v_ton;
    END IF;
  END IF;

  SELECT ns.id INTO v_ns FROM public.mdm_nhan_su ns
   WHERE ns.auth_user_id = p_actor_user_id AND ns.is_active = true LIMIT 1;

  v_ma := coalesce(
    nullif(btrim(p_ma_phieu), ''),
    CASE v_loai WHEN 'NHAP' THEN 'NK' WHEN 'XUAT' THEN 'XK' ELSE 'DC' END || '-'
      || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMMDDHH24MISS') || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
  );

  INSERT INTO public.cssd_fact_kho_hoa_chat_giao_dich (
    ma_phieu, dm_hoa_chat_id, loai_giao_dich, so_luong_co_dau, ma_lo, han_su_dung,
    ghi_chu, su_co_id, nguoi_thuc_hien_id, created_by, trang_thai, updated_at
  ) VALUES (
    v_ma, p_dm_hoa_chat_id, v_loai, v_delta, v_ma_lo, p_han_su_dung,
    nullif(btrim(coalesce(p_ghi_chu, '')), ''), p_su_co_id, v_ns, p_actor_user_id, v_trang_thai, now()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(text, uuid, numeric, text, date, text, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(text, uuid, numeric, text, date, text, uuid, uuid, text)
  TO service_role;

-- 7) RPC duyệt / từ chối nguyên tử.
--    Thứ tự khóa = advisory theo hóa chất (giống RPC ghi) → FOR UPDATE dòng phiếu; chặn xử lý lại.
CREATE OR REPLACE FUNCTION public.rpc_cssd_kho_hoa_chat_duyet_phieu(
  p_giao_dich_id uuid,
  p_quyet_dinh text,
  p_ly_do text,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_qd text := upper(btrim(coalesce(p_quyet_dinh, '')));
  v_ly_do text := nullif(btrim(coalesce(p_ly_do, '')), '');
  v_dm uuid;
  r public.cssd_fact_kho_hoa_chat_giao_dich%ROWTYPE;
  v_ton numeric;
  v_ngoai_le boolean := false;
  v_new text;
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF v_qd NOT IN ('DUYET', 'TU_CHOI') THEN
    RAISE EXCEPTION 'Quyết định không hợp lệ (DUYET | TU_CHOI).';
  END IF;
  IF v_qd = 'TU_CHOI' AND v_ly_do IS NULL THEN
    RAISE EXCEPTION 'Nhập lý do từ chối.';
  END IF;
  IF p_giao_dich_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu phiếu cần duyệt.';
  END IF;
  IF NOT public.fn_cssd_hoa_chat_is_approver(p_actor_user_id) THEN
    RAISE EXCEPTION 'Bạn không có quyền duyệt phiếu kho hóa chất (CSSD_HOA_CHAT.approve).';
  END IF;

  SELECT dm_hoa_chat_id INTO v_dm FROM public.cssd_fact_kho_hoa_chat_giao_dich WHERE id = p_giao_dich_id;
  IF v_dm IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy phiếu.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('cssd_kho_hoa_chat:' || v_dm::text, 0));

  SELECT * INTO r FROM public.cssd_fact_kho_hoa_chat_giao_dich WHERE id = p_giao_dich_id FOR UPDATE;
  IF NOT COALESCE(r.is_active, true) THEN
    RAISE EXCEPTION 'Phiếu đã bị hủy.';
  END IF;
  IF r.trang_thai <> 'CHO_DUYET' THEN
    RAISE EXCEPTION 'Phiếu % đã được xử lý (%), không duyệt lại.', r.ma_phieu, r.trang_thai;
  END IF;

  IF r.created_by IS NOT DISTINCT FROM p_actor_user_id THEN
    IF public.fn_cssd_hoa_chat_approver_count() = 1 THEN
      v_ngoai_le := true;
    ELSE
      RAISE EXCEPTION 'Người duyệt phải khác người lập phiếu — nhờ người khác có quyền duyệt.';
    END IF;
  END IF;

  IF v_qd = 'DUYET' AND r.so_luong_co_dau < 0 THEN
    IF r.han_su_dung IS NOT NULL AND r.han_su_dung < v_today THEN
      RAISE EXCEPTION 'Lô đã quá hạn sử dụng tại lúc duyệt — từ chối phiếu và xử lý qua kiểm kê.';
    END IF;
    SELECT COALESCE(SUM(so_luong_co_dau), 0) INTO v_ton
      FROM public.cssd_fact_kho_hoa_chat_giao_dich
     WHERE dm_hoa_chat_id = r.dm_hoa_chat_id
       AND COALESCE(is_active, true)
       AND trang_thai = 'DA_DUYET'
       AND ma_lo IS NOT DISTINCT FROM r.ma_lo
       AND han_su_dung IS NOT DISTINCT FROM r.han_su_dung;
    IF v_ton + r.so_luong_co_dau < 0 THEN
      RAISE EXCEPTION 'Không đủ tồn lô tại lúc duyệt (tồn %, cần %).', v_ton, -r.so_luong_co_dau;
    END IF;
  END IF;

  v_new := CASE v_qd WHEN 'DUYET' THEN 'DA_DUYET' ELSE 'TU_CHOI' END;
  UPDATE public.cssd_fact_kho_hoa_chat_giao_dich
     SET trang_thai = v_new,
         nguoi_duyet_id = p_actor_user_id,
         duyet_at = now(),
         ly_do_tu_choi = CASE WHEN v_new = 'TU_CHOI' THEN v_ly_do ELSE NULL END,
         tu_duyet_ngoai_le = v_ngoai_le,
         updated_at = now()
   WHERE id = r.id;

  RETURN jsonb_build_object('id', r.id, 'ma_phieu', r.ma_phieu, 'trang_thai', v_new, 'tu_duyet_ngoai_le', v_ngoai_le);
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_cssd_kho_hoa_chat_duyet_phieu(uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_kho_hoa_chat_duyet_phieu(uuid, text, text, uuid) TO service_role;

-- CHƯA APPLY PROD — chờ PO.
-- SQL kiểm prod (chỉ đọc), chạy trước khi apply:
--   SELECT count(*) AS so_dong, count(*) FILTER (WHERE is_active) AS dong_active
--     FROM public.cssd_fact_kho_hoa_chat_giao_dich;
--   SELECT dm_hoa_chat_id, ma_lo, han_su_dung, ton_so_luong FROM public.v_cssd_kho_hoa_chat_ton_lo ORDER BY 1,2,3;  -- lưu để so sau apply
--   SELECT module_name, action FROM public.sys_permissions WHERE module_name = 'CSSD_HOA_CHAT';  -- kỳ vọng 0 dòng
--   SELECT polname FROM pg_policy WHERE polrelid = 'public.cssd_fact_kho_hoa_chat_giao_dich'::regclass;
--   SELECT count(*) FROM public.mdm_nhan_su ns JOIN public.sys_user_roles ur ON ur.user_id = ns.auth_user_id
--     JOIN public.sys_roles r ON r.id = ur.role_id WHERE r.name = 'ADMIN' AND ns.is_active AND r.is_active;  -- số người duyệt sau apply
