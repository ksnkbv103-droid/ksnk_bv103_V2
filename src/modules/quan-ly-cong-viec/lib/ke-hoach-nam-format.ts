import type { NhiemVuRow } from "../actions/nhiem-vu.actions";

export type KeHoachNamPeriodKind = "THANG" | "QUY" | "NAM";

export type KeHoachNamPeriodFilter = {
  kind: KeHoachNamPeriodKind;
  /** 1–12 khi kind=THANG; 1–4 khi kind=QUY; bỏ qua khi NAM */
  value: number;
};

/** Nhãn kỳ gọn trên List: Q2·T6 hoặc hạn. */
export function formatNhiemVuKyHan(nv: Pick<NhiemVuRow, "quy" | "thang" | "han_hoan_thanh">): string {
  const parts: string[] = [];
  if (nv.quy != null) parts.push(`Q${nv.quy}`);
  if (nv.thang != null) parts.push(`T${nv.thang}`);
  if (parts.length > 0) return parts.join("·");
  if (nv.han_hoan_thanh) return nv.han_hoan_thanh.slice(5); // MM-DD
  return "—";
}

export function nhiemVuMissingAdminFields(nv: Pick<
  NhiemVuRow,
  "pham_vi_ap_dung" | "chi_tieu" | "chi_dao" | "bien_phap" | "nguoi_chu_tri_id"
>): string[] {
  const missing: string[] = [];
  if (!nv.pham_vi_ap_dung?.trim()) missing.push("phạm vi");
  if (!nv.chi_tieu?.trim()) missing.push("chỉ tiêu");
  if (!nv.chi_dao?.trim()) missing.push("chỉ đạo");
  if (!nv.bien_phap?.trim()) missing.push("biện pháp");
  if (!nv.nguoi_chu_tri_id) missing.push("người thực hiện");
  return missing;
}

function monthToQuy(thang: number): number {
  return Math.ceil(thang / 3);
}

/** Nhiệm vụ không gắn quý/tháng = cả năm — luôn khớp mọi kỳ. */
export function nhiemVuMatchesPeriod(
  nv: Pick<NhiemVuRow, "quy" | "thang" | "trang_thai">,
  filter: KeHoachNamPeriodFilter,
): boolean {
  if (nv.trang_thai === "HUY") return false;
  if (filter.kind === "NAM") return true;
  const noKy = nv.quy == null && nv.thang == null;
  if (noKy) return true;
  if (filter.kind === "THANG") {
    if (nv.thang != null) return nv.thang === filter.value;
    if (nv.quy != null) return nv.quy === monthToQuy(filter.value);
    return false;
  }
  // QUY
  if (nv.quy != null) return nv.quy === filter.value;
  if (nv.thang != null) return monthToQuy(nv.thang) === filter.value;
  return false;
}

/** % kế hoạch năm = TB % nhiệm vụ active ≠ HUY. */
export function pctNamFromNhiemVuList(
  rows: Array<Pick<NhiemVuRow, "pct" | "trang_thai" | "is_active">>,
): { pct: number; nhiemVuCount: number } {
  const active = rows.filter((r) => r.is_active !== false && r.trang_thai !== "HUY");
  if (active.length === 0) return { pct: 0, nhiemVuCount: 0 };
  const sum = active.reduce((a, r) => a + (Number(r.pct) || 0), 0);
  return { pct: Math.round(sum / active.length), nhiemVuCount: active.length };
}

/**
 * Parse thêm nhanh: `Đào tạo VST | Q2` hoặc `Giám sát | T3`.
 * Trả về tên đã cắt + quy/thang nếu có.
 */
export function parseQuickNhiemVuInput(raw: string): {
  ten: string;
  quy: number | null;
  thang: number | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { ten: "", quy: null, thang: null };

  const pipe = trimmed.match(/^(.*?)\s*\|\s*(.+)$/);
  if (!pipe) return { ten: trimmed, quy: null, thang: null };

  const ten = pipe[1].trim();
  const tag = pipe[2].trim().toUpperCase().replace(/\s+/g, "");
  const q = tag.match(/^Q([1-4])$/);
  if (q) return { ten, quy: Number(q[1]), thang: null };
  const t = tag.match(/^T(1[0-2]|[1-9])$/);
  if (t) {
    const thang = Number(t[1]);
    return { ten, quy: monthToQuy(thang), thang };
  }
  // tag không hợp lệ — giữ nguyên cả chuỗi làm tên
  return { ten: trimmed, quy: null, thang: null };
}

function defaultPeriodFilterNow(now = new Date()): KeHoachNamPeriodFilter {
  const month = now.getMonth() + 1;
  return { kind: "THANG", value: month };
}
