-- Supabase Migration: 20260525000009_standardize_module_table_names.sql
-- Description: Persist station scan timestamps/operators in public.cssd_fact_quy_trinh and rename active tables for GSTT, NKBV, QLCV modules with backward-compatible views.

BEGIN;

-- =========================================================================
-- 1. CẬP NHẬT HÀM QUÉT CSSD ĐỂ LƯU THỜI GIAN & NGƯỜI THỰC HIỆN TRẠM
-- =========================================================================
CREATE OR REPLACE FUNCTION public.rpc_scan_workflow_station(
  p_ma_qr text, 
  p_target_station text, 
  p_operator_label text DEFAULT 'CSSD'::text
) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row RECORD;
  v_current_ma text;
  v_target_id uuid;
  v_current_idx INT;
  v_target_idx INT;
  v_operator_id uuid;
BEGIN
  -- Lấy UUID của nhân viên thực hiện từ operator email
  SELECT id INTO v_operator_id FROM public.mdm_nhan_su
  WHERE lower(email) = lower(trim(p_operator_label)) AND is_active = true
  LIMIT 1;

  SELECT q.*, t.ma_tram AS ma_tram_hien_tai
  INTO v_row
  FROM public.cssd_fact_quy_trinh q
  LEFT JOIN public.dm_tram_cssd t ON t.id = q.tram_hien_tai_id
  WHERE upper(q.ma_qr_quy_trinh) = upper(trim(p_ma_qr))
    AND q.is_active = true
  ORDER BY q.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy bộ dụng cụ hoặc bộ chưa được tiếp nhận.');
  END IF;

  IF v_row.is_dong_bang = true THEN
    RETURN json_build_object('success', false, 'message', 'Bộ dụng cụ ' || p_ma_qr || ' đang bị khóa an toàn (đóng băng).');
  END IF;

  SELECT id INTO v_target_id FROM public.dm_tram_cssd
  WHERE upper(trim(ma_tram)) = upper(trim(p_target_station)) AND is_active = true
  LIMIT 1;

  IF v_target_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Trạm không hợp lệ: ' || coalesce(p_target_station, ''));
  END IF;

  v_current_ma := coalesce(v_row.ma_tram_hien_tai, '');

  v_current_idx := CASE v_current_ma
    WHEN 'TIEP_NHAN' THEN 0 WHEN 'LAM_SACH' THEN 1 WHEN 'QC' THEN 2
    WHEN 'DONG_GOI' THEN 3 WHEN 'TIET_KHUAN' THEN 4 WHEN 'CAP_PHAT' THEN 5 ELSE -1 END;

  v_target_idx := CASE upper(trim(p_target_station))
    WHEN 'TIEP_NHAN' THEN 0 WHEN 'LAM_SACH' THEN 1 WHEN 'QC' THEN 2
    WHEN 'DONG_GOI' THEN 3 WHEN 'TIET_KHUAN' THEN 4 WHEN 'CAP_PHAT' THEN 5 ELSE -1 END;

  IF NOT (v_current_ma = 'CAP_PHAT' AND upper(trim(p_target_station)) = 'TIEP_NHAN') THEN
    IF v_target_idx != v_current_idx + 1 THEN
      RETURN json_build_object('success', false, 'message', 'Sai trạm! Quy trình đang ở bước ' || v_current_ma);
    END IF;
  END IF;

  IF v_current_ma = 'CAP_PHAT' AND upper(trim(p_target_station)) = 'TIEP_NHAN' THEN
    -- Khi tiếp nhận chu kỳ mới cho mã bộ, gán ngay thời gian tiếp nhận và người tiếp nhận
    INSERT INTO public.cssd_fact_quy_trinh(
      ma_qr_quy_trinh,
      bo_dung_cu_id,
      tram_hien_tai_id,
      suds_count,
      tinh_trang,
      is_dong_bang,
      is_active,
      created_at,
      updated_at,
      thoi_gian_tiep_nhan,
      nguoi_tiep_nhan_id
    ) VALUES (
      p_ma_qr,
      v_row.bo_dung_cu_id,
      v_target_id,
      coalesce(v_row.suds_count, 0) + 1,
      'BINH_THUONG',
      false,
      true,
      now(),
      now(),
      now(),
      v_operator_id
    );
    -- Deactivate dòng chu kỳ cũ
    UPDATE public.cssd_fact_quy_trinh
    SET is_active = false, updated_at = now()
    WHERE id = v_row.id;
  ELSE
    -- Chuyển trạm trung gian, cập nhật mốc thời gian và người thực hiện tương ứng của trạm đích
    UPDATE public.cssd_fact_quy_trinh
    SET 
      tram_hien_tai_id = v_target_id, 
      updated_at = now(),
      thoi_gian_lam_sach = CASE WHEN p_target_station = 'LAM_SACH' THEN now() ELSE thoi_gian_lam_sach END,
      nguoi_lam_sach_id = CASE WHEN p_target_station = 'LAM_SACH' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_lam_sach_id END,
      
      thoi_gian_qc = CASE WHEN p_target_station = 'QC' THEN now() ELSE thoi_gian_qc END,
      nguoi_kiem_tra_id = CASE WHEN p_target_station = 'QC' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_kiem_tra_id END,
      
      thoi_gian_dong_goi = CASE WHEN p_target_station = 'DONG_GOI' THEN now() ELSE thoi_gian_dong_goi END,
      nguoi_dong_goi_id = CASE WHEN p_target_station = 'DONG_GOI' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_dong_goi_id END,
      
      thoi_gian_tiet_khuan = CASE WHEN p_target_station = 'TIET_KHUAN' THEN now() ELSE thoi_gian_tiet_khuan END,
      nguoi_tiet_khuan_id = CASE WHEN p_target_station = 'TIET_KHUAN' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_tiet_khuan_id END,
      
      thoi_gian_cap_phat = CASE WHEN p_target_station = 'CAP_PHAT' THEN now() ELSE thoi_gian_cap_phat END,
      nguoi_cap_phat_id = CASE WHEN p_target_station = 'CAP_PHAT' AND v_operator_id IS NOT NULL THEN v_operator_id ELSE nguoi_cap_phat_id END
    WHERE id = v_row.id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'data', jsonb_build_object('den', upper(trim(p_target_station)), 'operator', p_operator_label)
  );
