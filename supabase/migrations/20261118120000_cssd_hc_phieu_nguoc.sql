-- CSSD-034: phiếu XUẤT kho hóa chất đã DA_DUYET chưa có đường đảo.
-- PO 2026-11-17: «cho lập phiếu ngược, bắt buộc lý do; duyệt như thường». PO cấm sửa số tồn (2026-10-29),
-- nên đảo = một phiếu NHẬP MỚI (chứng từ ngược) trỏ về phiếu gốc, đi qua rpc_cssd_kho_hoa_chat_duyet_phieu như mọi phiếu.
-- Hàm duyệt chỉ kiểm tồn khi so_luong_co_dau < 0 → phiếu ngược (dương) duyệt không cần kiểm tồn; KHÔNG sửa hàm duyệt.
-- View tồn (v_cssd_kho_hoa_chat_ton_lo) chỉ tính DA_DUYET + is_active → phiếu ngược chỉ cộng tồn sau khi được duyệt.
-- su_co_id của phiếu ngược = NULL (cố ý): các vị từ «sự cố đã có phiếu» (CSSD-032, app) không đổi hành vi.
-- Additive: 2 cột, 1 CHECK, 1 unique partial index, 1 RPC mới. Không đổi rpc ghi/duyệt, không đổi policy/quyền bảng.
-- Không BEGIN/COMMIT trong file: db push tự bọc transaction.
-- CHƯA APPLY PROD — chờ PO.

ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
  ADD COLUMN IF NOT EXISTS phieu_goc_id uuid
    REFERENCES public.cssd_fact_kho_hoa_chat_giao_dich(id) ON DELETE RESTRICT;
ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
  ADD COLUMN IF NOT EXISTS ly_do_dao text;

COMMENT ON COLUMN public.cssd_fact_kho_hoa_chat_giao_dich.phieu_goc_id IS
  'CSSD-034: phiếu XUẤT đã duyệt mà phiếu NHẬP này đảo (chứng từ ngược). NULL = phiếu thường.';
COMMENT ON COLUMN public.cssd_fact_kho_hoa_chat_giao_dich.ly_do_dao IS
  'CSSD-034: lý do lập phiếu ngược (bắt buộc khi phieu_goc_id có giá trị).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'cssd_fact_kho_hc_phieu_nguoc_check'
       AND conrelid = 'public.cssd_fact_kho_hoa_chat_giao_dich'::regclass
  ) THEN
    ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
      ADD CONSTRAINT cssd_fact_kho_hc_phieu_nguoc_check CHECK (
        (phieu_goc_id IS NULL AND ly_do_dao IS NULL)
        OR (
          phieu_goc_id IS NOT NULL
          AND nullif(btrim(coalesce(ly_do_dao, '')), '') IS NOT NULL
          AND loai_giao_dich = 'NHAP'
          AND su_co_id IS NULL
          AND ly_do_xuat IS NULL
        )
      );
  END IF;
END
$$;

-- Mỗi phiếu gốc tối đa một phiếu ngược còn hiệu lực (CHO_DUYET hoặc DA_DUYET, is_active).
CREATE UNIQUE INDEX IF NOT EXISTS uq_cssd_fact_kho_hc_phieu_nguoc_hieu_luc
  ON public.cssd_fact_kho_hoa_chat_giao_dich (phieu_goc_id)
  WHERE phieu_goc_id IS NOT NULL AND is_active AND trang_thai <> 'TU_CHOI';

