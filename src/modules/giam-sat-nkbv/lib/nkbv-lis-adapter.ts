/**
 * Adapter LIS BV103 — nhận header tiếng Việt (copy/Excel) → hàng nội bộ.
 * Khóa ma_xet_nghiem = Số phiếu (fallback Barcode).
 * ma_benh_an / ngay_vao_vien có thể trống → bắt bổ sung trên preview.
 */

import {
  NKBV_LIS_WIDE_ORGANISM_HEADERS,
  resolveLisOrganismCode,
} from "./nkbv-lis-organism-codes";
import {
  normalizeKetQua,
  normalizeMdroPhenotype,
  parseMdroFlag,
  type NkbvViSinhKetQua,
  type NkbvViSinhTemplateRow,
} from "./nkbv-vi-sinh-template";
import { inferMdroPhenotypeFromOrganism } from "./nkbv-mdro";

/** Header nội bộ snake_case vẫn nhận (mẫu app). */
const INTERNAL_REQUIRED = [
  "ma_benh_an",
  "ma_xet_nghiem",
  "ma_benh_nhan",
  "ho_ten_benh_nhan",
  "ngay_vao_vien",
  "ngay_lay_mau",
  "loai_benh_pham",
  "ket_qua",
] as const;

/** Alias LIS VN / biến thể → field nội bộ. */
const LIS_HEADER_ALIASES: Record<string, string> = {
  // LIS BV103
  "số phiếu": "so_phieu",
  "so phieu": "so_phieu",
  barcode: "barcode",
  "mã bệnh nhân": "ma_benh_nhan",
  "ma benh nhan": "ma_benh_nhan",
  "họ và tên": "ho_ten_benh_nhan",
  "ho va ten": "ho_ten_benh_nhan",
  "họ tên": "ho_ten_benh_nhan",
  "giới tính": "gioi_tinh",
  "gioi tinh": "gioi_tinh",
  "ngày sinh": "ngay_sinh",
  "ngay sinh": "ngay_sinh",
  "năm sinh": "nam_sinh",
  "nam sinh": "nam_sinh",
  "mã khoa chỉ định": "ma_khoa_chi_dinh",
  "ma khoa chi dinh": "ma_khoa_chi_dinh",
  "bác sĩ chỉ định": "bac_si_chi_dinh",
  "chẩn đoán": "chan_doan",
  "chẩn đoán ra viện": "chan_doan_ra_vien",
  "đối tượng": "doi_tuong",
  "mã dịch vụ": "ma_dich_vu",
  "tên dịch vụ": "ten_dich_vu",
  "kết quả": "ket_qua",
  "ket qua": "ket_qua",
  "phương pháp": "phuong_phap",
  "mã vi khuẩn": "ma_vi_khuan",
  "ma vi khuan": "ma_vi_khuan",
  "tên vi khuẩn": "ten_vi_khuan",
  "ten vi khuan": "ten_vi_khuan",
  "loại bệnh phẩm": "loai_benh_pham",
  "loai benh pham": "loai_benh_pham",
  "ngày y lệnh": "ngay_y_lenh",
  "ngay y lenh": "ngay_y_lenh",
  "ngày thực hiện": "ngay_thuc_hien",
  "ngay thuc hien": "ngay_thuc_hien",
  "ngày trả kết quả": "ngay_tra_ket_qua",
  "ngay tra ket qua": "ngay_tra_ket_qua",
  "số lượng vi khuẩn": "so_luong",
  "so luong vi khuan": "so_luong",
  // Cột bổ sung trên mẫu Excel app (khi LIS thiếu)
  "mã bệnh án": "ma_benh_an",
  "ma benh an": "ma_benh_an",
  "ngày vào viện": "ngay_vao_vien",
  "ngay vao vien": "ngay_vao_vien",
  "khoa yêu cầu": "khoa_yeu_cau",
  "khoa yeu cau": "khoa_yeu_cau",
  "đa kháng": "is_mdro",
  "da khang": "is_mdro",
  "đa kháng kháng sinh": "is_mdro",
  "is_mdro": "is_mdro",
  "mdro": "is_mdro",
  "phenotype": "mdro_phenotype",
  "phenotype mdro": "mdro_phenotype",
  "kiểu hình đa kháng": "mdro_phenotype",
  "mdro_phenotype": "mdro_phenotype",
  // Internal snake_case
  ma_benh_an: "ma_benh_an",
  ma_xet_nghiem: "ma_xet_nghiem",
  ma_benh_nhan: "ma_benh_nhan",
  ho_ten_benh_nhan: "ho_ten_benh_nhan",
  ngay_vao_vien: "ngay_vao_vien",
  ngay_lay_mau: "ngay_lay_mau",
  loai_benh_pham: "loai_benh_pham",
  ket_qua: "ket_qua",
  tac_nhan: "tac_nhan",
  so_luong: "so_luong",
  khoa_yeu_cau: "khoa_yeu_cau",
  ngay_sinh: "ngay_sinh",
  gioi_tinh: "gioi_tinh",
  ma_benh_pham: "ma_benh_pham",
  // is_mdro / mdro_phenotype đã map ở khối header phía trên
  tt: "_skip",
};

