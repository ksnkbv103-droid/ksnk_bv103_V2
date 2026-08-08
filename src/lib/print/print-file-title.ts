/**
 * Quy ước tên file phiếu in (Lưu PDF / hộp thoại in):
 * {LOAI}_{MA}
 */

export type PrintFileLoai =
  | "LSGS"
  | "ME"
  | "CP"
  | "SUCO"
  | "CV"
  | "KHCV"
  | "TTCV"
  | "BAOCAO"
  | "TEMLOC"
  | "TEMBO"
  | "TEMMAY"
  | "TEMCYC"
  /** Phiếu xác định ca NKBV (envelope SSOT §5.2). */
  | "NKBV_PXDC";

export type BuildPrintFileTitleInput = {
  loai: PrintFileLoai;
  ma?: string | null;
};

const MAX_TITLE_LEN = 80;

/** Làm sạch một đoạn tên file. */
export function sanitizePrintFileSegment(raw: string | null | undefined): string {
  const s = String(raw ?? "")
    .trim()
    .replace(/[/\\:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || "KHONG_MA";
}

/** 8 ký tự hex đầu của UUID / id (bỏ dấu `-`). */
export function shortIdMa(id: string | null | undefined): string {
  const clean = String(id ?? "").replace(/-/g, "").trim();
  const suffix = clean.slice(0, 8).toUpperCase();
  return suffix || "KHONG_MA";
}

/** `PREFIX-XXXXXXXX` từ UUID / id. */
export function shortPrefixedMa(prefix: string, id: string | null | undefined): string {
  return sanitizePrintFileSegment(`${prefix}-${shortIdMa(id)}`);
}

/** Mã cấp phát CSSD: ma_bo → cycle → mẻ → quy trình. */
export function pickCssdCapPhatMa(input: {
  maBo?: string | null;
  maCycleQr?: string | null;
  maLo?: string | null;
  quyTrinhId?: string | null;
}): string {
  const bo = String(input.maBo ?? "").trim();
  if (bo && bo !== "—") return bo;
  const cycle = String(input.maCycleQr ?? "").trim();
  if (cycle) return cycle;
  const lo = String(input.maLo ?? "").trim();
  if (lo) return lo;
  return shortPrefixedMa("QT", input.quyTrinhId);
}

/**
 * Mã biên bản sự cố: `SC-{YYYYMMDD}-{8hex}` (đọc được hơn 8 hex trần).
 */
export function pickSuCoPrintMa(input: {
  id?: string | null;
  createdAt?: string | null;
}): string {
  const suffix = shortIdMa(input.id);
  const raw = String(input.createdAt ?? "").trim();
  const isoDay = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const ymd = isoDay ? `${isoDay[1]}${isoDay[2]}${isoDay[3]}` : "";
  if (ymd.length >= 8) return sanitizePrintFileSegment(`SC-${ymd}-${suffix}`);
  return sanitizePrintFileSegment(`SC-${suffix}`);
}

/**
 * Kỳ báo cáo từ `BC-TH-{tu}-{den}` → `{tu}-{den}`.
 * Nếu không khớp, trả lại chuỗi gốc đã làm sạch.
 */
export function baoCaoPeriodMa(reportNo: string | null | undefined): string {
  const raw = String(reportNo ?? "").trim();
  const m = raw.match(/^BC-TH-(\d{8})-(\d{8})$/i);
  if (m) return `${m[1]}-${m[2]}`;
  return sanitizePrintFileSegment(raw.replace(/^BC-TH-/i, ""));
}

/**
 * Ghép tên file gợi ý khi in/PDF.
 * Ví dụ: LSGS_VST-20260802-A1B2C3D4 · ME_LOT-… · BAOCAO_20260701-20260731
 */
export function buildPrintFileTitle(input: BuildPrintFileTitleInput): string {
  const loai = sanitizePrintFileSegment(input.loai);
  const ma = sanitizePrintFileSegment(input.ma);
  const full = `${loai}_${ma}`;
  if (full.length <= MAX_TITLE_LEN) return full;
  const budget = MAX_TITLE_LEN - (loai.length + 1);
  return `${loai}_${ma.slice(0, Math.max(8, budget))}`;
}
