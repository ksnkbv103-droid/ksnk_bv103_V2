import type { BloomLevel, DaoTaoQuestionLoai, DapAnDung } from "@/lib/dao-tao/types";

export type ParsedMcqOption = {
  nhanGoc: string;
  noiDung: string;
  thuTuGoc: number;
  tfDung?: boolean | null;
};

export type ParsedMcqRow = {
  maCau: string | null;
  chuDeMa: string | null;
  chuDeTen: string | null;
  stt: number | null;
  loai: DaoTaoQuestionLoai;
  stem: string;
  bloomLevel: BloomLevel;
  giaiThich: string;
  isActive: boolean;
  options: ParsedMcqOption[];
  /** Đáp án theo nhãn gốc A/B/C/D — convert sang id sau khi insert options. */
  dapAnByNhan: DapAnByNhan;
};

export type DapAnByNhan =
  | { kind: "single"; nhan: string }
  | { kind: "multi"; nhans: string[] }
  | { kind: "true_false_cluster"; byNhan: Record<string, boolean> }
  | { kind: "order"; orderedNhans: string[] };

export type ExportBankRow = {
  maCau: string;
  chuDeMa: string;
  chuDeTen: string;
  stt: number | null;
  loai: DaoTaoQuestionLoai;
  stem: string;
  options: Array<{ nhanGoc: string; noiDung: string; thuTuGoc: number }>;
  dapAnByNhan: DapAnByNhan;
  bloomLevel: BloomLevel;
  giaiThich: string;
  isActive: boolean;
};

export const DAO_TAO_BANK_HEADERS = [
  "ma_cau",
  "chu_de_ma",
  "chu_de_ten",
  "stt",
  "loai",
  "stem",
  "A",
  "B",
  "C",
  "D",
  "dap_an",
  "bloom",
  "giai_thich",
  "is_active",
] as const;

const LOAI_EXPORT_LABEL: Record<DaoTaoQuestionLoai, string> = {
  single: "Chọn một đáp án đúng nhất",
  multi: "Chọn nhiều đáp án đúng",
  true_false_cluster: "Chùm câu hỏi Đúng/Sai",
  order: "Sắp xếp thứ tự",
};

const BLOOM_EXPORT_LABEL: Record<BloomLevel, string> = {
  1: "Mức 1 - Nhớ",
  2: "Mức 2 - Hiểu",
  3: "Mức 3 - Vận dụng",
  4: "Mức 4 - Phân tích",
  5: "Mức 5 - Đánh giá",
};

export const DAO_TAO_GUIDE_ROWS: string[][] = [
  ["loai", "format_dap_an", "vi_du"],
  ["single", "Một chữ A–D", "C"],
  ["multi", "Nhiều chữ, cách nhau bởi dấu phẩy", "A, B"],
  ["true_false_cluster", "Nhãn-Đúng/Sai (hoặc True/False)", "A-Đúng, B-Sai, C-Đúng, D-Sai"],
  ["order", "Thứ tự nối bằng -> hoặc →", "C -> B -> D -> A"],
  ["bloom", "Mức 1–5", "Mức 3 - Vận dụng"],
  ["ma_cau", "Khóa upsert — giữ nguyên khi sửa; để trống khi thêm mới (hệ thống tự tạo)", "SSI_TRUOC_MO-0001"],
];

const LOAI_ALIASES: Record<string, DaoTaoQuestionLoai> = {
  "chọn một đáp án đúng nhất": "single",
  "chon mot dap an dung nhat": "single",
  "chọn một đáp án": "single",
  "chon mot dap an": "single",
  single: "single",
  "chọn nhiều đáp án đúng": "multi",
  "chon nhieu dap an dung": "multi",
  "chọn nhiều đáp án": "multi",
  "chon nhieu dap an": "multi",
  multi: "multi",
  "chùm câu hỏi đúng/sai": "true_false_cluster",
  "chum cau hoi dung/sai": "true_false_cluster",
  "đúng/sai": "true_false_cluster",
  "dung/sai": "true_false_cluster",
  true_false_cluster: "true_false_cluster",
  "sắp xếp thứ tự": "order",
  "sap xep thu tu": "order",
  order: "order",
};

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function mapLoaiCauHoi(raw: string): DaoTaoQuestionLoai | null {
  const key = norm(raw);
  if (!key || key === "loai cau hoi" || key === "loai") return null;
  return LOAI_ALIASES[key] ?? LOAI_ALIASES[raw.trim().toLowerCase()] ?? null;
}