export type NkbvLisDraftRow = NkbvViSinhTemplateRow & {
  /** Thiếu BA hoặc ngày VV — cần bổ sung trước khi lưu. */
  needs_stay_fields: boolean;
  metadata?: Record<string, string>;
};

export type ParseLisResult =
  | { ok: true; rows: NkbvLisDraftRow[]; warnings: string[]; format: "lis" | "internal" }
  | { ok: false; error: string; missingHeaders?: string[] };

function normHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/["']/g, "")
    .replace(/\s+/g, " ");
}

function resolveHeader(raw: string): string | null {
  const n = normHeader(raw);
  if (!n || n === "tt") return null;
  if (LIS_HEADER_ALIASES[n]) return LIS_HEADER_ALIASES[n];
  // wide organism code column
  const compact = n.replace(/\s+/g, "");
  if (NKBV_LIS_WIDE_ORGANISM_HEADERS.has(compact)) return `org:${compact}`;
  return null;
}

/** Parse ngày LIS kiểu M/D/YY[YY] [H:mm] hoặc ISO / DD/MM/YYYY. */
export function parseLisDateToIso(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);

  // M/D/YY or M/D/YYYY with optional time
  const mdy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (mdy) {
    let y = parseInt(mdy[3], 10);
    if (y < 100) y += y >= 70 ? 1900 : 2000;
    const month = parseInt(mdy[1], 10);
    const day = parseInt(mdy[2], 10);
    // Heuristic: if month > 12 → treat as D/M/Y (VN)
    if (month > 12 && day <= 12) {
      const mm = String(day).padStart(2, "0");
      const dd = String(month).padStart(2, "0");
      return `${y}-${mm}-${dd}`;
    }
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // DD/MM/YYYY
  const dmy = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return null;
}

export function detectLisFormat(headersRaw: string[]): "lis" | "internal" | "unknown" {
  const resolved = headersRaw.map(resolveHeader).filter(Boolean) as string[];
  const set = new Set(resolved);
  if (set.has("so_phieu") || set.has("barcode") || set.has("ten_vi_khuan") || set.has("ngay_thuc_hien")) {
    return "lis";
  }
  if (INTERNAL_REQUIRED.every((h) => set.has(h))) return "internal";
  if (set.has("ma_xet_nghiem") && set.has("ma_benh_nhan")) return "internal";
  return "unknown";
}

function splitTable(paste: string): { headers: string[]; rows: string[][]; sep: string } | null {
  const lines = paste.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return null;
  const firstLine = lines[0];
  let sep = "\t";
  if (!firstLine.includes("\t")) {
    if (firstLine.includes(";")) sep = ";";
    else if (firstLine.includes(",")) sep = ",";
  }
  const headers = firstLine.split(sep).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, "")));
  return { headers, rows, sep };
}

