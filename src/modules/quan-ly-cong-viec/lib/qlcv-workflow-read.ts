/** Hàng từ view v_qlcv_cong_viec_full đã có alias trang_thai / loai_cong_viec. */
export function qlcvWorkflowMaFromViewRow(row: {
  trang_thai?: string | null;
  loai_cong_viec?: string | null;
}): { trang_thai: string; loai_cong_viec: string | null } {
  return {
    trang_thai: String(row.trang_thai ?? "").trim(),
    loai_cong_viec: row.loai_cong_viec != null ? String(row.loai_cong_viec).trim() : null,
  };
}