export function parseBloomLevel(raw: string): BloomLevel | null {
  const m =
    String(raw || "").match(/mức\s*(\d)/i) ||
    String(raw || "").match(/muc\s*(\d)/i) ||
    String(raw || "").match(/^(\d)$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (n < 1 || n > 5) return null;
  return n as BloomLevel;
}

function parseIsActive(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  const s = norm(String(raw ?? "true"));
  if (!s) return true;
  if (["0", "false", "off", "no", "n", "tat", "tắt", "inactive", "disabled"].includes(s)) {
    return false;
  }
  return true;
}

/** Đáp án phải khớp phương án có nội dung; multi/order/TF không được rỗng / thiếu. */
export function validateDapAnAgainstOptions(
  loai: DaoTaoQuestionLoai,
  dapAn: DapAnByNhan,
  filledNhans: string[],
): string | null {
  const filled = new Set(filledNhans);
  const missing = (nhans: string[]) => nhans.filter((n) => !filled.has(n));

  switch (dapAn.kind) {
    case "single": {
      if (!filled.has(dapAn.nhan)) {
        return `đáp án ${dapAn.nhan} không có nội dung phương án`;
      }
      return null;
    }
    case "multi": {
      if (dapAn.nhans.length < 2) return "multi cần ít nhất 2 đáp án đúng";
      const miss = missing(dapAn.nhans);
      if (miss.length) return `đáp án ${miss.join(", ")} không có nội dung phương án`;
      return null;
    }
    case "true_false_cluster": {
      const keys = Object.keys(dapAn.byNhan);
      if (keys.length === 0) return "chùm Đúng/Sai thiếu đáp án";
      const miss = missing(keys);
      if (miss.length) return `đáp án ${miss.join(", ")} không có nội dung phương án`;
      const unanswered = filledNhans.filter((n) => !(n in dapAn.byNhan));
      if (unanswered.length) {
        return `chùm Đúng/Sai thiếu nhãn ${unanswered.join(", ")}`;
      }
      return null;
    }
    case "order": {
      if (dapAn.orderedNhans.length < 2) return "sắp xếp cần ít nhất 2 bước";
      const miss = missing(dapAn.orderedNhans);
      if (miss.length) return `đáp án ${miss.join(", ")} không có nội dung phương án`;
      if (dapAn.orderedNhans.length !== filledNhans.length) {
        return `sắp xếp phải gồm đủ ${filledNhans.length} phương án (đang có ${dapAn.orderedNhans.length})`;
      }
      const dup = dapAn.orderedNhans.filter((n, i) => dapAn.orderedNhans.indexOf(n) !== i);
      if (dup.length) return "sắp xếp trùng nhãn phương án";
      return null;
    }
    default:
      return loai ? "đáp án không hợp lệ" : null;
  }
}

function isLegacyHeaderRow(loai: string, stem: string): boolean {
  const l = norm(loai);
  const s = norm(stem);
  return l === "loai cau hoi" || s === "noi dung cau hoi (moi cau)" || s.includes("moi cau");
}

function isBankHeaderRow(cells: string[]): boolean {
  const c0 = norm(cells[0] ?? "");
  const c4 = norm(cells[4] ?? "");
  return c0 === "ma_cau" || (c0 === "ma cau" && c4 === "loai");
}

function detectBankLayout(rows: unknown[][]): boolean {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const cells = (rows[i] ?? []).map((c) => String(c ?? "").trim());
    if (isBankHeaderRow(cells)) return true;
    if (norm(cells[0] ?? "") === "ma_cau") return true;
  }
  return false;
}

function parseSingleOrMultiAnswer(raw: string, multi: boolean): DapAnByNhan | null {
  const parts = String(raw || "")
    .split(/[,;]/)
    .map((p) => p.trim().toUpperCase())
    .filter((p) => /^[A-D]$/.test(p));
  if (parts.length === 0) return null;
  if (multi) return { kind: "multi", nhans: [...new Set(parts)] };
  return { kind: "single", nhan: parts[0] };
}

