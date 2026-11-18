-- NKBV-038 (THẤP, BACKEND): vai NGOÀI KSNK có GIAM_SAT_NKBV:view (local: TO_TRUONG_CSSD_TEST) đang đọc toàn viện sáu bảng nkbv_fact_*
-- có danh tính vì fn_nkbv_actor_khoa_restricted() chỉ khóa khoa khi có MANG_LUOI_KSNK (20261111170000).
-- SSOT: docs/modules/nkbv/domain-specification.md:112-117 (nhân viên lâm sàng chỉ thấy khoa của mình); M03 §2 (danh tính chỉ CB/TK_KSNK;
-- CHU_NHIEM_KHOA ≡ TK_KSNK «X*» → giữ toàn viện khi không kiêm Mạng lưới).
-- Mặc định ĐÓNG: toàn viện chỉ cho ADMIN, NHAN_VIEN_KSNK, HOI_DONG_KSNK, hoặc CHU_NHIEM_KHOA không kiêm MANG_LUOI_KSNK; mọi vai khác bị giới hạn khoa.
-- Khớp resolveNkbvIdentityRestriction (src/modules/giam-sat-nkbv/lib/nkbv-khoa-scope.ts). Chính sách *_select và hàm tập mã bệnh án KHÔNG đổi:
-- chỉ đổi điều kiện «bị giới hạn khoa». Thống kê NKBV đọc bằng admin client (resolveNkbvKhoaRestriction) nên không đổi.
-- ẢNH HƯỞNG: vai ngoài KSNK có view đọc ít dòng đi (đúng ý); vai chưa gán khoa → 0 dòng (fn_nkbv_actor_khoa_ma_benh_an_set rỗng).
-- LƯU Ý (review-bv103): tài khoản break-glass theo email (KSNK_BREAK_GLASS_EMAILS) app coi là ADMIN nhưng fn_sys_is_admin() không biết email đó;
-- nếu tài khoản không có vai ADMIN thật trong DB thì đường đọc bằng user client (RLS) sẽ bị giới hạn khoa. Gán vai ADMIN thật nếu cần đọc toàn viện.
-- HOÀN TÁC: chạy lại thân hàm của 20261111170000 (MANG_LUOI_KSNK AND NOT admin AND NOT NV AND NOT HD).
-- CỔNG PO: CHƯA áp prod. Trước khi áp phải đo prod (read-only): số người theo vai có GIAM_SAT_NKBV:view ngoài ADMIN/NV KSNK/HĐ/CNK.
CREATE OR REPLACE FUNCTION public.fn_nkbv_actor_khoa_restricted()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT public.fn_sys_is_admin()
     AND NOT public.fn_sys_has_role('NHAN_VIEN_KSNK')
     AND NOT public.fn_sys_has_role('HOI_DONG_KSNK')
     AND (public.fn_sys_has_role('MANG_LUOI_KSNK') OR NOT public.fn_sys_has_role('CHU_NHIEM_KHOA'));
$$;
