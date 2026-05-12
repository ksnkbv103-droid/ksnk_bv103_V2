export type NormalizedBangKiemGroup = {
  ma_bk: string;
  ten_bang_kiem: string;
  nhom_chuyen_de: string;
  mo_ta: string;
  is_active: boolean;
  children: Record<string, unknown>[];
};

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
        nhom_chuyen_de: nhomChuyenDe,
        mo_ta: moTaBangKiem,
        is_active: parentIsActive,
        children: [...children],
      });
    } else {
      existing.children.push(...children);
      if (!existing.ma_bk && maBK) existing.ma_bk = maBK;
      if (!existing.ten_bang_kiem && tenBangKiem) existing.ten_bang_kiem = tenBangKiem;
      if (!existing.nhom_chuyen_de && nhomChuyenDe) existing.nhom_chuyen_de = nhomChuyenDe;
      if (!existing.mo_ta && moTaBangKiem) existing.mo_ta = moTaBangKiem;
    }
  }
  const normalizedGroups = Array.from(normalizedGroupsMap.values());
  if (normalizedGroups.length === 0) {
    return { ok: false, error: "Không tìm thấy bảng kiểm hợp lệ trong file import." };
  }
  return { ok: true, groups: normalizedGroups };
}