END;
$$;


-- =========================================================================
-- 2. TÁI CẤU TRÚC ĐỔI TÊN BẢNG THEO MODULE (GSTT, NKBV, QLCV)
-- =========================================================================

-- Drop các views cũ liên quan để tránh lỗi CASCADE trước khi rename bảng
DROP VIEW IF EXISTS public.v_fact_giam_sat_chung_sessions_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_bang_kiem_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_tieu_chi_bang_kiem_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_nkbv_ca_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_cong_viec_full CASCADE;
DROP VIEW IF EXISTS public.v_cong_viec_qua_han CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_sessions_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_full CASCADE;
DROP VIEW IF EXISTS public.v_gsc_dashboard_rows CASCADE;

-- Rename bảng module QLCV (Quản lý Công việc)
ALTER TABLE IF EXISTS public.dm_loai_cong_viec RENAME TO qlcv_dm_loai_cong_viec;
ALTER TABLE IF EXISTS public.dm_trang_thai_cong_viec RENAME TO qlcv_dm_trang_thai_cong_viec;
ALTER TABLE IF EXISTS public.fact_cong_viec RENAME TO qlcv_fact_cong_viec;
ALTER TABLE IF EXISTS public.fact_cong_viec_dinh_ky RENAME TO qlcv_fact_cong_viec_dinh_ky;
ALTER TABLE IF EXISTS public.fact_cong_viec_hoat_dong RENAME TO qlcv_fact_cong_viec_hoat_dong;
ALTER TABLE IF EXISTS public.fact_qlcv_danh_gia_thang RENAME TO qlcv_fact_danh_gia_thang;

