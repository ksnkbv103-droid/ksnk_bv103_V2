-- QLCV-002 (mức THẤP): spawn định kỳ bỏ qua mẫu thiếu người phụ trách một cách im lặng.
-- Chỉ thêm RAISE WARNING (id mẫu) + đếm tổng số mẫu bị bỏ qua. Kiểu trả về integer cố định
-- → không thêm khóa json. Giữ nguyên chữ ký, SECURITY DEFINER, search_path, catch_up_days = 7,
-- toàn bộ logic sinh việc, ON CONFLICT, quyền (chỉ service_role).
-- Gốc: pg_get_functiondef trên DB local (bản từ 20261029150000_qlcv_dia_diem_nhieu_khoa.sql).

CREATE OR REPLACE FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inserted int := 0;
  skipped_thieu_phu_trach int := 0;
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
    -- QLCV-002: không bỏ qua im lặng — cảnh báo kèm id mẫu và đếm.
    IF r.nguoi_phu_trach_id IS NULL THEN
      skipped_thieu_phu_trach := skipped_thieu_phu_trach + 1;
      RAISE WARNING 'QLCV spawn dinh ky: bo qua mau % (thieu nguoi_phu_trach_id)', r.id;
      CONTINUE;
    END IF;
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
  IF skipped_thieu_phu_trach > 0 THEN
    RAISE WARNING 'QLCV spawn dinh ky: bo_qua_thieu_phu_trach=% mau, da sinh % phieu', skipped_thieu_phu_trach, inserted;
  END IF;
  RETURN inserted;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() TO service_role;

