/** Nhóm màu IPAC + helper UI cho dropdown khu vực giám sát. */

export const KHU_VUC_ZONE_ORDER = ["TR", "DO", "VA", "XA"] as const;
export type KhuVucZoneCode = (typeof KHU_VUC_ZONE_ORDER)[number];

export const KHU_VUC_ZONE_LABELS: Record<KhuVucZoneCode, string> = {
  TR: "Vùng Trắng — vô khuẩn cao",
  DO: "Vùng Đỏ — lây nhiễm cao",
  VA: "Vùng Vàng — lây nhiễm trung bình",
  XA: "Vùng Xanh — lây nhiễm thấp",
};

export type KhuVucSelectRow = {
  id: string;
  ten_danh_muc: string;
  ma_danh_muc?: string;
  nhom_mau?: string | null;
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

export function zoneFromKhuVucMa(_ma: string, nhomMau?: string | null): string {
  const zone = String(nhomMau || "").trim().toUpperCase();
  if (zone && KHU_VUC_ZONE_ORDER.includes(zone as KhuVucZoneCode)) return zone;
  return "";
}

export function khuVucZoneBadgeClass(zone: string): string {
  switch (zone) {
    case "TR":
      return "bg-slate-200 text-slate-800";
    case "DO":
      return "bg-rose-100 text-rose-800";
    case "VA":
      return "bg-amber-100 text-amber-800";
    case "XA":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function buildKhuVucGroupedSelectOptions(rows: KhuVucSelectRow[]) {
  const sorted = [...rows].sort((a, b) => {
    const zoneA = zoneFromKhuVucMa(a.ma_danh_muc || "", a.nhom_mau);
    const zoneB = zoneFromKhuVucMa(b.ma_danh_muc || "", b.nhom_mau);
    const orderA = KHU_VUC_ZONE_ORDER.indexOf(zoneA as KhuVucZoneCode);
    const orderB = KHU_VUC_ZONE_ORDER.indexOf(zoneB as KhuVucZoneCode);
    const z = (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
    if (z !== 0) return z;
    const thu = (a.thu_tu ?? 999) - (b.thu_tu ?? 999);
    if (thu !== 0) return thu;
    return String(a.ten_danh_muc || "").localeCompare(String(b.ten_danh_muc || ""), "vi");
  });

  return sorted.map((row) => {
    const zone = zoneFromKhuVucMa(row.ma_danh_muc || "", row.nhom_mau);
    const groupLabel =
      zone in KHU_VUC_ZONE_LABELS ? KHU_VUC_ZONE_LABELS[zone as KhuVucZoneCode] : "Khác";
    return {
      id: String(row.id),
      label: String(row.ten_danh_muc || ""),
      ma: String(row.ma_danh_muc || ""),
      groupLabel,
      keywords: [row.ma_danh_muc || "", row.ten_danh_muc || "", groupLabel, zone],
    };
  });
}