-- Rename bảng module GSTT (Giám sát Tuân thủ)
ALTER TABLE IF EXISTS public.dm_bang_kiem RENAME TO gstt_dm_bang_kiem;
ALTER TABLE IF EXISTS public.dm_tieu_chi_bang_kiem RENAME TO gstt_dm_tieu_chi_bang_kiem;
ALTER TABLE IF EXISTS public.dm_cach_thuc_giam_sat RENAME TO gstt_dm_cach_thuc_giam_sat;
ALTER TABLE IF EXISTS public.dm_hinh_thuc_giam_sat RENAME TO gstt_dm_hinh_thuc_giam_sat;
ALTER TABLE IF EXISTS public.dm_khu_vuc_giam_sat RENAME TO gstt_dm_khu_vuc_giam_sat;
ALTER TABLE IF EXISTS public.fact_giam_sat_chung_sessions RENAME TO gstt_fact_chung_sessions;
ALTER TABLE IF EXISTS public.fact_giam_sat_vst_sessions RENAME TO gstt_fact_vst_sessions;
ALTER TABLE IF EXISTS public.fact_giam_sat_vst RENAME TO gstt_fact_vst;

-- Rename bảng module NKBV (Nhiễm khuẩn Bệnh viện)
ALTER TABLE IF EXISTS public.dm_trang_thai_nkbv_ca RENAME TO nkbv_dm_trang_thai_ca;
ALTER TABLE IF EXISTS public.dm_loai_nkbv RENAME TO nkbv_dm_loai;
ALTER TABLE IF EXISTS public.fact_nkbv_benh_an RENAME TO nkbv_fact_benh_an;
ALTER TABLE IF EXISTS public.fact_nkbv_vi_sinh RENAME TO nkbv_fact_vi_sinh;
ALTER TABLE IF EXISTS public.fact_nkbv_su_kien RENAME TO nkbv_fact_su_kien;


-- =========================================================================
-- 3. TẠO CÁC VIEWS TƯƠNG THÍCH NGƯỢC (BACKWARD COMPATIBLE VIEWS)
-- =========================================================================
CREATE OR REPLACE VIEW public.dm_loai_cong_viec WITH (security_invoker='true') AS SELECT * FROM public.qlcv_dm_loai_cong_viec;
CREATE OR REPLACE VIEW public.dm_trang_thai_cong_viec WITH (security_invoker='true') AS SELECT * FROM public.qlcv_dm_trang_thai_cong_viec;
CREATE OR REPLACE VIEW public.fact_cong_viec WITH (security_invoker='true') AS SELECT * FROM public.qlcv_fact_cong_viec;
CREATE OR REPLACE VIEW public.fact_cong_viec_dinh_ky WITH (security_invoker='true') AS SELECT * FROM public.qlcv_fact_cong_viec_dinh_ky;
CREATE OR REPLACE VIEW public.fact_cong_viec_hoat_dong WITH (security_invoker='true') AS SELECT * FROM public.qlcv_fact_cong_viec_hoat_dong;
CREATE OR REPLACE VIEW public.fact_qlcv_danh_gia_thang WITH (security_invoker='true') AS SELECT * FROM public.qlcv_fact_danh_gia_thang;

CREATE OR REPLACE VIEW public.dm_bang_kiem WITH (security_invoker='true') AS SELECT * FROM public.gstt_dm_bang_kiem;
CREATE OR REPLACE VIEW public.dm_tieu_chi_bang_kiem WITH (security_invoker='true') AS SELECT * FROM public.gstt_dm_tieu_chi_bang_kiem;
CREATE OR REPLACE VIEW public.dm_cach_thuc_giam_sat WITH (security_invoker='true') AS SELECT * FROM public.gstt_dm_cach_thuc_giam_sat;
CREATE OR REPLACE VIEW public.dm_hinh_thuc_giam_sat WITH (security_invoker='true') AS SELECT * FROM public.gstt_dm_hinh_thuc_giam_sat;
CREATE OR REPLACE VIEW public.dm_khu_vuc_giam_sat WITH (security_invoker='true') AS SELECT * FROM public.gstt_dm_khu_vuc_giam_sat;
CREATE OR REPLACE VIEW public.fact_giam_sat_chung_sessions WITH (security_invoker='true') AS SELECT * FROM public.gstt_fact_chung_sessions;
CREATE OR REPLACE VIEW public.fact_giam_sat_vst_sessions WITH (security_invoker='true') AS SELECT * FROM public.gstt_fact_vst_sessions;
CREATE OR REPLACE VIEW public.fact_giam_sat_vst WITH (security_invoker='true') AS SELECT * FROM public.gstt_fact_vst;

