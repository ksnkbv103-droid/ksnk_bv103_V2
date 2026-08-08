/**
 * Mẫu import hồ sơ bệnh án (ADT/HIS) — copy bảng / Excel → nkbv_fact_benh_an.
 * Khóa chống trùng nghiệp vụ: ma_benh_an + ma_benh_nhan (DB UNIQUE vẫn theo ma_benh_an).
 */

export const NKBV_BENH_AN_TEMPLATE_HEADERS = [
  "ma_benh_an",
  "ma_benh_nhan",
  "ho_ten_benh_nhan",
  "ngay_vao_vien",
  "khoa_dieu_tri",
  "ngay_sinh",
  "gioi_tinh",
  "ngay_ra_vien",
] as const;

export const NKBV_BENH_AN_REQUIRED_HEADERS = [
  "ma_benh_an",
  "ma_benh_nhan",
  "ho_ten_benh_nhan",
  "ngay_vao_vien",
] as const;

export type NkbvBenhAnTemplateRow = {
  ma_benh_an: string;
  ma_benh_nhan: string;
  ho_ten_benh_nhan: string;
  ngay_vao_vien: string;
  khoa_dieu_tri?: string;
  ngay_sinh?: string;
  gioi_tinh?: string;
  ngay_ra_vien?: string;
};

/** Alias HIS VN / biến thể → field nội bộ. */
const HEADER_ALIASES: Record<string, keyof NkbvBenhAnTemplateRow | "skip"> = {
  "mã bệnh án": "ma_benh_an",
  "ma benh an": "ma_benh_an",
  "số bệnh án": "ma_benh_an",
  "so benh an": "ma_benh_an",
  "số hs": "ma_benh_an",
  "so hs": "ma_benh_an",
  ma_benh_an: "ma_benh_an",
  "mã bệnh nhân": "ma_benh_nhan",
  "ma benh nhan": "ma_benh_nhan",
  "mã bn": "ma_benh_nhan",
  "ma bn": "ma_benh_nhan",
  ma_benh_nhan: "ma_benh_nhan",
  "họ và tên": "ho_ten_benh_nhan",
  "ho va ten": "ho_ten_benh_nhan",
  "họ tên": "ho_ten_benh_nhan",
  "ho ten": "ho_ten_benh_nhan",
  "họ tên bệnh nhân": "ho_ten_benh_nhan",
  ho_ten_benh_nhan: "ho_ten_benh_nhan",
  "ngày vào viện": "ngay_vao_vien",
  "ngay vao vien": "ngay_vao_vien",
  "ngày nhập viện": "ngay_vao_vien",
  "ngay nhap vien": "ngay_vao_vien",
  ngay_vao_vien: "ngay_vao_vien",
  khoa: "khoa_dieu_tri",
  "khoa điều trị": "khoa_dieu_tri",
  "khoa dieu tri": "khoa_dieu_tri",
  "tên khoa": "khoa_dieu_tri",
  "ten khoa": "khoa_dieu_tri",
  "mã khoa": "khoa_dieu_tri",
  "ma khoa": "khoa_dieu_tri",
  khoa_dieu_tri: "khoa_dieu_tri",
  "ngày sinh": "ngay_sinh",
  "ngay sinh": "ngay_sinh",
  ngay_sinh: "ngay_sinh",
  "giới tính": "gioi_tinh",
  "gioi tinh": "gioi_tinh",
  gioi_tinh: "gioi_tinh",
  "ngày ra viện": "ngay_ra_vien",
  "ngay ra vien": "ngay_ra_vien",
  ngay_ra_vien: "ngay_ra_vien",
};

