/** Chuẩn hóa field theo từng bảng DM trước khi upsert (logic thuần). */

function normalizeNonNegativeInt(value: unknown): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Gói cột phẳng Excel → `specs` JSONB (schema `mdm_dm_khoa_phong` trên Supabase). */
export function normalizeDmKhoaPhong(rest: Record<string, unknown>): Record<string, unknown> {
  const out = { ...rest };
  const existingSpecs =
    typeof out.specs === "object" && out.specs !== null ? (out.specs as Record<string, unknown>) : {};

  const mo_ta =
    out.mo_ta_chuc_nang !== undefined
      ? String(out.mo_ta_chuc_nang || "").trim() || null
      : (existingSpecs.mo_ta_chuc_nang as string | null) ?? null;

  out.specs = {
    ...existingSpecs,
    mo_ta_chuc_nang: mo_ta,
    so_bac_si:
      out.so_bac_si !== undefined ? normalizeNonNegativeInt(out.so_bac_si) : normalizeNonNegativeInt(existingSpecs.so_bac_si),
    so_dieu_duong:
      out.so_dieu_duong !== undefined
        ? normalizeNonNegativeInt(out.so_dieu_duong)
        : normalizeNonNegativeInt(existingSpecs.so_dieu_duong),
    so_giuong_benh_thuong:
      out.so_giuong_benh_thuong !== undefined
        ? normalizeNonNegativeInt(out.so_giuong_benh_thuong)
        : normalizeNonNegativeInt(existingSpecs.so_giuong_benh_thuong),
    so_giuong_cap_cuu:
      out.so_giuong_cap_cuu !== undefined
        ? normalizeNonNegativeInt(out.so_giuong_cap_cuu)
        : normalizeNonNegativeInt(existingSpecs.so_giuong_cap_cuu),
  };

  delete out.mo_ta_chuc_nang;
  delete out.so_bac_si;
  delete out.so_dieu_duong;
  delete out.so_giuong_benh_thuong;
  delete out.so_giuong_cap_cuu;

  if (out.ma_khoa !== undefined && out.ma_khoa !== null && String(out.ma_khoa).trim() !== "") {
    out.ma_khoa = String(out.ma_khoa).trim().toUpperCase();
  }
  if (out.ten_khoa !== undefined && out.ten_khoa !== null) {
    out.ten_khoa = String(out.ten_khoa).trim();
  }

  return out;
}

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

  // Pack dropped fields to specs
  const ma_chi_tiet = out.ma_chi_tiet !== undefined ? String(out.ma_chi_tiet).trim() : undefined;
  
  const mx = out.max_suds_count;
  let max_suds_count = 100;
  if (mx !== undefined && mx !== null && mx !== "") {
    max_suds_count = Math.max(0, Math.floor(Number(mx)) || 0);
  }

  const tl = out.trong_luong;
  let trong_luong = null;
  if (tl !== "" && tl !== undefined && tl !== null) {
    const n = Number(String(tl).replace(",", "."));
    trong_luong = Number.isFinite(n) ? n : null;
  }

  const ma_qr_mau = out.ma_qr_mau !== undefined ? String(out.ma_qr_mau).trim() : undefined;

  const existingSpecs = typeof out.specs === "object" && out.specs !== null ? (out.specs as Record<string, unknown>) : {};
  out.specs = {
    ...existingSpecs,
    ...(ma_chi_tiet !== undefined ? { ma_chi_tiet } : {}),
    max_suds_count,
    trong_luong,
    ...(ma_qr_mau !== undefined ? { ma_qr_mau } : {}),
  };

  // Remove flat columns so they don't break the DB query
  delete out.ma_chi_tiet;
  delete out.max_suds_count;
  delete out.trong_luong;
  delete out.ma_qr_mau;

  return out;
}

export function normalizeDmThietBi(rest: Record<string, unknown>): Record<string, unknown> {
  const out = { ...rest };
  
  const hang_san_xuat = String(out.hang_san_xuat || "").trim() || null;
  const ghi_chu = String(out.ghi_chu || "").trim() || null;
  
  const nam = out.nam_san_xuat;
  let nam_san_xuat: number | null = null;
  if (nam !== "" && nam !== undefined && nam !== null) {
    const n = Math.floor(Number(nam));
    nam_san_xuat = Number.isFinite(n) ? n : null;
  }

  const existingSpecs = typeof out.specs === "object" && out.specs !== null ? (out.specs as Record<string, unknown>) : {};
  out.specs = {
    ...existingSpecs,
    hang_san_xuat,
    nam_san_xuat,
    ghi_chu,
  };

  delete out.hang_san_xuat;
  delete out.nam_san_xuat;
  delete out.ghi_chu;

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

  const quy_cach = String(out.quy_cach || "").trim() || null;
  const nong_do = String(out.nong_do || "").trim() || null;
  const ghi_chu = String(out.ghi_chu || "").trim() || null;

  const existingSpecs = typeof out.specs === "object" && out.specs !== null ? (out.specs as Record<string, unknown>) : {};
  out.specs = {
    ...existingSpecs,
    quy_cach,
    nong_do,
    ghi_chu,
  };

  delete out.quy_cach;
  delete out.nong_do;
  delete out.ghi_chu;

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