CREATE OR REPLACE VIEW public.dm_trang_thai_nkbv_ca WITH (security_invoker='true') AS SELECT * FROM public.nkbv_dm_trang_thai_ca;
CREATE OR REPLACE VIEW public.dm_loai_nkbv WITH (security_invoker='true') AS SELECT * FROM public.nkbv_dm_loai;
CREATE OR REPLACE VIEW public.fact_nkbv_benh_an WITH (security_invoker='true') AS SELECT * FROM public.nkbv_fact_benh_an;
CREATE OR REPLACE VIEW public.fact_nkbv_vi_sinh WITH (security_invoker='true') AS SELECT * FROM public.nkbv_fact_vi_sinh;
CREATE OR REPLACE VIEW public.fact_nkbv_su_kien WITH (security_invoker='true') AS SELECT * FROM public.nkbv_fact_su_kien;


-- =========================================================================
-- 4. TÁI TẠO CÁC VIEWS PHẲNG (FLATTENED VIEWS) BẰNG BẢNG MỚI
-- =========================================================================
CREATE OR REPLACE VIEW public.v_dm_bang_kiem_full WITH (security_invoker='true') AS
 SELECT id, ma_bk, ten_bang_kiem, nhom_chuyen_de, mo_ta, loai_hinh_giam_sat, is_active, is_system, created_at, updated_at
 FROM public.gstt_dm_bang_kiem;

CREATE OR REPLACE VIEW public.v_dm_tieu_chi_bang_kiem_full WITH (security_invoker='true') AS
 SELECT tc.id, tc.bang_kiem_id, bk.ma_bk AS ma_bang_kiem, bk.ten_bang_kiem, tc.noi_dung, tc.stt, tc.diem_toi_da, tc.is_active, tc.created_at, tc.updated_at
 FROM public.gstt_dm_tieu_chi_bang_kiem tc
 LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = tc.bang_kiem_id;

CREATE OR REPLACE VIEW public.v_fact_giam_sat_chung_sessions_full WITH (security_invoker='true') AS
 SELECT s.id, s.bang_kiem_id, bk.ma_bk AS loai_bang_kiem, s.khoa_id, s.khu_vuc_id, s.vi_tri, s.hinh_thuc_id, s.cach_thuc_id, s.nguoi_giam_sat_id, s.is_giam_sat_ca_nhan, s.nhan_vien_id, s.nghe_nghiep_id, s.ngay_giam_sat, s.thoi_gian_ghi_nhan, s.thoi_gian_bat_dau, s.thoi_gian_ket_thuc, s.tong_diem, s.ghi_chu_chung, COALESCE((s.metadata->>'is_manual_nhan_vien')::boolean, false) AS is_manual_nhan_vien, s.metadata->>'ten_manual_nhan_vien' AS ten_manual_nhan_vien, COALESCE((s.metadata->>'is_bo_sung_nguoi_benh')::boolean, false) AS is_bo_sung_nguoi_benh, s.metadata->>'ma_nguoi_benh' AS ma_nguoi_benh, s.metadata->>'ten_nguoi_benh' AS ten_nguoi_benh, s.metadata->>'so_giuong_nguoi_benh' AS so_giuong_nguoi_benh, s.is_active, s.is_seen, s.created_at, s.updated_at, s.results_jsonb, k.ma_khoa AS ma_khoa_phong, k.ten_khoa AS ten_khoa_phong, kv.ma_khu_vuc AS ma_khu_vuc_giam_sat, kv.ten_khu_vuc AS ten_khu_vuc_giam_sat, ns_gs.ho_ten AS ten_nguoi_giam_sat, ns_gs.ma_nv AS ma_nguoi_giam_sat, ns_nv.ho_ten AS ten_nhan_vien, ns_nv.ma_nv AS ma_nhan_vien, nn.ma_nghe_nghiep, nn.ten_nghe_nghiep, ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat, ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc, ht.ten_hinh_thuc AS hinh_thuc_giam_sat, ct.ma_cach_thuc AS ma_cach_thuc_giam_sat, ct.ten_cach_thuc AS ten_cach_thuc_danh_muc, ct.ten_cach_thuc AS cach_thuc_giam_sat, bk.ten_bang_kiem AS ten_bang_kiem_hien_thi
 FROM public.gstt_fact_chung_sessions s
 LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = s.bang_kiem_id
 LEFT JOIN public.dm_khoa_phong k ON k.id = s.khoa_id
 LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
 LEFT JOIN public.mdm_nhan_su ns_gs ON ns_gs.id = s.nguoi_giam_sat_id
 LEFT JOIN public.mdm_nhan_su ns_nv ON ns_nv.id = s.nhan_vien_id
 LEFT JOIN public.dm_nghe_nghiep nn ON nn.id = s.nghe_nghiep_id
 LEFT JOIN public.gstt_dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
 LEFT JOIN public.gstt_dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
 WHERE COALESCE(s.is_active, true) = true;

