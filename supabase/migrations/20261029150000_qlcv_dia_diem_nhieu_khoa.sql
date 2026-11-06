-- QLCV L3 · Địa điểm nhiều khoa trên phiếu và mẫu định kỳ (PO 2026-10-29).
-- (1) dia_diem_khoa_ids uuid[] NOT NULL DEFAULT '{}' trên qlcv_fact_cong_viec và qlcv_fact_cong_viec_dinh_ky.
--     dia_diem_khoa_id (đơn) giữ nguyên = khoa đầu tiên; view/KPI cũ không đổi. (ke_hoach_tuan_dong không còn cột địa điểm → bỏ qua.)
-- (2) Backfill ids = ARRAY[dia_diem_khoa_id].
-- (3) Trigger BEFORE INSERT/UPDATE đồng bộ ids <-> id đơn, loại trùng (giữ thứ tự), kiểm tồn tại mdm_dm_khoa_phong.
--     Tên trg_a_* để chạy trước trg_mdm_validate_lookup_* (thứ tự trigger theo tên).
-- (4) v_qlcv_cong_viec_full: thêm dia_diem_khoa_ids Ở CUỐI. (5) Spawn copy dia_diem_khoa_ids.
-- Idempotent.

BEGIN;

ALTER TABLE public.qlcv_fact_cong_viec
  ADD COLUMN IF NOT EXISTS dia_diem_khoa_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
  ADD COLUMN IF NOT EXISTS dia_diem_khoa_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

UPDATE public.qlcv_fact_cong_viec
   SET dia_diem_khoa_ids = ARRAY[dia_diem_khoa_id]
 WHERE dia_diem_khoa_id IS NOT NULL AND dia_diem_khoa_ids = '{}'::uuid[];
UPDATE public.qlcv_fact_cong_viec_dinh_ky
   SET dia_diem_khoa_ids = ARRAY[dia_diem_khoa_id]
 WHERE dia_diem_khoa_id IS NOT NULL AND dia_diem_khoa_ids = '{}'::uuid[];

CREATE OR REPLACE FUNCTION public.fn_qlcv_sync_dia_diem_khoa_ids()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $function$
DECLARE
  v_missing uuid;
BEGIN
  -- Code cũ chỉ đổi id đơn (UPDATE) → mảng theo id đơn.
  IF TG_OP = 'UPDATE'
     AND NEW.dia_diem_khoa_id IS DISTINCT FROM OLD.dia_diem_khoa_id
     AND NEW.dia_diem_khoa_ids IS NOT DISTINCT FROM OLD.dia_diem_khoa_ids THEN
    NEW.dia_diem_khoa_ids := CASE WHEN NEW.dia_diem_khoa_id IS NULL THEN '{}'::uuid[]
                                  ELSE ARRAY[NEW.dia_diem_khoa_id] END;
  END IF;

  -- Loại null + trùng, giữ thứ tự xuất hiện đầu tiên.
  NEW.dia_diem_khoa_ids := coalesce((
    SELECT array_agg(x ORDER BY o)
    FROM (SELECT x, min(o) AS o
            FROM unnest(coalesce(NEW.dia_diem_khoa_ids, '{}'::uuid[])) WITH ORDINALITY AS u(x, o)
           WHERE x IS NOT NULL
           GROUP BY x) d
  ), '{}'::uuid[]);

  IF cardinality(NEW.dia_diem_khoa_ids) > 0 THEN
    NEW.dia_diem_khoa_id := NEW.dia_diem_khoa_ids[1];
  ELSIF NEW.dia_diem_khoa_id IS NOT NULL THEN
    NEW.dia_diem_khoa_ids := ARRAY[NEW.dia_diem_khoa_id];
  END IF;

  SELECT x INTO v_missing
    FROM unnest(NEW.dia_diem_khoa_ids) AS x
   WHERE NOT EXISTS (SELECT 1 FROM public.mdm_dm_khoa_phong kp WHERE kp.id = x)
   LIMIT 1;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'dia_diem_khoa_ids: khoa % không tồn tại trong mdm_dm_khoa_phong', v_missing
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_a_qlcv_sync_dia_diem_khoa_ids ON public.qlcv_fact_cong_viec;
CREATE TRIGGER trg_a_qlcv_sync_dia_diem_khoa_ids
  BEFORE INSERT OR UPDATE ON public.qlcv_fact_cong_viec
  FOR EACH ROW EXECUTE FUNCTION public.fn_qlcv_sync_dia_diem_khoa_ids();

