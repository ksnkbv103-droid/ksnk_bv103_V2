-- Migration: GSC Standardize Checklist Categories & Fix Sync Bug
-- Description: 
-- 1. Loại bỏ cột dư thừa nhom_chuyen_de (tiếng Việt không chuẩn) khỏi bảng gstt_dm_bang_kiem, giữ lại cột chuẩn phan_loai_chuyen_mon.
-- 2. Tái cấu trúc các view liên quan dm_bang_kiem, v_gstt_bang_kiem_full, v_dm_bang_kiem_full (chuyển đổi từ nhom_chuyen_de sang phan_loai_chuyen_mon).
-- 3. Giải quyết BUG CHÍ MẠNG: Hàm fn_sync_single_gsc_session join với bảng fact_giam_sat_chung_results không tồn tại (đã chuyển sang results_jsonb).
--    Chúng tôi sử dụng lateral jsonb_array_elements để phân rã results_jsonb trực tiếp trong PL/pgSQL sync.

BEGIN;

-- =========================================================================
-- PHẦN 1: Loại bỏ nhom_chuyen_de & tái cấu trúc view
-- =========================================================================

-- 1. Drop views phụ thuộc CASCADE để cho phép thay đổi cấu trúc bảng vật lý
DROP VIEW IF EXISTS "public"."v_dm_bang_kiem_full" CASCADE;
DROP VIEW IF EXISTS "public"."v_gstt_bang_kiem_full" CASCADE;
DROP VIEW IF EXISTS "public"."dm_bang_kiem" CASCADE;

-- 2. Xóa cột nhom_chuyen_de trong bảng vật lý gstt_dm_bang_kiem
ALTER TABLE "public"."gstt_dm_bang_kiem" DROP COLUMN IF EXISTS "nhom_chuyen_de";

-- 3. Tạo lại view dm_bang_kiem (bao gồm phan_loai_chuyen_mon thay thế)
CREATE OR REPLACE VIEW "public"."dm_bang_kiem" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_bk",
    "ten_bang_kiem",
    "mo_ta",
    "is_active",
    "is_system",
    "created_at",
    "updated_at",
    "loai_hinh_giam_sat",
    "tieu_chi_jsonb",
    "phan_loai_chuyen_mon",
    "loai_giam_sat",
    "doi_tuong_giam_sat",
    "cach_tinh_diem",
    "phien_ban"
   FROM "public"."gstt_dm_bang_kiem";

ALTER VIEW "public"."dm_bang_kiem" OWNER TO "postgres";
GRANT ALL ON TABLE "public"."dm_bang_kiem" TO "anon";
GRANT ALL ON TABLE "public"."dm_bang_kiem" TO "authenticated";
GRANT ALL ON TABLE "public"."dm_bang_kiem" TO "service_role";

-- 4. Tạo lại view v_gstt_bang_kiem_full (chuyển đổi nhom_chuyen_de -> phan_loai_chuyen_mon)
CREATE OR REPLACE VIEW "public"."v_gstt_bang_kiem_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_bk",
    "ten_bang_kiem",
    "mo_ta",
    "loai_hinh_giam_sat",
    "is_active",
    "is_system",
    "created_at",
    "updated_at",
    "phan_loai_chuyen_mon"
   FROM "public"."gstt_dm_bang_kiem";

ALTER VIEW "public"."v_gstt_bang_kiem_full" OWNER TO "postgres";
GRANT ALL ON TABLE "public"."v_gstt_bang_kiem_full" TO "anon";
GRANT ALL ON TABLE "public"."v_gstt_bang_kiem_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_gstt_bang_kiem_full" TO "service_role";

-- 5. Tạo lại view v_dm_bang_kiem_full (nếu còn dùng)
CREATE OR REPLACE VIEW "public"."v_dm_bang_kiem_full" WITH ("security_invoker"='true') AS
 SELECT "id",
    "ma_bk",
    "ten_bang_kiem",
    "mo_ta",
    "loai_hinh_giam_sat",
    "is_active",
    "is_system",
    "created_at",
    "updated_at",
    "phan_loai_chuyen_mon"
   FROM "public"."v_gstt_bang_kiem_full";

ALTER VIEW "public"."v_dm_bang_kiem_full" OWNER TO "postgres";
GRANT ALL ON TABLE "public"."v_dm_bang_kiem_full" TO "anon";
GRANT ALL ON TABLE "public"."v_dm_bang_kiem_full" TO "authenticated";
GRANT ALL ON TABLE "public"."v_dm_bang_kiem_full" TO "service_role";

-- =========================================================================
-- PHẦN 2: Giải quyết bug và tối ưu hóa fn_sync_single_gsc_session
-- =========================================================================

CREATE OR REPLACE FUNCTION "public"."fn_sync_single_gsc_session"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Xóa dữ liệu tổng hợp cũ của phiên này
  DELETE FROM public.fact_gsc_dashboard_summary WHERE session_id = p_session_id;
  DELETE FROM public.fact_gsc_violations_summary WHERE session_id = p_session_id;

  -- Chỉ đồng bộ nếu phiên tồn tại và đang hoạt động
  IF EXISTS (SELECT 1 FROM public.fact_giam_sat_chung_sessions WHERE id = p_session_id AND is_active = true) THEN
    
    -- 1. Đồng bộ bảng tổng hợp dashboard (phân rã kết quả từ results_jsonb)
    INSERT INTO public.fact_gsc_dashboard_summary (
      session_id, ngay_giam_sat, bang_kiem_id, khoa_id, khu_vuc_id, nghe_nghiep_id, stype, nguoi_giam_sat_id,
      tong_phien, tong_quan_sat, tong_dat, tong_vi_pham
    )
    SELECT
      s.id, s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id, s.khu_vuc_id, s.nghe_nghiep_id,
      public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
      s.nguoi_giam_sat_id,
      1, 
      COUNT(r.elem), 
      COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'DAT'), 
      COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'KHONG_DAT')
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN LATERAL jsonb_array_elements(s.results_jsonb) AS r(elem) ON true
    WHERE s.id = p_session_id
    GROUP BY s.id;

    -- 2. Đồng bộ bảng tổng hợp vi phạm chi tiết từng tiêu chí
    INSERT INTO public.fact_gsc_violations_summary (
      session_id, criterion_id, ngay_giam_sat, bang_kiem_id, khoa_id, khu_vuc_id, nghe_nghiep_id, stype, nguoi_giam_sat_id,
      tong_quan_sat, tong_vi_pham
    )
    SELECT
      s.id, 
      (r.elem ->> 'criterion_id')::uuid AS criterion_id, 
      s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id, s.khu_vuc_id, s.nghe_nghiep_id,
      public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype, 
      s.nguoi_giam_sat_id,
      COUNT(r.elem), 
      COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'KHONG_DAT')
    FROM public.fact_giam_sat_chung_sessions s
    INNER JOIN LATERAL jsonb_array_elements(s.results_jsonb) AS r(elem) ON true
    WHERE s.id = p_session_id 
      AND r.elem ->> 'criterion_id' IS NOT NULL
    GROUP BY s.id, (r.elem ->> 'criterion_id');

  END IF;
END;
$$;

ALTER FUNCTION "public"."fn_sync_single_gsc_session"("p_session_id" "uuid") OWNER TO "postgres";

COMMIT;
