-- QLCV L2 · Nhóm chuyên môn (loại việc KSNK) do ADMIN quản lý (PO 2026-10-29).
-- Khác «Tổ công tác» (mdm_dm_to_cong_tac = người thuộc tổ nào): nhóm = loại việc (giám sát, đào tạo, ...).
-- (1) Bảng qlcv_dm_nhom_chuyen_mon (xóa mềm is_active). RLS: đọc = fn_qlcv_can_read_fact(); ghi = fn_sys_is_admin(); không DELETE.
-- (2) nhom_chuyen_mon_id (nullable) trên qlcv_fact_cong_viec_dinh_ky và qlcv_fact_cong_viec. Dữ liệu cũ để NULL
--     («Chưa phân nhóm»); bắt buộc cho mẫu mới được ép ở server action, không ép ở DB.
-- (3) Seed nhóm gợi ý.
-- (4) v_qlcv_cong_viec_full: thêm nhom_chuyen_mon_id, nhom_chuyen_mon_ten Ở CUỐI (tương thích ngược).
-- (5) Spawn định kỳ copy nhom_chuyen_mon_id sang phiếu (bản D2 20261029100000, chỉ thêm 1 cột).
-- Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS public.qlcv_dm_nhom_chuyen_mon (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma         text NOT NULL,
  ten        text NOT NULL,
  thu_tu     integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qlcv_dm_nhom_chuyen_mon_ma_key UNIQUE (ma),
  CONSTRAINT qlcv_dm_nhom_chuyen_mon_ma_chk
    CHECK (ma = upper(btrim(ma)) AND char_length(ma) BETWEEN 1 AND 50),
  CONSTRAINT qlcv_dm_nhom_chuyen_mon_ten_chk
    CHECK (ten = btrim(ten) AND char_length(ten) BETWEEN 1 AND 100)
);

COMMENT ON TABLE public.qlcv_dm_nhom_chuyen_mon IS
  'Nhóm chuyên môn việc KSNK. ADMIN thêm/sửa; is_active=false = Ngừng sử dụng (xóa mềm).';

CREATE UNIQUE INDEX IF NOT EXISTS qlcv_dm_nhom_chuyen_mon_ten_active_uq
  ON public.qlcv_dm_nhom_chuyen_mon (lower(ten)) WHERE is_active;

DROP TRIGGER IF EXISTS trg_qlcv_dm_nhom_chuyen_mon_updated_at ON public.qlcv_dm_nhom_chuyen_mon;
CREATE TRIGGER trg_qlcv_dm_nhom_chuyen_mon_updated_at
  BEFORE UPDATE ON public.qlcv_dm_nhom_chuyen_mon
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.qlcv_dm_nhom_chuyen_mon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qlcv_dm_nhom_chuyen_mon FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qlcv_dm_nhom_chuyen_mon_select ON public.qlcv_dm_nhom_chuyen_mon;
CREATE POLICY qlcv_dm_nhom_chuyen_mon_select ON public.qlcv_dm_nhom_chuyen_mon
  FOR SELECT TO authenticated
  USING ((SELECT public.fn_qlcv_can_read_fact()));

DROP POLICY IF EXISTS qlcv_dm_nhom_chuyen_mon_insert ON public.qlcv_dm_nhom_chuyen_mon;
CREATE POLICY qlcv_dm_nhom_chuyen_mon_insert ON public.qlcv_dm_nhom_chuyen_mon
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.fn_sys_is_admin()));

DROP POLICY IF EXISTS qlcv_dm_nhom_chuyen_mon_update ON public.qlcv_dm_nhom_chuyen_mon;
CREATE POLICY qlcv_dm_nhom_chuyen_mon_update ON public.qlcv_dm_nhom_chuyen_mon
  FOR UPDATE TO authenticated
  USING ((SELECT public.fn_sys_is_admin()))
  WITH CHECK ((SELECT public.fn_sys_is_admin()));

REVOKE ALL ON public.qlcv_dm_nhom_chuyen_mon FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.qlcv_dm_nhom_chuyen_mon TO authenticated;
GRANT ALL ON public.qlcv_dm_nhom_chuyen_mon TO service_role;