CREATE OR REPLACE VIEW public.v_fact_giam_sat_vst_full WITH (security_invoker='true') AS
 SELECT o.id, o.session_id, o.nhan_vien_id, o.metadata->>'ten_nhan_vien_ngoai' AS ten_nhan_vien_ngoai, o.khoa_id, o.khu_vuc_id, o.nghe_nghiep_id, o.vi_tri, o.ngay_giam_sat, o.thoi_diem, o.hanh_dong, o.dung_ky_thuat, o.du_thoi_gian, o.co_deo_gang, o.thoi_gian_ghi_nhan, o.ghi_chu, kv.ma_khu_vuc AS ma_khu_vuc_giam_sat, COALESCE(kv.ten_khu_vuc, ''::text) AS khu_vuc, COALESCE(kv.ten_khu_vuc, ''::text) AS ten_khu_vuc_hien_thi, nn.ma_nghe_nghiep, COALESCE(nn.ten_nghe_nghiep, ''::text) AS nghe_nghiep, COALESCE(nn.ten_nghe_nghiep, ''::text) AS ten_nghe_nghiep_hien_thi, k.ten_khoa AS ten_khoa_phong, o.created_at
 FROM public.gstt_fact_vst o
 LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = o.khu_vuc_id
 LEFT JOIN public.dm_nghe_nghiep nn ON nn.id = o.nghe_nghiep_id
 LEFT JOIN public.dm_khoa_phong k ON k.id = o.khoa_id;

CREATE OR REPLACE VIEW public.v_fact_giam_sat_vst_sessions_full WITH (security_invoker='true') AS
 SELECT s.id, s.khoa_id, s.khu_vuc_id, s.vi_tri_cu_the, s.hinh_thuc_id, s.cach_thuc_id, s.nguoi_giam_sat_id, s.thoi_gian_bat_dau, s.thoi_gian_ket_thuc, s.ngay_giam_sat, s.is_active, s.is_seen, s.created_at, s.updated_at, k.ma_khoa AS ma_khoa_phong, k.ten_khoa AS ten_khoa_phong, kv.ma_khu_vuc AS ma_khu_vuc_giam_sat, kv.ten_khu_vuc AS ten_khu_vuc_giam_sat, ns.ho_ten AS ten_nguoi_giam_sat, ns.ma_nv AS ma_nguoi_giam_sat, ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat, ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc, ht.ten_hinh_thuc AS hinh_thuc_giam_sat, ct.ma_cach_thuc AS ma_cach_thuc_giam_sat, ct.ten_cach_thuc AS ten_cach_thuc_danh_muc, ct.ten_cach_thuc AS cach_thuc_giam_sat, ( SELECT count(*) AS count FROM public.gstt_fact_vst o WHERE o.session_id = s.id) AS tong_co_hoi, ( SELECT count(*) AS count FROM public.gstt_fact_vst o WHERE o.session_id = s.id AND (lower(public.unaccent(o.hanh_dong)) = 'rua tay bang nuoc'::text OR lower(public.unaccent(o.hanh_dong)) = 'cha tay bang con'::text)) AS da_tuan_thu
 FROM public.gstt_fact_vst_sessions s
 LEFT JOIN public.dm_khoa_phong k ON k.id = s.khoa_id
 LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
 LEFT JOIN public.mdm_nhan_su ns ON ns.id = s.nguoi_giam_sat_id
 LEFT JOIN public.gstt_dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
 LEFT JOIN public.gstt_dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
 WHERE COALESCE(s.is_active, true) = true;

