/** Helper UI cho dropdown chức năng phòng (KHU_VUC_GIAM_SAT). */

export type KhuVucSelectRow = {
  id: string;
  ten_danh_muc: string;
  ma_danh_muc?: string;
  thu_tu?: number | null;
  metadata?: { is_common?: boolean } | null;
};

/** Lọc khu vực theo `specs.allowed_khu_vucs` của khoa (+ luôn giữ `is_common`). */
export function filterKhuVucsForKhoa(
  khuVucs: KhuVucSelectRow[],
  allowedKhuVucCodes: string[] | null | undefined,
): KhuVucSelectRow[] {
  if (allowedKhuVucCodes == null) return khuVucs;
  if (allowedKhuVucCodes.length === 0) {
    return khuVucs.filter((kv) => kv.metadata?.is_common === true);
  }
  const allowed = new Set(allowedKhuVucCodes.map((x) => String(x || "").trim().toUpperCase()).filter(Boolean));
  return khuVucs.filter((kv) => {
    if (kv.metadata?.is_common === true) return true;
    const code = String(kv.ma_danh_muc || "").trim().toUpperCase();
    return allowed.has(code);
  });
}

export function buildKhuVucFlatSelectOptions(rows: KhuVucSelectRow[]) {
  const sorted = [...rows].sort((a, b) => {
    const thu = (a.thu_tu ?? 999) - (b.thu_tu ?? 999);
    if (thu !== 0) return thu;
    return String(a.ten_danh_muc || "").localeCompare(String(b.ten_danh_muc || ""), "vi");
  });

  return sorted.map((row) => ({
    id: String(row.id),
    label: String(row.ten_danh_muc || ""),
    ma: String(row.ma_danh_muc || ""),
    keywords: [row.ma_danh_muc || "", row.ten_danh_muc || ""],
  }));
}