function parseTfClusterAnswer(raw: string): DapAnByNhan | null {
  const byNhan: Record<string, boolean> = {};
  const re = /([A-D])\s*[-–:]\s*(Đúng|Dung|Sai|True|False)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(raw || "")))) {
    const nhan = m[1].toUpperCase();
    const val = norm(m[2]);
    byNhan[nhan] = val === "dung" || val === "true" || val === "đung";
  }
  if (Object.keys(byNhan).length === 0) return null;
  return { kind: "true_false_cluster", byNhan };
}

function parseOrderAnswer(raw: string): DapAnByNhan | null {
  const parts = String(raw || "")
    .split(/->|→|>/)
    .map((p) => p.trim().toUpperCase())
    .filter((p) => /^[A-D]$/.test(p));
  if (parts.length < 2) return null;
  return { kind: "order", orderedNhans: parts };
}

export function parseDapAn(loai: DaoTaoQuestionLoai, raw: string): DapAnByNhan | null {
  if (loai === "single") return parseSingleOrMultiAnswer(raw, false);
  if (loai === "multi") return parseSingleOrMultiAnswer(raw, true);
  if (loai === "true_false_cluster") return parseTfClusterAnswer(raw);
  if (loai === "order") return parseOrderAnswer(raw);
  return null;
}

export function formatDapAnByNhan(dapAn: DapAnByNhan): string {
  switch (dapAn.kind) {
    case "single":
      return dapAn.nhan;
    case "multi":
      return dapAn.nhans.join(", ");
    case "true_false_cluster":
      return Object.entries(dapAn.byNhan)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([nhan, v]) => `${nhan}-${v ? "Đúng" : "Sai"}`)
        .join(", ");
    case "order":
      return dapAn.orderedNhans.join(" -> ");
  }
}

/** Sinh mã câu từ chủ đề + STT (hoặc random ngắn). */
export function generateMaCau(chuDeMa: string, stt: number | null, salt?: string): string {
  const topic = (chuDeMa || "SSI_TRUOC_MO").trim() || "SSI_TRUOC_MO";
  if (stt != null && Number.isFinite(stt)) {
    return `${topic}-${String(Math.trunc(stt)).padStart(4, "0")}`;
  }
  const tail = (salt || Math.random().toString(36).slice(2, 10)).toUpperCase();
  return `${topic}-N${tail}`;
}

function toStt(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const n = Number(raw);
  return Number.isFinite(n) && String(raw).trim() !== "" ? n : null;
}

function buildOptions(
  loai: DaoTaoQuestionLoai,
  texts: { nhan: string; text: string }[],
  dapAnByNhan: DapAnByNhan,
): ParsedMcqOption[] {
  return texts.map((o, idx) => {
    const tf =
      loai === "true_false_cluster" && dapAnByNhan.kind === "true_false_cluster"
        ? (dapAnByNhan.byNhan[o.nhan] ?? null)
        : null;
    return {
      nhanGoc: o.nhan,
      noiDung: o.text,
      thuTuGoc: idx,
      tfDung: tf,
    };
  });
}