CREATE OR REPLACE VIEW public.v_gsc_dashboard_rows WITH (security_invoker='true') AS
 SELECT s.id AS session_id, s.ngay_giam_sat, s.created_at, COALESCE(bk.ma_bk, ''::text) AS loai_bang_kiem, s.tong_diem, s.khoa_id, kp.ten_khoa, (r.elem->>'criterion_id')::uuid AS id, (r.elem->>'criterion_id')::uuid AS result_id, (r.elem->>'criterion_id')::uuid AS criterion_id, r.elem->>'value' AS value, r.elem->>'value' AS result_value, r.elem->>'note' AS note
 FROM public.gstt_fact_chung_sessions s
 LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = s.bang_kiem_id
 LEFT JOIN public.dm_khoa_phong kp ON kp.id = s.khoa_id
 LEFT JOIN LATERAL jsonb_array_elements(s.results_jsonb) r(elem) ON true
 WHERE s.is_active = true;

CREATE OR REPLACE VIEW public.v_fact_cong_viec_full WITH (security_invoker='true') AS
 SELECT cv.id, cv.cong_viec_cha_id, cv.tieu_de, cv.mo_ta, cv.loai_cong_viec_id, lc.ma AS loai_cong_viec, lc.ten AS ten_loai_cong_viec, cv.trang_thai_id, ts.ma AS trang_thai, ts.ten AS ten_trang_thai_hien_thi, cv.muc_do_uu_tien, cv.han_hoan_thanh, cv.phan_tram_hoan_thanh, cv.nguoi_tao_id, cv.nguoi_giao_viec_id, cv.nguoi_phu_trach_id, cv.khoa_thuc_hien_id, cv.to_cong_tac_id, cv.dinh_ky_mau_id, cv.is_active, cv.created_at, cv.updated_at, ns_tao.ho_ten AS nguoi_tao_ten, ns_phu.ho_ten AS nguoi_phu_trach_ten, ns_giao.ho_ten AS nguoi_giao_ten, k.ten_khoa AS khoa_thuc_hien_ten, t.ten_to AS to_cong_tac_ten, ((cv.han_hoan_thanh IS NOT NULL) AND (cv.han_hoan_thanh < CURRENT_DATE) AND (COALESCE(ts.ma, ''::text) <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text]))) AS is_qua_han, ( SELECT (count(*))::integer AS count FROM public.qlcv_fact_cong_viec sub WHERE sub.cong_viec_cha_id = cv.id AND sub.is_active = true) AS cong_viec_con_count
 FROM public.qlcv_fact_cong_viec cv
 LEFT JOIN public.qlcv_dm_loai_cong_viec lc ON lc.id = cv.loai_cong_viec_id
 LEFT JOIN public.qlcv_dm_trang_thai_cong_viec ts ON ts.id = cv.trang_thai_id
 LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
 LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
 LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
 LEFT JOIN public.dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
 LEFT JOIN public.dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

CREATE OR REPLACE VIEW public.v_cong_viec_qua_han AS
 SELECT id, cong_viec_cha_id, tieu_de, mo_ta, loai_cong_viec_id, loai_cong_viec, ten_loai_cong_viec, trang_thai_id, trang_thai, ten_trang_thai_hien_thi, muc_do_uu_tien, han_hoan_thanh, phan_tram_hoan_thanh, nguoi_tao_id, nguoi_giao_viec_id, nguoi_phu_trach_id, khoa_thuc_hien_id, to_cong_tac_id, dinh_ky_mau_id, is_active, created_at, updated_at, nguoi_tao_ten, nguoi_phu_trach_ten, nguoi_giao_ten, khoa_thuc_hien_ten, to_cong_tac_ten, is_qua_han, cong_viec_con_count
 FROM public.v_fact_cong_viec_full
 WHERE is_qua_han = true;

COMMIT;
