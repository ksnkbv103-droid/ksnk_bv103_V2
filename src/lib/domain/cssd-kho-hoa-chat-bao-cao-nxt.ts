/** Báo cáo Nhập–Xuất–Tồn theo kỳ, đọc từ sổ phiếu đã duyệt. Thuần, không I/O. */

export type NxtSoRow = { dm_hoa_chat_id: string; so_luong_co_dau: number; ly_do_xuat: string | null; ngay: string };
export type NxtDm = { id: string; ma_hoa_chat: string; ten_hoa_chat: string; don_vi_tinh: string | null };
export type NxtDong = {
  dm_hoa_chat_id: string;
  ma_hoa_chat: string;
  ten_hoa_chat: string;
  don_vi_tinh: string | null;
  ton_dau: number;
  nhap: number;
  xuat_cap_su_dung: number;
  xuat_khac: number;
  ton_cuoi: number;
};

/** `ngay` = YYYY-MM-DD (giờ VN). Dòng trước `tu` vào tồn đầu, trong [tu, den] vào phát sinh, sau `den` bị bỏ. */
export function buildBaoCaoNxt(rows: NxtSoRow[], dms: NxtDm[], tu: string, den: string): NxtDong[] {
  const acc = new Map<string, NxtDong>();
  const get = (id: string): NxtDong | null => {
    const hit = acc.get(id);
    if (hit) return hit;
    const dm = dms.find((d) => d.id === id);
    if (!dm) return null;
    const d: NxtDong = { dm_hoa_chat_id: id, ma_hoa_chat: dm.ma_hoa_chat, ten_hoa_chat: dm.ten_hoa_chat, don_vi_tinh: dm.don_vi_tinh, ton_dau: 0, nhap: 0, xuat_cap_su_dung: 0, xuat_khac: 0, ton_cuoi: 0 };
    acc.set(id, d);
    return d;
  };
  for (const r of rows) {
    if (r.ngay > den) continue;
    const d = get(r.dm_hoa_chat_id);
    if (!d) continue;
    const q = r.so_luong_co_dau;
    if (r.ngay < tu) d.ton_dau += q;
    else if (q > 0) d.nhap += q;
    // Phiếu xuất cũ chưa có lý do coi là cấp sử dụng (khớp cảnh báo sắp hết).
    else if (r.ly_do_xuat == null || r.ly_do_xuat === "CAP_SU_DUNG") d.xuat_cap_su_dung += -q;
    else d.xuat_khac += -q;
  }
  const out = [...acc.values()].map((d) => ({ ...d, ton_cuoi: d.ton_dau + d.nhap - d.xuat_cap_su_dung - d.xuat_khac }));
  return out
    .filter((d) => d.ton_dau !== 0 || d.nhap !== 0 || d.xuat_cap_su_dung !== 0 || d.xuat_khac !== 0)
    .sort((a, b) => a.ma_hoa_chat.localeCompare(b.ma_hoa_chat, "vi"));
}
