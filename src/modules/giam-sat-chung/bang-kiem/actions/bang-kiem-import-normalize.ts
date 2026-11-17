export type NormalizedBangKiemGroup = {
  ma_bk: string;
  ten_bang_kiem: string;
  phan_loai_chuyen_mon: string;
  mo_ta: string;
  is_active: boolean;
  children: Record<string, unknown>[];
};

/** Ánh xạ nhóm chuyên đề cũ (Excel import) sang phân loại chuyên môn của DB. */
function mapLegacyNhomToPhanLoai(nhom: string): string {
  const norm = nhom.trim().toUpperCase();
  if (norm === "VST" || norm === "VE_SINH_TAY" || norm === "PHONG_NGUA_CHUAN" || norm.includes("CHUAN")) {
    return "PHONG_NGUA_CHUAN";
  }
  if (norm === "CAN_THIEP" || norm === "GOI_CAN_THIEP") {
    return "GOI_CAN_THIEP";
  }
  if (norm === "MOI_TRUONG" || norm === "MOI_TRUONG_CHAT_THAI" || norm.includes("TRUONG")) {
    return "MOI_TRUONG_CHAT_THAI";
  }
  if (norm.includes("DUNG_CU") || norm === "XU_LY_DUNG_CU") {
    return "XU_LY_DUNG_CU";
  }
  if (norm.includes("CHUYEN_KHOA")) {
    return "CHUYEN_KHOA";
  }
  if (norm.includes("QUAN_TRI")) {
    return "QUAN_TRI_HE_THONG";
  }
  return "PHONG_NGUA_CHUAN"; // default fallback
}

/** Gom nhóm import theo tên bảng kiểm (contract cùng tên = cùng parent). */
export function normalizeBangKiemImportGroups(
  groups: Record<string, unknown>[],
): { ok: true; groups: NormalizedBangKiemGroup[] } | { ok: false; error: string } {
  const normalizedGroupsMap = new Map<string, NormalizedBangKiemGroup>();
  for (const rawGroup of groups) {
    const maBK = String(rawGroup.ma_bk ?? "").trim();
    const tenBangKiem = String(rawGroup.ten_bang_kiem ?? rawGroup.ten_bk ?? "").trim();
    const moTaBangKiem = String(rawGroup.mo_ta_bang_kiem ?? rawGroup.mo_ta ?? "").trim();
    const nhomChuyenDe = String(rawGroup.nhom_chuyen_de ?? "").trim();
    const phanLoai = mapLegacyNhomToPhanLoai(nhomChuyenDe);
    const parentIsActive = String(rawGroup.is_active ?? "true").toLowerCase() !== "false";
    if (!maBK && !tenBangKiem) continue;
    const normalizedName = tenBangKiem.toUpperCase();
    const key = normalizedName ? `NAME:${normalizedName}` : `CODE:${maBK}`;
    const existing = normalizedGroupsMap.get(key);
    const children = Array.isArray(rawGroup.children) ? (rawGroup.children as Record<string, unknown>[]) : [];
    if (!existing) {
      normalizedGroupsMap.set(key, {
        ma_bk: maBK || "",
        ten_bang_kiem: tenBangKiem,
        phan_loai_chuyen_mon: phanLoai,
        mo_ta: moTaBangKiem,
        is_active: parentIsActive,
        children: [...children],
      });
    } else {
      existing.children.push(...children);
      if (!existing.ma_bk && maBK) existing.ma_bk = maBK;
      if (!existing.ten_bang_kiem && tenBangKiem) existing.ten_bang_kiem = tenBangKiem;
      if (!existing.phan_loai_chuyen_mon && phanLoai) existing.phan_loai_chuyen_mon = phanLoai;
      if (!existing.mo_ta && moTaBangKiem) existing.mo_ta = moTaBangKiem;
    }
  }
  const normalizedGroups = Array.from(normalizedGroupsMap.values());
  if (normalizedGroups.length === 0) {
    return { ok: false, error: "Không tìm thấy bảng kiểm hợp lệ trong file import." };
  }
  return { ok: true, groups: normalizedGroups };
}
