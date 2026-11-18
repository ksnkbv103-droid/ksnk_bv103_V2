/** Helper thuần cho kế hoạch giám sát khoa/tháng (QT.KSNK.33). Chỉ tiêu chung mặc định 1 phiên. */

export const KE_HOACH_CHI_TIEU_MAC_DINH = 1;

/** Chuẩn hóa ngày bất kỳ (YYYY-MM-DD) về ngày đầu tháng; không hợp lệ → null. */
export function toThangDauThang(ngay: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ngay ?? "").trim());
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `${m[1]}-${m[2]}-01`;
}

export type KeHoachTienDoRow = {
  khoa_id: string;
  chi_tieu: number;
  so_phien: number;
  ty_le_hoan_thanh: number;
  dat: boolean;
};

export function summarizeKeHoach(rows: KeHoachTienDoRow[]) {
  const dat = rows.filter((r) => r.dat).length;
  return { tong: rows.length, dat, chua: rows.length - dat };
}

/** Xếp dòng kế hoạch theo tên khoa (tiếng Việt); khoa không có tên xuống cuối; hòa thì theo khoa_id. Không sửa mảng gốc. */
export function sortKeHoachTheoTenKhoa(rows: KeHoachTienDoRow[], tenKhoa: Map<string, string>): KeHoachTienDoRow[] {
  return [...rows].sort((a, b) => {
    const ta = tenKhoa.get(a.khoa_id);
    const tb = tenKhoa.get(b.khoa_id);
    if (ta && tb) return ta.localeCompare(tb, "vi", { numeric: true }) || a.khoa_id.localeCompare(b.khoa_id);
    if (ta || tb) return ta ? -1 : 1;
    return a.khoa_id.localeCompare(b.khoa_id);
  });
}