-- (2) Cột nhóm ------------------------------------------------------------
ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
  ADD COLUMN IF NOT EXISTS nhom_chuyen_mon_id uuid REFERENCES public.qlcv_dm_nhom_chuyen_mon(id) ON DELETE RESTRICT;
ALTER TABLE public.qlcv_fact_cong_viec
  ADD COLUMN IF NOT EXISTS nhom_chuyen_mon_id uuid REFERENCES public.qlcv_dm_nhom_chuyen_mon(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_qlcv_dk_nhom_cm
  ON public.qlcv_fact_cong_viec_dinh_ky (nhom_chuyen_mon_id) WHERE nhom_chuyen_mon_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qlcv_cv_nhom_cm
  ON public.qlcv_fact_cong_viec (nhom_chuyen_mon_id) WHERE nhom_chuyen_mon_id IS NOT NULL;

-- (3) Seed ------------------------------------------------------------------
INSERT INTO public.qlcv_dm_nhom_chuyen_mon (ma, ten, thu_tu) VALUES
  ('GIAM_SAT',      'Giám sát',               10),
  ('XU_LY_DUNG_CU', 'Xử lý dụng cụ',          20),
  ('KIEM_TRA',      'Kiểm tra, đánh giá',     30),
  ('DAO_TAO',       'Đào tạo',                40),
  ('NKBV',          'Nhiễm khuẩn bệnh viện',  50),
  ('MOI_TRUONG',    'Môi trường, chất thải',  60),
  ('HANH_CHINH',    'Hành chính',             70)
ON CONFLICT DO NOTHING;

-- (4) View: thêm cột ở cuối, giữ security_invoker ----------------------------
CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_full
WITH (security_invoker = true) AS
SELECT cv.id,
    cv.tieu_de,
    cv.mo_ta,
    cv.loai_cong_viec,
        CASE cv.loai_cong_viec
            WHEN 'DINH_KY'::text THEN 'Định kỳ'::text
            WHEN 'DOT_XUAT'::text THEN 'Đột xuất'::text
            WHEN 'KHAN_CAP'::text THEN 'Khẩn cấp'::text
            ELSE cv.loai_cong_viec
        END AS ten_loai_cong_viec,
    cv.trang_thai,
        CASE cv.trang_thai
            WHEN 'MOI'::text THEN 'Mới'::text
            WHEN 'DANG_LAM'::text THEN 'Đang làm'::text
            WHEN 'CHO_DUYET'::text THEN 'Chờ nghiệm thu'::text
            WHEN 'HOAN_THANH'::text THEN 'Hoàn thành'::text
            WHEN 'TU_CHOI'::text THEN 'Từ chối'::text
            WHEN 'QUA_HAN'::text THEN 'Quá hạn'::text
            WHEN 'DA_HUY'::text THEN 'Đã hủy'::text
            WHEN 'CHUA_BAT_DAU'::text THEN 'Chưa bắt đầu'::text
            WHEN 'DANG_THUC_HIEN'::text THEN 'Đang thực hiện'::text
            ELSE cv.trang_thai
        END AS ten_trang_thai_hien_thi,
        CASE cv.trang_thai
            WHEN 'MOI'::text THEN '#94A3B8'::text
            WHEN 'DANG_LAM'::text THEN '#3B82F6'::text
            WHEN 'CHO_DUYET'::text THEN '#F59E0B'::text
            WHEN 'HOAN_THANH'::text THEN '#10B981'::text
            WHEN 'TU_CHOI'::text THEN '#EF4444'::text
            WHEN 'QUA_HAN'::text THEN '#DC2626'::text
            WHEN 'DA_HUY'::text THEN '#6B7280'::text
            WHEN 'CHUA_BAT_DAU'::text THEN '#6B7280'::text
            WHEN 'DANG_THUC_HIEN'::text THEN '#3B82F6'::text
            WHEN 'CHO_NHAN_VIEC'::text THEN '#3B82F6'::text
            WHEN 'CHO_XAC_NHAN_HOAN_THANH'::text THEN '#F59E0B'::text
            ELSE NULL::text
        END AS trang_thai_mau_sac,
    cv.muc_do_uu_tien,
    cv.han_hoan_thanh,
    cv.ngay_thuc_hien,
    cv.gio_bat_dau,
    cv.gio_ket_thuc,
    cv.dia_diem_khoa_id,
    kp.ma_khoa AS dia_diem_khoa_ma,
    kp.ten_khoa AS dia_diem_khoa_ten,
    cv.nhiem_vu_id,
    nv.ten AS nhiem_vu_ten,
    cv.phan_tram_hoan_thanh,
    cv.nguoi_tao_id,
    cv.nguoi_giao_viec_id,
    cv.nguoi_phu_trach_id,
    cv.to_cong_tac_id,
    cv.dinh_ky_mau_id,
    cv.vi_tri_thuc_hien,
    cv.nguoi_phoi_hop_ids,
    cv.nguoi_theo_doi_ids,
    cv.is_active,
    cv.created_at,
    cv.updated_at,
    ns_tao.ho_ten AS nguoi_tao_ten,
    ns_phu.ho_ten AS nguoi_phu_trach_ten,
    ns_giao.ho_ten AS nguoi_giao_ten,
    t.ten_to AS to_cong_tac_ten,
    cv.han_hoan_thanh IS NOT NULL AND cv.han_hoan_thanh < fn_qlcv_today_vn() AND (cv.trang_thai <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text])) AS is_qua_han,
    cv.checklist,
    cv.nhat_ky,
    cv.analytics_meta,
    cv.nguon_lien_ket,
    cv.nhom_chuyen_mon_id,
    ncm.ten AS nhom_chuyen_mon_ten
   FROM qlcv_fact_cong_viec cv
     LEFT JOIN mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
     LEFT JOIN mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
     LEFT JOIN mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
     LEFT JOIN mdm_dm_to_cong_tac t ON cv.to_cong_tac_id = t.id
     LEFT JOIN mdm_dm_khoa_phong kp ON cv.dia_diem_khoa_id = kp.id
     LEFT JOIN qlcv_fact_nhiem_vu nv ON cv.nhiem_vu_id = nv.id
     LEFT JOIN qlcv_dm_nhom_chuyen_mon ncm ON cv.nhom_chuyen_mon_id = ncm.id;

