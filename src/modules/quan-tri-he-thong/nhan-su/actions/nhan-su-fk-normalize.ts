
/** Gợi ý hành động khi Postgres báo FK khoa sai (thường do DB chưa chạy migration P1). */
export function formatHoSoKhoaFkViolation(message: string | undefined): string {
  const m = message || "";
  if (!m.includes("ho_so_nhan_vien_khoa_id_fkey") && !m.includes("mdm_nhan_su_khoa_id_fkey")) return m || "";
  return (
    `${m.trim()} — Sau chuẩn hoá, khoa_id phải tham chiếu dm_khoa_phong. Vui lòng kiểm tra lại cấu trúc Database trong file Baseline.`
  );
}

/** Chuẩn hóa thông báo lỗi ghi mdm_nhan_su (thêm/sửa nhân sự). */
export function formatHoSoNhanSuWriteError(message: string | undefined): string {
  const m = message || "";
  if (
    m.includes("ho_so_nhan_vien_id_fkey") ||
    m.includes("mdm_nhan_su_id_fkey") ||
    (m.includes("violates foreign key constraint") &&
      m.includes("auth.users") &&
      (m.includes("ho_so_nhan_vien") || m.includes("mdm_nhan_su")))
  ) {
    return (
      `${m.trim()} — Hồ sơ không còn bắt buộc trùng id tài khoản đăng nhập. ` +
      "Vui lòng kiểm tra lại cấu trúc bảng trong file Baseline migration."
    );
  }
  if (
    m.includes("null value") &&
    m.includes("id") &&
    (m.includes("ho_so_nhan_vien") || m.includes("mdm_nhan_su"))
  ) {
    return (
      `${m.trim()} — Cột id cần DEFAULT gen_random_uuid(). ` +
      "Vui lòng kiểm tra lại định nghĩa bảng trong file Baseline migration."
    );
  }
  return formatHoSoKhoaFkViolation(m);
}
