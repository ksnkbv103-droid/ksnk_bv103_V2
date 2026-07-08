/** SSOT mã bộ CSSD — format `{ma_khoa}.SET.{stt}` (vd. B01.SET.01). */

const CSSD_BO_MA_SET_SEGMENT = "SET" as const;

/** Mã bộ chuẩn: KHOA.SET.NN (NN ≥ 2 chữ số). */
const CSSD_UNIFIED_BO_MA_RE = /^[A-Z0-9][A-Z0-9.-]*\.SET\.\d{2,}$/;

export function normalizeBoMa(raw: string | null | undefined): string {
  return String(raw || "").trim().toUpperCase();
}

export function isCssdUnifiedBoMa(raw: string | null | undefined): boolean {
  return CSSD_UNIFIED_BO_MA_RE.test(normalizeBoMa(raw));
}

export function isCssdSubBoMa(raw: string | null | undefined): boolean {
  const code = normalizeBoMa(raw);
  return code.endsWith("-SUB") && isCssdUnifiedBoMa(code.slice(0, -4));
}

/** Mã hex legacy — từ chối quét mới (chỉ dùng guard). */
export function isRejectedLegacyHexBoQr(raw: string | null | undefined): boolean {
  const code = normalizeBoMa(raw);
  return /^BV103-DC-[A-F0-9]+$/.test(code) || /^BV103-SUB-[A-F0-9]+$/.test(code);
}

/** Sinh mã bộ mới theo khoa + thứ tự. */
export function buildCssdBoMa(khoaMa: string, sequence: number): string {
  const khoa = normalizeBoMa(khoaMa).replace(/[^A-Z0-9.-]/g, "");
  if (!khoa) throw new Error("Thiếu mã khoa để sinh mã bộ.");
  const seq = Math.max(1, Math.floor(sequence));
  if (seq > 9999) throw new Error("Thứ tự mã bộ vượt giới hạn (9999).");
  const width = seq >= 100 ? String(seq).length : 2;
  return `${khoa}.${CSSD_BO_MA_SET_SEGMENT}.${String(seq).padStart(width, "0")}`;
}

/** Mã bộ SUB tách từ MAIN. */
export function buildCssdSubBoMa(mainMa: string): string {
  const main = normalizeBoMa(mainMa);
  if (!main) throw new Error("Thiếu mã bộ MAIN.");
  if (main.endsWith("-SUB")) return main;
  return `${main}-SUB`;
}

/** Prefix tra cứu STT tiếp theo theo khoa (vd. B01.SET.). */
export function cssdBoMaPrefixForKhoa(khoaMa: string): string {
  return `${normalizeBoMa(khoaMa).replace(/[^A-Z0-9.-]/g, "")}.${CSSD_BO_MA_SET_SEGMENT}.`;
}

/** Lấy STT lớn nhất từ danh sách ma_bo cùng prefix. */
export function maxBoMaSequence(existingMaBoList: string[], khoaMa: string): number {
  const prefix = cssdBoMaPrefixForKhoa(khoaMa);
  let max = 0;
  for (const raw of existingMaBoList) {
    const ma = normalizeBoMa(raw);
    if (!ma.startsWith(prefix)) continue;
    const tail = ma.slice(prefix.length);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return max;
}