function parseOneQuestion(args: {
  lineNo: number;
  maCau: string | null;
  chuDeMa: string | null;
  chuDeTen: string | null;
  stt: number | null;
  loaiRaw: string;
  stem: string;
  a: string;
  b: string;
  c: string;
  d: string;
  dapAnRaw: string;
  bloomRaw: string;
  giaiThich: string;
  isActive: boolean;
}): { ok: true; row: ParsedMcqRow } | { ok: false; error?: string } {
  const {
    lineNo,
    maCau,
    chuDeMa,
    chuDeTen,
    stt,
    loaiRaw,
    stem,
    a,
    b,
    c,
    d,
    dapAnRaw,
    bloomRaw,
    giaiThich,
    isActive,
  } = args;

  if (!loaiRaw && !stem) return { ok: false };

  const loai = mapLoaiCauHoi(loaiRaw);
  if (!loai) return { ok: false, error: `Dòng ${lineNo}: loại không nhận dạng (${loaiRaw})` };

  const bloomLevel = parseBloomLevel(bloomRaw);
  if (!bloomLevel) return { ok: false, error: `Dòng ${lineNo}: Bloom không hợp lệ (${bloomRaw})` };

  if (!stem) return { ok: false, error: `Dòng ${lineNo}: thiếu nội dung câu hỏi` };

  const dapAnByNhan = parseDapAn(loai, dapAnRaw);
  if (!dapAnByNhan) {
    return { ok: false, error: `Dòng ${lineNo}: đáp án không parse được (${dapAnRaw})` };
  }

  const optionTexts = [
    { nhan: "A", text: a },
    { nhan: "B", text: b },
    { nhan: "C", text: c },
    { nhan: "D", text: d },
  ].filter((o) => o.text.length > 0);

  if (optionTexts.length < 2) {
    return { ok: false, error: `Dòng ${lineNo}: cần ít nhất 2 phương án` };
  }

  const answerErr = validateDapAnAgainstOptions(
    loai,
    dapAnByNhan,
    optionTexts.map((o) => o.nhan),
  );
  if (answerErr) {
    return { ok: false, error: `Dòng ${lineNo}: ${answerErr}` };
  }

  return {
    ok: true,
    row: {
      maCau: maCau?.trim() || null,
      chuDeMa: chuDeMa?.trim() || null,
      chuDeTen: chuDeTen?.trim() || null,
      stt,
      loai,
      stem,
      bloomLevel,
      giaiThich,
      isActive,
      options: buildOptions(loai, optionTexts, dapAnByNhan),
      dapAnByNhan,
    },
  };
}

/** Parse ma trận hàng Excel (đã là giá trị ô) → danh sách câu hỏi. */
export function parseMcqRowsFromMatrix(rows: unknown[][]): {
  questions: ParsedMcqRow[];
  skipped: number;
  errors: string[];
  layout: "bank" | "legacy";
} {
  const questions: ParsedMcqRow[] = [];
  const errors: string[] = [];
  let skipped = 0;
  const bankLayout = detectBankLayout(rows);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const cells = row.map((c) => (c == null ? "" : c));

    if (bankLayout) {
      const str = cells.map((c) => String(c ?? "").trim());
      if (isBankHeaderRow(str)) {
        skipped += 1;
        continue;
      }
      const parsed = parseOneQuestion({
        lineNo: i + 1,
        maCau: str[0] || null,
        chuDeMa: str[1] || null,
        chuDeTen: str[2] || null,
        stt: toStt(cells[3]),
        loaiRaw: str[4],
        stem: str[5],
        a: str[6],
        b: str[7],
        c: str[8],
        d: str[9],
        dapAnRaw: str[10],
        bloomRaw: str[11],
        giaiThich: str[12],
        isActive: parseIsActive(cells[13]),
      });
      if (!parsed.ok) {
        if (parsed.error) errors.push(parsed.error);
        skipped += 1;
        continue;
      }
      questions.push(parsed.row);
      continue;
    }

    const loaiRaw = String(cells[1] ?? "").trim();
    const stem = String(cells[2] ?? "").trim();
    if (!loaiRaw && !stem) {
      skipped += 1;
      continue;
    }
    if (isLegacyHeaderRow(loaiRaw, stem)) {
      skipped += 1;
      continue;
    }

    const parsed = parseOneQuestion({
      lineNo: i + 1,
      maCau: null,
      chuDeMa: null,
      chuDeTen: null,
      stt: toStt(cells[0]),
      loaiRaw,
      stem,
      a: String(cells[3] ?? "").trim(),
      b: String(cells[4] ?? "").trim(),
      c: String(cells[5] ?? "").trim(),
      d: String(cells[6] ?? "").trim(),
      dapAnRaw: String(cells[7] ?? "").trim(),
      bloomRaw: String(cells[8] ?? "").trim(),
      giaiThich: String(cells[9] ?? "").trim(),
      isActive: true,
    });
    if (!parsed.ok) {
      if (parsed.error) errors.push(parsed.error);
      skipped += 1;
      continue;
    }
    questions.push(parsed.row);
  }

  return { questions, skipped, errors, layout: bankLayout ? "bank" : "legacy" };
}