DROP TRIGGER IF EXISTS trg_a_qlcv_sync_dia_diem_khoa_ids ON public.qlcv_fact_cong_viec_dinh_ky;
CREATE TRIGGER trg_a_qlcv_sync_dia_diem_khoa_ids
  BEFORE INSERT OR UPDATE ON public.qlcv_fact_cong_viec_dinh_ky
  FOR EACH ROW EXECUTE FUNCTION public.fn_qlcv_sync_dia_diem_khoa_ids();

CREATE INDEX IF NOT EXISTS idx_qlcv_fact_cong_viec_dia_diem_khoa_ids
  ON public.qlcv_fact_cong_viec USING gin (dia_diem_khoa_ids);
CREATE INDEX IF NOT EXISTS idx_qlcv_fact_cong_viec_dinh_ky_dia_diem_khoa_ids
  ON public.qlcv_fact_cong_viec_dinh_ky USING gin (dia_diem_khoa_ids);

-- (4) View: thêm dia_diem_khoa_ids ở cuối, giữ security_invoker ---------------
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
    ncm.ten AS nhom_chuyen_mon_ten,
    cv.dia_diem_khoa_ids
   FROM qlcv_fact_cong_viec cv
     LEFT JOIN mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
     LEFT JOIN mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
     LEFT JOIN mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
     LEFT JOIN mdm_dm_to_cong_tac t ON cv.to_cong_tac_id = t.id
     LEFT JOIN mdm_dm_khoa_phong kp ON cv.dia_diem_khoa_id = kp.id
     LEFT JOIN qlcv_fact_nhiem_vu nv ON cv.nhiem_vu_id = nv.id
     LEFT JOIN qlcv_dm_nhom_chuyen_mon ncm ON cv.nhom_chuyen_mon_id = ncm.id;

-- (5) Spawn: copy dia_diem_khoa_ids (bản L2 20261029120000, chỉ thêm 1 cột) ---
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
        nhiem_vu_id, nhom_chuyen_mon_id, dia_diem_khoa_ids,
        vi_tri_thuc_hien, nguoi_phoi_hop_ids, nguoi_theo_doi_ids,
        nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active, checklist, nhat_ky
      ) VALUES (
        r.tieu_de, r.mo_ta, 'DINH_KY', v_tt, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
        due, r.gio_bat_dau, r.gio_ket_thuc, r.dia_diem_khoa_id,
        r.nguoi_phu_trach_id, r.to_cong_tac_id, r.id,
        r.nhiem_vu_id, r.nhom_chuyen_mon_id, coalesce(r.dia_diem_khoa_ids, '{}'::uuid[]),
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
  'QLCV-08 + D2 + L2 + L3: ngày VN + ngay_ket_thuc; clamp cuối tháng; bắt phụ trách; sinh bù 7 ngày; copy nhom_chuyen_mon_id, dia_diem_khoa_ids.';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =====================================================================
-- CHƯA APPLY PROD — chờ PO.
-- Rollback (thủ công; xóa cột = destructive-change):
--   DROP TRIGGER trg_a_qlcv_sync_dia_diem_khoa_ids trên 2 bảng; DROP FUNCTION fn_qlcv_sync_dia_diem_khoa_ids();
--   view: DROP + tạo lại bản 20261029120000 (CREATE OR REPLACE không bỏ cột được; v_qlcv_cong_viec_qua_han phụ thuộc);
--   spawn: khôi phục bản 20261029120000.
-- Kiểm prod (chỉ đọc):
--   SELECT table_name FROM information_schema.columns
--    WHERE table_schema='public' AND column_name='dia_diem_khoa_ids';
--   SELECT count(*) FROM qlcv_fact_cong_viec WHERE dia_diem_khoa_id IS NOT NULL
--      AND dia_diem_khoa_id NOT IN (SELECT id FROM mdm_dm_khoa_phong);  -- phải = 0 trước khi apply (backfill + trigger)
--   SELECT count(*) FROM qlcv_fact_cong_viec_dinh_ky WHERE dia_diem_khoa_id IS NOT NULL
--      AND dia_diem_khoa_id NOT IN (SELECT id FROM mdm_dm_khoa_phong);  -- phải = 0