function collectOrganisms(
  fieldMap: Record<string, string>,
  orgCells: Array<{ code: string; value: string }>,
): { tac_nhan: string; so_luong?: string } {
  const ten = fieldMap.ten_vi_khuan?.trim() || "";
  const ma = fieldMap.ma_vi_khuan?.trim() || "";
  const internal = fieldMap.tac_nhan?.trim() || "";
  const named = ten || internal || (ma ? resolveLisOrganismCode(ma) : "");

  const fromWide = orgCells
    .filter((o) => o.value && o.value.trim() !== "")
    .map((o) => ({
      name: resolveLisOrganismCode(o.code),
      qty: o.value.trim(),
    }));

  if (named) {
    const qty = fieldMap.so_luong?.trim() || fromWide[0]?.qty;
    return { tac_nhan: named, so_luong: qty || undefined };
  }
  if (fromWide.length > 0) {
    return {
      tac_nhan: fromWide.map((w) => w.name).join("; "),
      so_luong: fromWide.map((w) => w.qty).filter((q) => q && !Number.isNaN(Number(q))).join("; ") || undefined,
    };
  }
  return { tac_nhan: "", so_luong: fieldMap.so_luong?.trim() || undefined };
}

function yearToNgaySinh(namSinh: string): string | undefined {
  const y = namSinh.trim();
  if (/^\d{4}$/.test(y)) return `${y}-01-01`;
  return undefined;
}

/**
 * Parse paste TSV/CSV — nhận mẫu LIS BV103 hoặc mẫu nội bộ.
 * Hàng thiếu BA/ngày VV vẫn trả về (needs_stay_fields=true).
 */