/** Serialize ngân hàng → ma trận Excel khóa cột (kèm header). */
export function serializeMcqRowsToMatrix(rows: ExportBankRow[]): unknown[][] {
  const matrix: unknown[][] = [[...DAO_TAO_BANK_HEADERS]];
  for (const r of rows) {
    const byNhan = Object.fromEntries(r.options.map((o) => [o.nhanGoc, o.noiDung]));
    matrix.push([
      r.maCau,
      r.chuDeMa,
      r.chuDeTen,
      r.stt ?? "",
      LOAI_EXPORT_LABEL[r.loai],
      r.stem,
      byNhan.A ?? "",
      byNhan.B ?? "",
      byNhan.C ?? "",
      byNhan.D ?? "",
      formatDapAnByNhan(r.dapAnByNhan),
      BLOOM_EXPORT_LABEL[r.bloomLevel],
      r.giaiThich ?? "",
      r.isActive ? "true" : "false",
    ]);
  }
  return matrix;
}

/** Từ dap_an_dung + options → dapAnByNhan (cho export). */
export function dapAnDungToByNhan(
  dapAn: DapAnDung,
  options: Array<{ id: string; nhanGoc: string }>,
): DapAnByNhan | null {
  const idToNhan = Object.fromEntries(options.map((o) => [o.id, o.nhanGoc]));
  switch (dapAn.kind) {
    case "single": {
      const nhan = idToNhan[dapAn.optionId];
      return nhan ? { kind: "single", nhan } : null;
    }
    case "multi": {
      const nhans = dapAn.optionIds.map((id) => idToNhan[id]).filter(Boolean) as string[];
      return nhans.length ? { kind: "multi", nhans } : null;
    }
    case "true_false_cluster": {
      const byNhan: Record<string, boolean> = {};
      for (const [id, v] of Object.entries(dapAn.byOptionId)) {
        const nhan = idToNhan[id];
        if (nhan) byNhan[nhan] = v;
      }
      return Object.keys(byNhan).length ? { kind: "true_false_cluster", byNhan } : null;
    }
    case "order": {
      const orderedNhans = dapAn.orderedOptionIds
        .map((id) => idToNhan[id])
        .filter(Boolean) as string[];
      return orderedNhans.length >= 2 ? { kind: "order", orderedNhans } : null;
    }
  }
}

/** Sau khi có map nhãn→id ổn định, chuyển dap_an_dung. */
export function dapAnByNhanToDapAnDung(
  dapAn: DapAnByNhan,
  nhanToId: Record<string, string>,
): DapAnDung {
  switch (dapAn.kind) {
    case "single":
      return { kind: "single", optionId: nhanToId[dapAn.nhan] };
    case "multi":
      return {
        kind: "multi",
        optionIds: dapAn.nhans.map((n) => nhanToId[n]).filter(Boolean),
      };
    case "true_false_cluster": {
      const byOptionId: Record<string, boolean> = {};
      for (const [nhan, v] of Object.entries(dapAn.byNhan)) {
        const id = nhanToId[nhan];
        if (id) byOptionId[id] = v;
      }
      return { kind: "true_false_cluster", byOptionId };
    }
    case "order":
      return {
        kind: "order",
        orderedOptionIds: dapAn.orderedNhans.map((n) => nhanToId[n]).filter(Boolean),
      };
  }
}

/** Merge option ids cũ theo nhãn khi update. */
export function buildPhuongAnWithStableIds(
  options: ParsedMcqOption[],
  existing?: Array<{ id: string; nhan_goc: string }> | null,
  newId: () => string = () => cryptoRandom(),
): Array<{
  id: string;
  nhan_goc: string;
  noi_dung: string;
  thu_tu_goc: number;
  tf_dung: boolean | null;
}> {
  const byNhan = new Map((existing ?? []).map((o) => [o.nhan_goc, o.id]));
  return options.map((o) => ({
    id: byNhan.get(o.nhanGoc) ?? newId(),
    nhan_goc: o.nhanGoc,
    noi_dung: o.noiDung,
    thu_tu_goc: o.thuTuGoc,
    tf_dung: o.tfDung ?? null,
  }));
}

function cryptoRandom(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `opt-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