CREATE OR REPLACE FUNCTION public.rpc_cssd_kho_hoa_chat_lap_phieu_nguoc(
  p_phieu_goc_id uuid, p_ly_do text, p_actor_user_id uuid
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ly_do text := nullif(btrim(coalesce(p_ly_do, '')), '');
  v_dm uuid;
  r public.cssd_fact_kho_hoa_chat_giao_dich%ROWTYPE;
  v_ns uuid;
  v_ma text;
  v_id uuid;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người lập phiếu.' USING ERRCODE = 'P0001';
  END IF;
  IF p_phieu_goc_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu phiếu gốc cần lập phiếu ngược.' USING ERRCODE = 'P0001';
  END IF;
  IF v_ly_do IS NULL THEN
    RAISE EXCEPTION 'Nhập lý do lập phiếu ngược.' USING ERRCODE = 'P0001';
  END IF;
  IF char_length(v_ly_do) > 500 THEN
    RAISE EXCEPTION 'Lý do lập phiếu ngược tối đa 500 ký tự.' USING ERRCODE = 'P0001';
  END IF;

  SELECT dm_hoa_chat_id INTO v_dm
    FROM public.cssd_fact_kho_hoa_chat_giao_dich WHERE id = p_phieu_goc_id;
  IF v_dm IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy phiếu gốc.' USING ERRCODE = 'P0001';
  END IF;
  -- Cùng khóa với rpc ghi/duyệt: tuần tự hóa theo hóa chất.
  PERFORM pg_advisory_xact_lock(hashtextextended('cssd_kho_hoa_chat:' || v_dm::text, 0));

  SELECT * INTO r FROM public.cssd_fact_kho_hoa_chat_giao_dich
   WHERE id = p_phieu_goc_id FOR UPDATE;
  IF NOT COALESCE(r.is_active, true) THEN
    RAISE EXCEPTION 'Phiếu gốc % đã bị hủy, không lập phiếu ngược.', r.ma_phieu USING ERRCODE = 'P0001';
  END IF;
  IF r.phieu_goc_id IS NOT NULL THEN
    RAISE EXCEPTION 'Phiếu % đã là phiếu ngược, không lập ngược tiếp.', r.ma_phieu USING ERRCODE = 'P0001';
  END IF;
  IF r.loai_giao_dich <> 'XUAT' THEN
    RAISE EXCEPTION 'Chỉ lập phiếu ngược cho phiếu XUẤT (phiếu % là %).', r.ma_phieu, r.loai_giao_dich
      USING ERRCODE = 'P0001';
  END IF;
  IF r.trang_thai <> 'DA_DUYET' THEN
    RAISE EXCEPTION 'Chỉ lập phiếu ngược cho phiếu đã duyệt (phiếu % đang %).', r.ma_phieu, r.trang_thai
      USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.cssd_fact_kho_hoa_chat_giao_dich g
     WHERE g.phieu_goc_id = r.id
       AND g.is_active
       AND g.trang_thai <> 'TU_CHOI'
  ) THEN
    RAISE EXCEPTION 'Phiếu % đã có phiếu ngược (chưa bị từ chối). Không lập phiếu ngược thứ hai.', r.ma_phieu
      USING ERRCODE = 'P0001';
  END IF;

  SELECT ns.id INTO v_ns FROM public.mdm_nhan_su ns
   WHERE ns.auth_user_id = p_actor_user_id AND ns.is_active = true LIMIT 1;

  v_ma := 'NG-' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMMDDHH24MISS') || '-'
          || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  INSERT INTO public.cssd_fact_kho_hoa_chat_giao_dich (
    ma_phieu, dm_hoa_chat_id, loai_giao_dich, so_luong_co_dau, ma_lo, han_su_dung,
    ghi_chu, su_co_id, nguoi_thuc_hien_id, created_by, trang_thai, ly_do_xuat,
    phieu_goc_id, ly_do_dao, updated_at
  ) VALUES (
    v_ma, r.dm_hoa_chat_id, 'NHAP', -r.so_luong_co_dau, r.ma_lo, r.han_su_dung,
    'Phiếu ngược của ' || r.ma_phieu, NULL, v_ns, p_actor_user_id, 'CHO_DUYET', NULL,
    r.id, v_ly_do, now()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_cssd_kho_hoa_chat_lap_phieu_nguoc(uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_kho_hoa_chat_lap_phieu_nguoc(uuid, text, uuid)
  TO service_role;

-- Hoàn tác (chỉ khi chưa có phiếu ngược nào; có thì phải xử lý dữ liệu trước — FK RESTRICT):
--   DROP FUNCTION IF EXISTS public.rpc_cssd_kho_hoa_chat_lap_phieu_nguoc(uuid, text, uuid);
--   DROP INDEX IF EXISTS public.uq_cssd_fact_kho_hc_phieu_nguoc_hieu_luc;
--   ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich DROP CONSTRAINT IF EXISTS cssd_fact_kho_hc_phieu_nguoc_check;
--   ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich DROP COLUMN IF EXISTS ly_do_dao;
--   ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich DROP COLUMN IF EXISTS phieu_goc_id;

-- CHƯA APPLY PROD — chờ PO.
-- SQL kiểm prod (chỉ đọc), trước khi apply — kỳ vọng 0 dòng (chưa có cột/hàm trùng tên):
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'cssd_fact_kho_hoa_chat_giao_dich'
--      AND column_name IN ('phieu_goc_id', 'ly_do_dao');
--   SELECT oid::regprocedure FROM pg_proc WHERE proname = 'rpc_cssd_kho_hoa_chat_lap_phieu_nguoc';
-- Sau apply — kỳ vọng: 2 cột, 1 constraint, 1 index, hàm chỉ service_role EXECUTE (ngoài owner):
--   SELECT conname FROM pg_constraint WHERE conname = 'cssd_fact_kho_hc_phieu_nguoc_check';
--   SELECT indexname FROM pg_indexes WHERE indexname = 'uq_cssd_fact_kho_hc_phieu_nguoc_hieu_luc';
--   SELECT grantee FROM information_schema.routine_privileges
--    WHERE routine_name = 'rpc_cssd_kho_hoa_chat_lap_phieu_nguoc' AND privilege_type = 'EXECUTE';
