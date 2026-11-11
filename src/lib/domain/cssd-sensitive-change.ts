/** AR-5d: phát hiện thay đổi nhạy cảm của hóa chất / thiết bị (thuần, không I/O). */

export type HoaChatSensitiveView = {
  is_active?: boolean | null;
  nong_do?: string | null;
  nguong_ton_toi_thieu?: number | string | null;
  ty_le_canh_bao_pct?: number | string | null;
  so_ngay_cho_hang?: number | string | null;
};

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const txt = (v: unknown): string => String(v ?? "").trim();

/** `next` chỉ chứa trường được gửi; trường `undefined` = giữ nguyên, không tính là đổi. */
export function detectHoaChatSensitiveChange(
  prev: HoaChatSensitiveView | null,
  next: HoaChatSensitiveView,
): string[] {
  if (!prev) return ["thêm hóa chất mới"];
  const out: string[] = [];
  if (next.is_active !== undefined && (prev.is_active !== false) !== (next.is_active !== false)) {
    out.push(next.is_active === false ? "ngừng sử dụng hóa chất" : "dùng lại hóa chất");
  }
  if (next.nong_do !== undefined && txt(prev.nong_do) !== txt(next.nong_do)) out.push("nồng độ");
  const cmp = (k: "nguong_ton_toi_thieu" | "ty_le_canh_bao_pct" | "so_ngay_cho_hang", label: string) => {
    if (next[k] !== undefined && num(prev[k]) !== num(next[k])) out.push(label);
  };
  cmp("nguong_ton_toi_thieu", "định mức tồn tối thiểu");
  cmp("ty_le_canh_bao_pct", "tỷ lệ cảnh báo");
  cmp("so_ngay_cho_hang", "số ngày chờ hàng");
  return out;
}

export function detectThietBiSensitiveChange(
  prev: { is_active?: boolean | null } | null,
  next: { is_active?: boolean | null },
): string[] {
  if (!prev) return ["thêm thiết bị mới"];
  if (next.is_active !== undefined && (prev.is_active !== false) !== (next.is_active !== false)) {
    return [next.is_active === false ? "ngừng hoạt động thiết bị" : "dùng lại thiết bị"];
  }
  return [];
}

export function sensitiveChangeDeniedMessage(reasons: string[]): string {
  return `Thay đổi cần chủ nhiệm khoa duyệt (${reasons.join(", ")}). Nhờ người có quyền duyệt thực hiện.`;
}