function normalizeHeader(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Chuẩn hóa ngày → YYYY-MM-DD (nhận DD/MM/YYYY, ISO). */
export function normalizeBenhAnDate(raw: string | null | undefined): string {
  const t = String(raw || "").trim();
  if (!t) return "";
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${mm}-${dd}`;
  }
  const parsed = Date.parse(t);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return t;
}

/** Khóa chống trùng nghiệp vụ (BA + BN). */
export function buildBenhAnUniqueKey(input: {
  ma_benh_an: string;
  ma_benh_nhan: string;
}): string {
  const ba = String(input.ma_benh_an || "")
    .trim()
    .toUpperCase();
  const bn = String(input.ma_benh_nhan || "")
    .trim()
    .toUpperCase();
  return `${ba}|${bn}`;
}

export function buildBenhAnTemplateTsv(sampleRows?: string[][]): string {
  const header = NKBV_BENH_AN_TEMPLATE_HEADERS.join("\t");
  const defaults =
    sampleRows ??
    [
      ["BA-00123", "BN-90001", "Nguyen Van A", "2026-07-01", "Khoa HSTC", "1980-05-12", "Nam", ""],
      ["BA-00124", "BN-90002", "Tran Thi B", "01/08/2026", "Khoa NGOAI", "1992-11-03", "Nữ", ""],
    ];
  return [header, ...defaults.map((r) => r.join("\t"))].join("\n");
}

export type ParseBenhAnResult =
  | { ok: true; rows: NkbvBenhAnTemplateRow[]; skippedEmpty: number; skippedBatchDup: number }
  | { ok: false; error: string };

function splitLines(text: string): string[] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
}

function detectDelimiter(headerLine: string): "\t" | "," | ";" {
  const tabs = (headerLine.match(/\t/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  if (tabs >= commas && tabs >= semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

function splitRow(line: string, delim: "\t" | "," | ";"): string[] {
  if (delim === "\t") return line.split("\t").map((c) => c.trim());
  // CSV/CSV-semicolon đơn giản (không quote lồng phức tạp)
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && ch === delim) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseBenhAnImportText(raw: string): ParseBenhAnResult {
  const lines = splitLines(raw);
  if (lines.length < 2) {
    return { ok: false, error: "Thiếu dòng tiêu đề hoặc dữ liệu." };
  }
  const delim = detectDelimiter(lines[0]);
  const headersRaw = splitRow(lines[0], delim);
  const fieldByCol: Array<keyof NkbvBenhAnTemplateRow | null> = headersRaw.map((h) => {
    const key = normalizeHeader(h);
    const mapped = HEADER_ALIASES[key] || HEADER_ALIASES[h.trim().toLowerCase()];
    if (!mapped || mapped === "skip") return null;
    return mapped;
  });

  const present = new Set(fieldByCol.filter(Boolean) as string[]);
  for (const req of NKBV_BENH_AN_REQUIRED_HEADERS) {
    if (!present.has(req)) {
      return {
        ok: false,
        error: `Thiếu cột bắt buộc «${req}» (hoặc alias tiếng Việt tương đương).`,
      };
    }
  }

  const rows: NkbvBenhAnTemplateRow[] = [];
  const seenKeys = new Set<string>();
  const seenBa = new Set<string>();
  let skippedEmpty = 0;
  let skippedBatchDup = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = splitRow(lines[i], delim);
    const draft: Partial<NkbvBenhAnTemplateRow> = {};
    fieldByCol.forEach((field, idx) => {
      if (!field) return;
      const val = cells[idx] ?? "";
      (draft as Record<string, string>)[field] = val;
    });

    const ma_benh_an = String(draft.ma_benh_an || "").trim();
    const ma_benh_nhan = String(draft.ma_benh_nhan || "").trim();
    const ho_ten_benh_nhan = String(draft.ho_ten_benh_nhan || "").trim();
    if (!ma_benh_an && !ma_benh_nhan && !ho_ten_benh_nhan) {
      skippedEmpty += 1;
      continue;
    }
    if (!ma_benh_an || !ma_benh_nhan || !ho_ten_benh_nhan) {
      return {
        ok: false,
        error: `Dòng ${i + 1}: thiếu mã bệnh án / mã bệnh nhân / họ tên.`,
      };
    }

    const ngay_vao_vien = normalizeBenhAnDate(draft.ngay_vao_vien);
    if (!ngay_vao_vien) {
      return { ok: false, error: `Dòng ${i + 1}: thiếu hoặc sai ngày vào viện.` };
    }

    const key = buildBenhAnUniqueKey({ ma_benh_an, ma_benh_nhan });
    const baKey = ma_benh_an.toUpperCase();
    if (seenKeys.has(key) || seenBa.has(baKey)) {
      skippedBatchDup += 1;
      continue;
    }
    seenKeys.add(key);
    seenBa.add(baKey);

    rows.push({
      ma_benh_an,
      ma_benh_nhan,
      ho_ten_benh_nhan,
      ngay_vao_vien,
      khoa_dieu_tri: draft.khoa_dieu_tri?.trim() || undefined,
      ngay_sinh: normalizeBenhAnDate(draft.ngay_sinh) || undefined,
      gioi_tinh: draft.gioi_tinh?.trim() || undefined,
      ngay_ra_vien: normalizeBenhAnDate(draft.ngay_ra_vien) || undefined,
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "Không có dòng hợp lệ để nạp." };
  }

  return { ok: true, rows, skippedEmpty, skippedBatchDup };
}
