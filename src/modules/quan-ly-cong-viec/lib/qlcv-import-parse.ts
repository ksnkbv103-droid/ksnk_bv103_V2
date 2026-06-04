/** Parse & validate dòng import công việc — thuần, không I/O. */

const LOAI = new Set(["DINH_KY", "DOT_XUAT", "KHAN_CAP"]);
const UU_TIEN = new Set(["THAP", "TRUNG_BINH", "CAO"]);

export type QlcvImportRow = {
  tieu_de: string;
  mo_ta: string | null;
  loai_cong_viec: "DINH_KY" | "DOT_XUAT" | "KHAN_CAP";
  muc_do_uu_tien: "THAP" | "TRUNG_BINH" | "CAO";
  han_hoan_thanh: string | null;
  ma_nv: string;
  ma_khoa: string | null;
  ma_to: string | null;
};

export type QlcvImportParseResult =
  | { ok: true; row: QlcvImportRow; rowIdx: number }
  | { ok: false; rowIdx: number; errors: string[] };

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function normalizeDate(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  return null;
}

export function parseQlcvImportRow(row: Record<string, unknown>, rowIdx: number): QlcvImportParseResult {
  const errors: string[] = [];
  const tieu_de = cell(row, "tieu_de", "Tieu de", "Tiêu đề", "TIEU_DE");
  if (!tieu_de) errors.push("Thiếu tiêu đề");

  const ma_nv = cell(row, "ma_nv", "Ma NV", "Mã NV", "MA_NV");
  if (!ma_nv) errors.push("Thiếu mã nhân viên phụ trách (ma_nv)");

  const loaiRaw = cell(row, "loai_cong_viec", "Loai", "LOAI_CONG_VIEC").toUpperCase() || "DOT_XUAT";
  if (!LOAI.has(loaiRaw)) errors.push(`Loại công việc không hợp lệ: ${loaiRaw}`);

  const uuRaw = cell(row, "muc_do_uu_tien", "Uu tien", "MUC_DO_UU_TIEN").toUpperCase() || "TRUNG_BINH";
  if (!UU_TIEN.has(uuRaw)) errors.push(`Mức ưu tiên không hợp lệ: ${uuRaw}`);

  const hanRaw = cell(row, "han_hoan_thanh", "Han", "HAN_HOAN_THANH");
  const han_hoan_thanh = hanRaw ? normalizeDate(hanRaw) : null;
  if (hanRaw && !han_hoan_thanh) errors.push("Hạn hoàn thành phải dạng YYYY-MM-DD");

  if (errors.length) return { ok: false, rowIdx, errors };

  return {
    ok: true,
    rowIdx,
    row: {
      tieu_de,
      mo_ta: cell(row, "mo_ta", "Mo ta", "Mô tả", "MO_TA") || null,
      loai_cong_viec: loaiRaw as QlcvImportRow["loai_cong_viec"],
      muc_do_uu_tien: uuRaw as QlcvImportRow["muc_do_uu_tien"],
      han_hoan_thanh,
      ma_nv,
      ma_khoa: cell(row, "ma_khoa", "Ma khoa", "MA_KHOA") || null,
      ma_to: cell(row, "ma_to", "Ma to", "MA_TO") || null,
    },
  };
}

export function parseQlcvImportRows(rows: Record<string, unknown>[]): QlcvImportParseResult[] {
  return (rows || []).map((row, idx) => parseQlcvImportRow(row, idx + 2));
}
