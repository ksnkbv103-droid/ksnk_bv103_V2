/** Parse & validate dòng import công việc nội bộ KSNK — thuần, không I/O. */

const UU_TIEN = new Set(["THAP", "TRUNG_BINH", "CAO"]);

export type QlcvImportRow = {
  tieu_de: string;
  mo_ta: string | null;
  /** Import luôn DOT_XUAT (QLCV-05) — DINH_KY chỉ từ mẫu. */
  loai_cong_viec: "DOT_XUAT";
  muc_do_uu_tien: "THAP" | "TRUNG_BINH" | "CAO";
  han_hoan_thanh: string | null;
  ma_nv: string;
  ma_to: string | null;
  ma_khoa: string | null;
};

export type QlcvImportParseResult =
  | { ok: true; row: QlcvImportRow; rowIdx: number }
  | { ok: false; rowIdx: number; errors: string[] };

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const candidates = [k, `${k}*`, k.replace(/\*$/, "")];
    for (const candidate of candidates) {
      const v = row[candidate];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
  }
  // Khớp không phân biệt hoa thường / bỏ dấu * cuối header Excel mẫu.
  const norm = (s: string) => s.trim().replace(/\*$/, "").toLowerCase();
  const wanted = new Set(keys.map(norm));
  for (const [header, v] of Object.entries(row)) {
    if (!wanted.has(norm(header))) continue;
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function isValidYmd(yyyy: number, mm: number, dd: number): boolean {
  if (yyyy < 1970 || yyyy > 2200 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  return d.getUTCFullYear() === yyyy && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd;
}

function normalizeDate(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const isoMatch = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const yyyy = Number(isoMatch[1]);
    const mm = Number(isoMatch[2]);
    const dd = Number(isoMatch[3]);
    if (!isValidYmd(yyyy, mm, dd)) return null;
    return `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    if (!isValidYmd(yyyy, mm, dd)) return null;
    return `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  if (/^\d{5}$/.test(t)) {
    const serial = Number(t);
    if (serial >= 25569 && serial <= 80000) {
      const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

export function parseQlcvImportRow(row: Record<string, unknown>, rowIdx: number): QlcvImportParseResult {
  const errors: string[] = [];
  const tieu_de = cell(row, "tieu_de", "Tieu de", "Tiêu đề", "TIEU_DE");
  if (!tieu_de) errors.push("Thiếu tiêu đề");

  const ma_nv = cell(
    row,
    "ma_nv",
    "Ma NV",
    "Mã NV",
    "MA_NV",
    "Mã nv phụ trách",
    "Ma nv phu trach",
    "Mã nhân viên phụ trách",
  );
  if (!ma_nv) errors.push("Thiếu mã nhân viên phụ trách KSNK (ma_nv)");

  const ma_khoa =
    cell(
      row,
      "ma_khoa",
      "Ma khoa",
      "Mã khoa",
      "MA_KHOA",
      "Địa điểm khoa",
      "Mã khoa địa điểm",
      "Ma khoa dia diem",
    ) || null;

  // QLCV-05: bỏ cột loại — luôn DOT_XUAT; ưu tiên CAO cho việc khẩn.
  const uuRaw =
    cell(
      row,
      "muc_do_uu_tien",
      "Uu tien",
      "MUC_DO_UU_TIEN",
      "Uu tiên",
      "Ưu tiên",
      "Ưu tiên (thap|trung_binh|cao)",
      "Uu tien (thap|trung_binh|cao)",
    ).toUpperCase() || "TRUNG_BINH";
  if (!UU_TIEN.has(uuRaw)) errors.push(`Mức ưu tiên không hợp lệ: ${uuRaw}`);

  const hanRaw = cell(
    row,
    "han_hoan_thanh",
    "Han",
    "HAN_HOAN_THANH",
    "Hạn",
    "Hạn hoàn thành",
    "Hạn (yyyy-mm-dd)",
    "Han (yyyy-mm-dd)",
  );
  const han_hoan_thanh = hanRaw ? normalizeDate(hanRaw) : null;
  if (hanRaw && !han_hoan_thanh) errors.push("Hạn hoàn thành phải dạng YYYY-MM-DD");
  if (!han_hoan_thanh) {
    errors.push("Hạn hoàn thành bắt buộc với việc đột xuất");
  }

  if (errors.length) return { ok: false, rowIdx, errors };

  return {
    ok: true,
    rowIdx,
    row: {
      tieu_de,
      mo_ta: cell(row, "mo_ta", "Mo ta", "Mô tả", "MO_TA") || null,
      loai_cong_viec: "DOT_XUAT",
      muc_do_uu_tien: uuRaw as QlcvImportRow["muc_do_uu_tien"],
      han_hoan_thanh,
      ma_nv,
      ma_to: cell(row, "ma_to", "Ma to", "Mã tổ", "MA_TO") || null,
      ma_khoa,
    },
  };
}

export function parseQlcvImportRows(rows: Record<string, unknown>[]): QlcvImportParseResult[] {
  return (rows || []).map((row, idx) => parseQlcvImportRow(row, idx + 2));
}