export function parseLisOrInternalPaste(paste: string): ParseLisResult {
  const table = splitTable(paste);
  if (!table) {
    return { ok: false, error: "Cần dòng tiêu đề và ít nhất 1 dòng dữ liệu." };
  }

  const format = detectLisFormat(table.headers);
  if (format === "unknown") {
    return {
      ok: false,
      error:
        "Không nhận diện được mẫu LIS (Số phiếu / Barcode / …) hay mẫu nội bộ (ma_xet_nghiem…). Hãy tải mẫu Excel hoặc dán đúng header.",
    };
  }

  const colField: Array<string | null> = table.headers.map(resolveHeader);
  const fieldIdx: Record<string, number> = {};
  const orgIdxs: Array<{ idx: number; code: string }> = [];
  colField.forEach((f, idx) => {
    if (!f || f === "_skip") return;
    if (f.startsWith("org:")) {
      orgIdxs.push({ idx, code: f.slice(4) });
      return;
    }
    if (fieldIdx[f] === undefined) fieldIdx[f] = idx;
  });

  if (format === "internal") {
    const missing = INTERNAL_REQUIRED.filter((h) => fieldIdx[h] === undefined);
    // Với internal vẫn cho phép thiếu BA/VV nếu có đủ nhận dạng khác — nhưng mẫu cũ bắt đủ.
    // Giữ tương thích: nếu thiếu ma_xet_nghiem / ma_benh_nhan thì fail.
    if (fieldIdx.ma_xet_nghiem === undefined || fieldIdx.ma_benh_nhan === undefined) {
      return {
        ok: false,
        error: `Header nội bộ thiếu cột: ${["ma_xet_nghiem", "ma_benh_nhan"]
          .filter((h) => fieldIdx[h] === undefined)
          .join(", ")}.`,
        missingHeaders: missing as string[],
      };
    }
  } else {
    if (fieldIdx.so_phieu === undefined && fieldIdx.barcode === undefined) {
      return { ok: false, error: "Mẫu LIS thiếu Số phiếu và Barcode — không tạo được mã xét nghiệm." };
    }
    if (fieldIdx.ma_benh_nhan === undefined) {
      return { ok: false, error: "Mẫu LIS thiếu cột Mã bệnh nhân." };
    }
  }

  const rows: NkbvLisDraftRow[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < table.rows.length; i++) {
    const cells = table.rows[i];
    const get = (field: string) => {
      const idx = fieldIdx[field];
      return idx !== undefined && idx < cells.length ? cells[idx] : "";
    };

    const fieldMap: Record<string, string> = {};
    for (const [k, idx] of Object.entries(fieldIdx)) {
      fieldMap[k] = idx < cells.length ? cells[idx] : "";
    }

    const orgCells = orgIdxs.map(({ idx, code }) => ({
      code,
      value: idx < cells.length ? cells[idx] : "",
    }));

    const ma_xet_nghiem =
      (format === "lis"
        ? get("so_phieu") || get("barcode")
        : get("ma_xet_nghiem")
      ).trim();
    const ma_benh_nhan = get("ma_benh_nhan").trim();
    const ho_ten = (get("ho_ten_benh_nhan") || "").trim();

    if (!ma_xet_nghiem && !ma_benh_nhan) continue;

    const ketRaw = get("ket_qua");
    const ket_qua = normalizeKetQua(ketRaw);
    if (!ket_qua) {
      warnings.push(`Dòng ${i + 2}: kết quả "${ketRaw}" không nhận diện — bỏ qua.`);
      continue;
    }

    const { tac_nhan, so_luong } = collectOrganisms(fieldMap, orgCells);
    if (ket_qua === "DUONG_TINH" && !tac_nhan.trim()) {
      warnings.push(`Dòng ${i + 2}: dương tính nhưng thiếu tác nhân — bỏ qua.`);
      continue;
    }

    const ngayLayRaw =
      format === "lis"
        ? get("ngay_thuc_hien") || get("ngay_y_lenh") || get("ngay_lay_mau")
        : get("ngay_lay_mau");
    const ngay_lay_mau = parseLisDateToIso(ngayLayRaw) || ngayLayRaw.trim();
    if (!ngay_lay_mau) {
      warnings.push(`Dòng ${i + 2}: thiếu ngày lấy mẫu / ngày thực hiện — bỏ qua.`);
      continue;
    }

    const loai_benh_pham = (get("loai_benh_pham") || "").trim();
    if (!loai_benh_pham && format === "lis") {
      // Một số dòng LIS để trống loại BP — cảnh báo nhưng vẫn nhận với "Không rõ"
      warnings.push(`Dòng ${i + 2}: thiếu loại bệnh phẩm — gán "Không rõ".`);
    }

    const ma_benh_an = get("ma_benh_an").trim();
    const ngay_vao_raw = get("ngay_vao_vien").trim();
    const ngay_vao_vien = parseLisDateToIso(ngay_vao_raw) || ngay_vao_raw;

    let ngay_sinh = get("ngay_sinh").trim();
    if (!ngay_sinh && get("nam_sinh")) {
      ngay_sinh = yearToNgaySinh(get("nam_sinh")) || "";
    } else if (ngay_sinh) {
      ngay_sinh = parseLisDateToIso(ngay_sinh) || ngay_sinh;
    }

    const needs_stay_fields = !ma_benh_an || !ngay_vao_vien;
    if (!ho_ten) {
      warnings.push(`Dòng ${i + 2}: thiếu họ tên — bỏ qua.`);
      continue;
    }

    const metadata: Record<string, string> = {};
    for (const k of [
      "barcode",
      "so_phieu",
      "ma_khoa_chi_dinh",
      "bac_si_chi_dinh",
      "chan_doan",
      "chan_doan_ra_vien",
      "doi_tuong",
      "ma_dich_vu",
      "ten_dich_vu",
      "phuong_phap",
      "ngay_y_lenh",
      "ngay_tra_ket_qua",
    ] as const) {
      const v = get(k).trim();
      if (v) metadata[k] = v;
    }

    // Khóa XN: ưu tiên Số phiếu; nếu cùng phiếu nhiều dịch vụ (hiếu khí/kỵ khí) → suffix mã DV
    let xnKey = ma_xet_nghiem;
    if (format === "lis") {
      const maDv = get("ma_dich_vu").trim();
      if (maDv) xnKey = `${ma_xet_nghiem}|${maDv}`;
    }

    const organism = tac_nhan.trim() || (ket_qua === "AM_TINH" ? "—" : "");
    let is_mdro = parseMdroFlag(get("is_mdro"));
    let mdro_phenotype = normalizeMdroPhenotype(get("mdro_phenotype"));
    if (!is_mdro && !mdro_phenotype) {
      const inferred = inferMdroPhenotypeFromOrganism(organism);
      if (inferred) {
        is_mdro = true;
        mdro_phenotype = inferred;
      }
    }
    if (is_mdro && !mdro_phenotype) {
      warnings.push(`Dòng ${i + 2}: tick đa kháng nhưng thiếu phenotype — gán OTHER_MDRO.`);
      mdro_phenotype = "OTHER_MDRO";
    }
    if (!is_mdro) mdro_phenotype = null;

    rows.push({
      ma_benh_an: ma_benh_an || "",
      ma_xet_nghiem: xnKey,
      ma_benh_nhan,
      ho_ten_benh_nhan: ho_ten,
      ngay_vao_vien: ngay_vao_vien || "",
      ngay_lay_mau,
      loai_benh_pham: loai_benh_pham || "Không rõ",
      ket_qua,
      tac_nhan: organism,
      is_mdro,
      mdro_phenotype,
      so_luong,
      khoa_yeu_cau: get("khoa_yeu_cau") || get("ma_khoa_chi_dinh") || undefined,
      ngay_sinh: ngay_sinh || undefined,
      gioi_tinh: get("gioi_tinh") || undefined,
      ma_benh_pham: get("ma_benh_pham") || undefined,
      needs_stay_fields,
      metadata: Object.keys(metadata).length ? metadata : undefined,
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "Không có dòng hợp lệ sau khi phân tích LIS/mẫu." };
  }

  return { ok: true, rows, warnings, format };
}

/** Header Excel mẫu LIS + cột bổ sung BA/ngày VV. */
export const NKBV_LIS_EXCEL_HEADERS = [
  "Số phiếu",
  "Barcode",
  "Mã bệnh nhân",
  "Họ và tên",
  "Giới tính",
  "Năm sinh",
  "Mã bệnh án",
  "Ngày vào viện",
  "Mã khoa chỉ định",
  "Loại bệnh phẩm",
  "Kết quả",
  "Mã vi khuẩn",
  "Tên vi khuẩn",
  "Số lượng vi khuẩn",
  "Ngày thực hiện",
  "Ngày y lệnh",
  "Mã dịch vụ",
  "Tên dịch vụ",
  "Chẩn đoán",
] as const;

export function buildLisExcelSampleMatrix(): string[][] {
  return [
    [...NKBV_LIS_EXCEL_HEADERS],
    [
      "XN230307.1450",
      "905044",
      "22283616",
      "HỒNG THỊ KIM LAN",
      "Nữ",
      "1963",
      "BA-2023-001",
      "2023-03-05",
      "PĐT A11",
      "Máu",
      "Dương tính",
      "esccol",
      "Escherichia coli",
      "",
      "3/7/23 11:38",
      "3/7/23 10:53",
      "DV3467",
      "Vi khuẩn nuôi cấy (hiếu khí trong máu)",
      "Viêm khớp dạng thấp",
    ],
    [
      "XN230314.824",
      "B905370",
      "23045570",
      "VŨ THỊ HỢI",
      "Nữ",
      "1947",
      "",
      "",
      "PĐT A05",
      "Nước tiểu",
      "Âm tính",
      "",
      "",
      "",
      "3/15/23 10:29",
      "3/14/23 7:05",
      "DV3466",
      "Vi khuẩn nuôi cấy (bệnh phẩm khác)",
      "Sốt xuất huyết Dengue",
    ],
    [
      "XN230315.90",
      "B905418",
      "23040041",
      "NGUYỄN VĂN TÚ",
      "Nam",
      "1934",
      "BA-2023-002",
      "2023-03-12",
      "PĐT A03",
      "Nước tiểu",
      "Dưới ngưỡng gây bệnh",
      "tkga",
      "Trực khuẩn Gram (-)",
      "2000",
      "3/16/23 8:28",
      "3/15/23 7:00",
      "DV3466",
      "Vi khuẩn nuôi cấy (bệnh phẩm khác)",
      "TD K phế quản",
    ],
  ];
}

export type { NkbvViSinhKetQua };