COMMENT ON FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() IS
  'QLCV-08 + D2 + L2 + L3: ngày VN + ngay_ket_thuc; clamp cuối tháng; bắt phụ trách; sinh bù 7 ngày; copy nhom_chuyen_mon_id, dia_diem_khoa_ids. QLCV-002: mẫu thiếu phụ trách → RAISE WARNING (id mẫu + tổng số bỏ qua).';

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- HOÀN TÁC (chạy tay nếu cần khôi phục định nghĩa cũ, rồi chạy lại REVOKE/GRANT ở trên):
--   CREATE OR REPLACE FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay()
--    RETURNS integer
--    LANGUAGE plpgsql
--    SECURITY DEFINER
--    SET search_path TO 'public'
--   AS $function$
--   DECLARE
--     inserted int := 0;
--     r record;
--     today date := public.fn_qlcv_today_vn();
--     catch_up_days constant int := 7;
--     due date;
--     match_due boolean;
--     v_tt text;
--     anchor_months int;
--     due_months int;
--     v_rows int;
--     anchor_day int;
--     last_day int;
--   BEGIN
--     FOR r IN SELECT * FROM public.qlcv_fact_cong_viec_dinh_ky WHERE is_active = true LOOP
--       -- QLCV-08: mẫu active phải có phụ trách (spawn bỏ qua nếu thiếu — tránh phiếu MOI rác)
--       IF r.nguoi_phu_trach_id IS NULL THEN CONTINUE; END IF;
--       anchor_day := extract(day from r.ngay_bat_dau::timestamp)::int;
--
--       FOR due IN
--         SELECT gs::date
--         FROM generate_series(today - (catch_up_days - 1), today, interval '1 day') AS gs
--         ORDER BY gs
--       LOOP
--         IF r.ngay_bat_dau > due THEN CONTINUE; END IF;
--         -- Không sinh bù trước ngày mẫu được tạo (giờ VN): mẫu mới lùi ngày bắt đầu không đẻ phiếu quá hạn.
--         IF due < (r.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN CONTINUE; END IF;
--         IF r.ngay_ket_thuc IS NOT NULL AND due > r.ngay_ket_thuc THEN CONTINUE; END IF;
--
--         match_due := false;
--         last_day := extract(day from (date_trunc('month', due::timestamp) + interval '1 month - 1 day'))::int;
--
--         CASE r.ma_chu_ky
--           WHEN 'DAILY' THEN match_due := true;
--           WHEN 'WEEKLY' THEN match_due := mod((due - r.ngay_bat_dau)::integer, 7) = 0;
--           WHEN 'MONTHLY' THEN
--             match_due := extract(day from due::timestamp)::int = least(anchor_day, last_day);
--           WHEN 'QUARTERLY' THEN
--             IF extract(day from due::timestamp)::int = least(anchor_day, last_day) THEN
--               anchor_months := date_part('year', r.ngay_bat_dau)::int * 12 + date_part('month', r.ngay_bat_dau::timestamp)::int;
--               due_months := date_part('year', due)::int * 12 + date_part('month', due::timestamp)::int;
--               match_due := mod(due_months - anchor_months, 3) = 0;
--             END IF;
--           WHEN 'YEARLY' THEN
--             match_due :=
--               extract(month from due::timestamp) = extract(month from r.ngay_bat_dau::timestamp)
--               AND extract(day from due::timestamp)::int = least(anchor_day, last_day);
--           ELSE match_due := false;
--         END CASE;
--         IF NOT match_due THEN CONTINUE; END IF;
--
--         IF EXISTS (
--           SELECT 1 FROM public.qlcv_fact_cong_viec c
--           WHERE c.dinh_ky_mau_id = r.id AND (c.han_hoan_thanh = due OR c.ngay_thuc_hien = due)
--             AND (c.is_active = true OR due < today)
--         ) THEN CONTINUE; END IF;
--
--         v_tt := 'DANG_LAM';
--
--         INSERT INTO public.qlcv_fact_cong_viec (
--           tieu_de, mo_ta, loai_cong_viec, trang_thai, muc_do_uu_tien, han_hoan_thanh,
--           ngay_thuc_hien, gio_bat_dau, gio_ket_thuc, dia_diem_khoa_id,
--           nguoi_phu_trach_id, to_cong_tac_id, dinh_ky_mau_id,
--           nhiem_vu_id, nhom_chuyen_mon_id, dia_diem_khoa_ids,
--           vi_tri_thuc_hien, nguoi_phoi_hop_ids, nguoi_theo_doi_ids,
--           nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active, checklist, nhat_ky
--         ) VALUES (
--           r.tieu_de, r.mo_ta, 'DINH_KY', v_tt, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
--           due, r.gio_bat_dau, r.gio_ket_thuc, r.dia_diem_khoa_id,
--           r.nguoi_phu_trach_id, r.to_cong_tac_id, r.id,
--           r.nhiem_vu_id, r.nhom_chuyen_mon_id, coalesce(r.dia_diem_khoa_ids, '{}'::uuid[]),
--           r.vi_tri_thuc_hien, coalesce(r.nguoi_phoi_hop_ids, '{}'::uuid[]), coalesce(r.nguoi_theo_doi_ids, '{}'::uuid[]),
--           r.nguoi_tao_id, r.nguoi_tao_id, 0, true,
--           public.fn_qlcv_mo_ta_to_checklist(r.mo_ta), '[]'::jsonb
--         )
--         ON CONFLICT (dinh_ky_mau_id, han_hoan_thanh)
--           WHERE (dinh_ky_mau_id IS NOT NULL AND han_hoan_thanh IS NOT NULL AND is_active = true)
--           DO NOTHING;
--
--         GET DIAGNOSTICS v_rows = ROW_COUNT;
--         IF v_rows > 0 THEN
--           inserted := inserted + 1;
--         END IF;
--       END LOOP;
--     END LOOP;
--     RETURN inserted;
--   END;
--   $function$;
--   COMMENT ON FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() IS
--     'QLCV-08 + D2 + L2 + L3: ngày VN + ngay_ket_thuc; clamp cuối tháng; bắt phụ trách; sinh bù 7 ngày; copy nhom_chuyen_mon_id, dia_diem_khoa_ids.';
-- ============================================================================

-- CHO_PO: catch_up_days vẫn = 7 (job ngừng > 7 ngày thì kỳ cũ hơn không được sinh bù).
--   Nâng ngưỡng là quyết định nghiệp vụ — chờ PO.

-- CHƯA APPLY PROD — chờ PO.
-- SQL kiểm prod (chỉ đọc):
--   -- Tiên quyết: thân hàm dùng nhom_chuyen_mon_id, dia_diem_khoa_ids → prod phải có 2 dòng:
--   SELECT version FROM supabase_migrations.schema_migrations WHERE version IN ('20261029120000','20261029150000');
--   SELECT md5(pg_get_functiondef('public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay()'::regprocedure));
--     -- local trước: 114d102ad6ffb08d1169734cc3c83b78 · sau apply: 466a00bf0fcffb7e7f014ca31e7fe631
--   SELECT proacl FROM pg_proc WHERE proname = 'fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay';
--   SELECT id, tieu_de, ma_chu_ky FROM public.qlcv_fact_cong_viec_dinh_ky
--     WHERE is_active AND nguoi_phu_trach_id IS NULL;
