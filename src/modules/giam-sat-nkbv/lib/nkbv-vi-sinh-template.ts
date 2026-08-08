/** Mẫu import vi sinh — header nội bộ + adapter LIS (alias VN / Excel). */

import {
  normalizeMdroPhenotype,
  parseMdroFlag,
  type NkbvMdroPhenotype,
} from "./nkbv-mdro";

const NKBV_VI_SINH_KET_QUA = ["DUONG_TINH", "AM_TINH", "NHIEU"] as const;
export type NkbvViSinhKetQua = (typeof NKBV_VI_SINH_KET_QUA)[number];

/** Header bắt buộc đúng thứ tự khuyến nghị (paste vẫn nhận nếu đủ tên cột chuẩn). */
const NKBV_VI_SINH_TEMPLATE_HEADERS = [
  "ma_benh_an",
  "ma_xet_nghiem",
  "ma_benh_nhan",
  "ho_ten_benh_nhan",
  "ngay_vao_vien",
  "ngay_lay_mau",
  "loai_benh_pham",
  "ket_qua",
  "tac_nhan",
  "is_mdro",
  "mdro_phenotype",
  "so_luong",
  "khoa_yeu_cau",
  "ngay_sinh",
  "gioi_tinh",
  "ma_benh_pham",
] as const;

const NKBV_VI_SINH_REQUIRED_HEADERS = [
  "ma_benh_an",
  "ma_xet_nghiem",
  "ma_benh_nhan",
  "ho_ten_benh_nhan",
  "ngay_vao_vien",
  "ngay_lay_mau",
  "loai_benh_pham",
  "ket_qua",
] as const;

export type NkbvViSinhTemplateRow = {
  ma_benh_an: string;
  ma_xet_nghiem: string;
  ma_benh_nhan: string;
  ho_ten_benh_nhan: string;
  ngay_vao_vien: string;
  ngay_lay_mau: string;
  loai_benh_pham: string;
  ket_qua: NkbvViSinhKetQua;
  tac_nhan: string;
  is_mdro?: boolean;
  mdro_phenotype?: NkbvMdroPhenotype | null;
  so_luong?: string;
  khoa_yeu_cau?: string;
  ngay_sinh?: string;
  gioi_tinh?: string;
  ma_benh_pham?: string;
};

export { normalizeMdroPhenotype, parseMdroFlag };

export function normalizeKetQua(raw: string): NkbvViSinhKetQua | null {
  const t = raw.trim().toUpperCase().normalize("NFC");
  const compact = t.replace(/\s+/g, "_");
  if (compact === "DUONG_TINH" || compact === "DUONG" || compact === "POSITIVE" || compact === "+") {
    return "DUONG_TINH";
  }
  if (compact === "AM_TINH" || compact === "AM" || compact === "NEGATIVE" || compact === "-") {
    return "AM_TINH";
  }
  // Bệnh phẩm nhiễm / contamination → NHIEU
  if (
    compact === "NHIEU" ||
    compact === "CONTAMINATION" ||
    compact === "CONTAMINATED" ||
    compact.includes("NHIEU") ||
    compact.includes("CONTAM") ||
    t.includes("NHIỄU") ||
    t.includes("BỆNH PHẨM NHIỄM") ||
    t.includes("BENH PHAM NHIEM")
  ) {
    return "NHIEU";
  }
  // Dưới ngưỡng gây bệnh → không spawn ca (lưu kho như âm)
  if (
    t.includes("DƯỚI NGƯỠNG") ||
    t.includes("DUOI NGUONG") ||
    compact.includes("DUOI_NGUONG") ||
    t.includes("BELOW THRESHOLD")
  ) {
    return "AM_TINH";
  }
  if (t.includes("DƯƠNG") || t.includes("DUONG")) return "DUONG_TINH";
  if (t.includes("ÂM") || t.includes("AM TINH") || t === "AM_TINH") return "AM_TINH";
  return null;
}

export function isBloodSpecimen(loaiBenhPham: string): boolean {
  const lower = (loaiBenhPham || "").toLowerCase();
  return lower.includes("máu") || lower.includes("mau") || lower.includes("blood");
}

export function buildViSinhTemplateTsv(sampleRows?: string[][]): string {
  const header = NKBV_VI_SINH_TEMPLATE_HEADERS.join("\t");
  const defaults =
    sampleRows ??
    [
      [
        "BA-00123",
        "XN-2026-0001",
        "1032948",
        "Nguyễn Văn Hải",
        "2026-05-18",
        "2026-05-21",
        "Máu",
        "DUONG_TINH",
        "Escherichia coli",
        "true",
        "CRE",
        ">=10^5",
        "Hồi sức nội",
        "1975-04-12",
        "Nam",
        "M-01",
      ],
      [
        "BA-00123",
        "XN-2026-0002",
        "1032948",
        "Nguyễn Văn Hải",
        "2026-05-18",
        "2026-05-20",
        "Nước tiểu",
        "AM_TINH",
        "",
        "false",
        "",
        "",
        "Hồi sức nội",
        "1975-04-12",
        "Nam",
        "NT-01",
      ],
      [
        "BA-00124",
        "XN-2026-0003",
        "1034859",
        "Trần Thị Bình",
        "2026-05-19",
        "2026-05-22",
        "Máu",
        "NHIEU",
        "CoNS (nghi nhiễu)",
        "false",
        "",
        "",
        "Chấn thương chỉnh hình",
        "1988-11-23",
        "Nữ",
        "M-02",
      ],
    ];
  return [header, ...defaults.map((r) => r.join("\t"))].join("\n");
}