-- (5) Spawn: copy nhom_chuyen_mon_id ----------------------------------------
CREATE OR REPLACE FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  inserted int := 0;
  r record;
  today date := public.fn_qlcv_today_vn();
  catch_up_days constant int := 7;
  due date;
  match_due boolean;
  v_tt text;
  anchor_months int;
  due_months int;
  v_rows int;
  anchor_day int;
  last_day int;
BEGIN
  FOR r IN SELECT * FROM public.qlcv_fact_cong_viec_dinh_ky WHERE is_active = true LOOP
    -- QLCV-08: mẫu active phải có phụ trách (spawn bỏ qua nếu thiếu — tránh phiếu MOI rác)
    IF r.nguoi_phu_trach_id IS NULL THEN CONTINUE; END IF;
    anchor_day := extract(day from r.ngay_bat_dau::timestamp)::int;

    FOR due IN
      SELECT gs::date
      FROM generate_series(today - (catch_up_days - 1), today, interval '1 day') AS gs
      ORDER BY gs
    LOOP
      IF r.ngay_bat_dau > due THEN CONTINUE; END IF;
      -- Không sinh bù trước ngày mẫu được tạo (giờ VN): mẫu mới lùi ngày bắt đầu không đẻ phiếu quá hạn.
      IF due < (r.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN CONTINUE; END IF;
      IF r.ngay_ket_thuc IS NOT NULL AND due > r.ngay_ket_thuc THEN CONTINUE; END IF;

      match_due := false;
      last_day := extract(day from (date_trunc('month', due::timestamp) + interval '1 month - 1 day'))::int;

      CASE r.ma_chu_ky
        WHEN 'DAILY' THEN match_due := true;
        WHEN 'WEEKLY' THEN match_due := mod((due - r.ngay_bat_dau)::integer, 7) = 0;
        WHEN 'MONTHLY' THEN
          match_due := extract(day from due::timestamp)::int = least(anchor_day, last_day);
        WHEN 'QUARTERLY' THEN
          IF extract(day from due::timestamp)::int = least(anchor_day, last_day) THEN
            anchor_months := date_part('year', r.ngay_bat_dau)::int * 12 + date_part('month', r.ngay_bat_dau::timestamp)::int;
            due_months := date_part('year', due)::int * 12 + date_part('month', due::timestamp)::int;
            match_due := mod(due_months - anchor_months, 3) = 0;
          END IF;
        WHEN 'YEARLY' THEN
          match_due :=
            extract(month from due::timestamp) = extract(month from r.ngay_bat_dau::timestamp)
            AND extract(day from due::timestamp)::int = least(anchor_day, last_day);
        ELSE match_due := false;
      END CASE;
      IF NOT match_due THEN CONTINUE; END IF;

      IF EXISTS (
        SELECT 1 FROM public.qlcv_fact_cong_viec c
        WHERE c.dinh_ky_mau_id = r.id AND (c.han_hoan_thanh = due OR c.ngay_thuc_hien = due)
          AND (c.is_active = true OR due < today)
      ) THEN CONTINUE; END IF;

      v_tt := 'DANG_LAM';

      INSERT INTO public.qlcv_fact_cong_viec (
        tieu_de, mo_ta, loai_cong_viec, trang_thai, muc_do_uu_tien, han_hoan_thanh,
        ngay_thuc_hien, gio_bat_dau, gio_ket_thuc, dia_diem_khoa_id,
        nguoi_phu_trach_id, to_cong_tac_id, dinh_ky_mau_id,
        nhiem_vu_id, nhom_chuyen_mon_id,
        vi_tri_thuc_hien, nguoi_phoi_hop_ids, nguoi_theo_doi_ids,
        nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active, checklist, nhat_ky
      ) VALUES (
        r.tieu_de, r.mo_ta, 'DINH_KY', v_tt, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
        due, r.gio_bat_dau, r.gio_ket_thuc, r.dia_diem_khoa_id,
        r.nguoi_phu_trach_id, r.to_cong_tac_id, r.id,
        r.nhiem_vu_id, r.nhom_chuyen_mon_id,
        r.vi_tri_thuc_hien, coalesce(r.nguoi_phoi_hop_ids, '{}'::uuid[]), coalesce(r.nguoi_theo_doi_ids, '{}'::uuid[]),
        r.nguoi_tao_id, r.nguoi_tao_id, 0, true,
        public.fn_qlcv_mo_ta_to_checklist(r.mo_ta), '[]'::jsonb
      )
      ON CONFLICT (dinh_ky_mau_id, han_hoan_thanh)
        WHERE (dinh_ky_mau_id IS NOT NULL AND han_hoan_thanh IS NOT NULL AND is_active = true)
        DO NOTHING;

      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows > 0 THEN
        inserted := inserted + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN inserted;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() TO service_role;

COMMENT ON FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() IS
  'QLCV-08 + D2: ngày VN + ngay_ket_thuc; MONTHLY/QUARTERLY/YEARLY clamp ngày cuối tháng; bắt phụ trách; sinh bù kỳ lỡ trong 7 ngày (hôm nay + 6 ngày trước), không hồi sinh phiếu đã xóa mềm ở ngày quá khứ.';

COMMENT ON FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() IS
  'QLCV-08 + D2 + L2: ngày VN + ngay_ket_thuc; clamp cuối tháng; bắt phụ trách; sinh bù 7 ngày; copy nhom_chuyen_mon_id.';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =====================================================================
-- CHƯA APPLY PROD — chờ PO.
-- Rollback (thủ công; xóa cột = destructive-change):
--   CREATE OR REPLACE VIEW không bỏ cột được → DROP VIEW v_qlcv_cong_viec_full rồi tạo lại bản 20260928* trước đó
--     (không có 2 cột cuối) + security_invoker=true; v_qlcv_cong_viec_qua_han phụ thuộc → tạo lại sau.
--   Khôi phục spawn bản 20261029100000 (không copy nhom).
--   ALTER TABLE qlcv_fact_cong_viec(_dinh_ky) DROP COLUMN nhom_chuyen_mon_id; DROP TABLE qlcv_dm_nhom_chuyen_mon;
-- =====================================================================
