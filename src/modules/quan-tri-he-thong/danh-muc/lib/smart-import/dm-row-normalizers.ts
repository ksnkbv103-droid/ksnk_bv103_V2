/** Chuẩn hóa field theo từng bảng DM trước khi upsert (logic thuần). */

export function normalizeDmBoDungCuChiTiet(rest: Record<string, unknown>): Record<string, unknown> {
  const out = { ...rest };
  const ten = String(out.ten_chi_tiet ?? out.ten_dung_cu_le ?? "").trim();
  if (ten) {
    out.ten_chi_tiet = ten;
    out.ten_dung_cu_le = ten;
  }
  const bo = out.bo_dung_cu_id;
  if (bo === "" || bo === undefined) out.bo_dung_cu_id = null;
  const sl = out.so_luong;
  if (sl !== undefined && sl !== null && sl !== "") {
    const n = Number(sl);
    out.so_luong = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  }
  const mx = out.max_suds_count;
  if (mx !== undefined && mx !== null && mx !== "") {
    out.max_suds_count = Math.max(0, Math.floor(Number(mx)) || 0);
  } else {
    out.max_suds_count = 100;
  }
  const tl = out.trong_luong;
  if (tl === "" || tl === undefined || tl === null) {
    out.trong_luong = null;
  } else {
    const n = Number(String(tl).replace(",", "."));
    out.trong_luong = Number.isFinite(n) ? n : null;
  }
  return out;
}

export function normalizeDmThietBi(rest: Record<string, unknown>): Record<string, unknown> {
  const out = { ...rest };
  const nam = out.nam_san_xuat;
  if (nam === "" || nam === undefined || nam === null) out.nam_san_xuat = null;
  else {
    const n = Math.floor(Number(nam));
    out.nam_san_xuat = Number.isFinite(n) ? n : null;
  }
  const cycle = out.chu_ky_bao_tri_ngay;
  if (cycle === "" || cycle === undefined || cycle === null) out.chu_ky_bao_tri_ngay = 180;
  else out.chu_ky_bao_tri_ngay = Math.max(1, Math.floor(Number(cycle)) || 1);
  const trangThai = String(out.trang_thai || "").trim();
  out.trang_thai = trangThai || "READY";
  return out;
}

export function normalizeDmHoaChat(rest: Record<string, unknown>): Record<string, unknown> {
  const out = { ...rest };
  const loai = String(out.loai_hoa_chat || "").trim().toUpperCase();
  out.loai_hoa_chat = loai || "HOA_CHAT";
  return out;
}

export function buildImportErrorMessage(rowErrors: string[], dbErrors: string[]) {
  return [
    `Import dừng do ${rowErrors.length + dbErrors.length} lỗi.`,
    rowErrors.length ? `Lỗi dữ liệu:\n${rowErrors.slice(0, 10).join("\n")}` : "",
    dbErrors.length ? `Lỗi DB:\n${dbErrors.slice(0, 10).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
