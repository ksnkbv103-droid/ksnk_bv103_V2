/**
 * SSOT danh mục bệnh phẩm chuẩn hóa CDC/NHSN 2025 — dùng chung kho vi sinh + thuật toán BA.
 * Nhãn: tiếng Việt + viết tắt tiếng Anh trong ngoặc khi có.
 * (Không import major-type để tránh vòng phụ thuộc.)
 */

export type NkbvSpecimenMajorType = "BSI" | "UTI" | "PNEU" | "VAE" | "SSI" | "OTHER";

export const NKBV_SPECIMEN_GROUPS = [
  "MAU",
  "HO_HAP_LRT",
  "HO_HAP_KHAC",
  "TIET_NIEU",
  "CO_XUONG_KHOP",
  "TKTW_TIM_MACH",
  "TIEU_HOA",
  "DA_MO_MEM",
] as const;

export type NkbvSpecimenGroup = (typeof NKBV_SPECIMEN_GROUPS)[number];

export const NKBV_SPECIMEN_GROUP_LABELS: Record<NkbvSpecimenGroup, string> = {
  MAU: "I. Bệnh phẩm máu",
  HO_HAP_LRT: "II. Hô hấp — LRT ít ngoại nhiễm",
  HO_HAP_KHAC: "II. Hô hấp — ngoại nhiễm cao / URT",
  TIET_NIEU: "III. Bệnh phẩm đường tiết niệu",
  CO_XUONG_KHOP: "IV. Cơ — xương — khớp",
  TKTW_TIM_MACH: "V. Thần kinh trung ương & tim mạch",
  TIEU_HOA: "VI. Tiêu hóa, ổ bụng & sinh sản",
  DA_MO_MEM: "VII. Da và mô mềm",
};

/** Mã chuẩn — khóa ổn định cho DB + thuật toán. */
export const NKBV_SPECIMEN_CODES = [
  "BLOOD_CULTURE",
  "BLOOD_NCT",
  "ETA",
  "BAL",
  "NB_BAL",
  "PBAL",
  "PSB",
  "LUNG_TISSUE",
  "SPUTUM",
  "PLEURAL",
  "URT",
  "URINE",
  "URINE_ANTIGEN",
  "BONE",
  "JOINT_FLUID",
  "PERIPROSTHETIC",
  "CSF",
  "BRAIN_TISSUE",
  "BRAIN_ABSCESS",
  "PERICARDIAL",
  "CARDIOVASCULAR",
  "STOOL",
  "PERITONEAL",
  "REPRODUCTIVE",
  "SURGICAL_SITE_FLUID",
  "DECUBITUS",
  "SKIN_ST",
] as const;

export type NkbvSpecimenCode = (typeof NKBV_SPECIMEN_CODES)[number];

export type NkbvSpecimenCanonical = {
  code: NkbvSpecimenCode;
  group: NkbvSpecimenGroup;
  /** Nhãn dropdown: tiếng Việt (viết tắt tiếng Anh). */
  label: string;
  majorType: NkbvSpecimenMajorType;
};

export const NKBV_SPECIMEN_CANONICAL: readonly NkbvSpecimenCanonical[] = [
  {
    code: "BLOOD_CULTURE",
    group: "MAU",
    label: "Cấy máu (Blood Culture)",
    majorType: "BSI",
  },
  {
    code: "BLOOD_NCT",
    group: "MAU",
    label: "Xét nghiệm không nuôi cấy từ máu — NCT (PCR / T2MR / NGS)",
    majorType: "BSI",
  },
  {
    code: "ETA",
    group: "HO_HAP_LRT",
    label: "Dịch hút khí quản (ETA)",
    majorType: "PNEU",
  },
  {
    code: "BAL",
    group: "HO_HAP_LRT",
    label: "Dịch rửa phế quản phế nang (BAL)",
    majorType: "PNEU",
  },
  {
    code: "NB_BAL",
    group: "HO_HAP_LRT",
    label: "Dịch rửa phế quản phế nang không nội soi (NB-BAL)",
    majorType: "PNEU",
  },
  {
    code: "PBAL",
    group: "HO_HAP_LRT",
    label: "Dịch rửa phế quản phế nang có bảo vệ (PBAL)",
    majorType: "PNEU",
  },
  {
    code: "PSB",
    group: "HO_HAP_LRT",
    label: "Chải phế quản có bảo vệ (PSB)",
    majorType: "PNEU",
  },
  {
    code: "LUNG_TISSUE",
    group: "HO_HAP_LRT",
    label: "Mô phổi (Lung Tissue)",
    majorType: "PNEU",
  },
  {
    code: "SPUTUM",
    group: "HO_HAP_KHAC",
    label: "Đờm khạc hoặc đờm khí dung (Sputum)",
    majorType: "PNEU",
  },
  {
    code: "PLEURAL",
    group: "HO_HAP_KHAC",
    label: "Dịch màng phổi (Pleural Fluid)",
    majorType: "PNEU",
  },
  {
    code: "URT",
    group: "HO_HAP_KHAC",
    label: "Bệnh phẩm đường hô hấp trên (URT)",
    /** UR/EAR/SINU/ORAL — Chương 17, không phải PNEU/HAP/UTI. */
    majorType: "OTHER",
  },
  {
    code: "URINE",
    group: "TIET_NIEU",
    label: "Nước tiểu (Urine)",
    majorType: "UTI",
  },
  {
    code: "URINE_ANTIGEN",
    group: "TIET_NIEU",
    label: "Kháng nguyên nước tiểu (Urine Antigen)",
    majorType: "UTI",
  },
  {
    code: "BONE",
    group: "CO_XUONG_KHOP",
    label: "Xương / mô xương (Bone Tissue)",
    majorType: "OTHER",
  },
  {
    code: "JOINT_FLUID",
    group: "CO_XUONG_KHOP",
    label: "Dịch khớp / sinh thiết màng hoạt dịch (Joint Fluid)",
    majorType: "OTHER",
  },
  {
    code: "PERIPROSTHETIC",
    group: "CO_XUONG_KHOP",
    label: "Mẫu quanh khớp nhân tạo (Periprosthetic)",
    majorType: "OTHER",
  },
  {
    code: "CSF",
    group: "TKTW_TIM_MACH",
    label: "Dịch não tủy (CSF)",
    majorType: "OTHER",
  },
  {
    code: "BRAIN_TISSUE",
    group: "TKTW_TIM_MACH",
    label: "Mô não hoặc màng cứng (Brain / Dura)",
    majorType: "OTHER",
  },
  {
    code: "BRAIN_ABSCESS",
    group: "TKTW_TIM_MACH",
    label: "Dịch hút ổ áp xe não (Brain Abscess Aspirate)",
    majorType: "OTHER",
  },
  {
    code: "PERICARDIAL",
    group: "TKTW_TIM_MACH",
    label: "Dịch / mô màng ngoài tim (Pericardial)",
    majorType: "OTHER",
  },
  {
    code: "CARDIOVASCULAR",
    group: "TKTW_TIM_MACH",
    label: "Bệnh phẩm tim nội mạch (Cardiovascular)",
    majorType: "OTHER",
  },
  {
    code: "STOOL",
    group: "TIEU_HOA",
    label: "Phân (Stool)",
    majorType: "OTHER",
  },
  {
    code: "PERITONEAL",
    group: "TIEU_HOA",
    label: "Dịch phúc mạc / ổ bụng (Peritoneal / Intraabdominal Fluid)",
    majorType: "OTHER",
  },
  {
    code: "REPRODUCTIVE",
    group: "TIEU_HOA",
    label: "Bệnh phẩm cơ quan sinh sản (Reproductive Tract)",
    majorType: "OTHER",
  },
  {
    code: "SURGICAL_SITE_FLUID",
    group: "DA_MO_MEM",
    label: "Dịch rỉ vết mổ nông/sâu (Surgical Site Fluid)",
    majorType: "SSI",
  },
  {
    code: "DECUBITUS",
    group: "DA_MO_MEM",
    label: "Dịch / mô loét tỳ đè (Decubitus Ulcer)",
    majorType: "OTHER",
  },
  {
    code: "SKIN_ST",
    group: "DA_MO_MEM",
    label: "Dịch rỉ mủ / chất nạo tổn thương da (SKIN/ST)",
    majorType: "OTHER",
  },
] as const;

const BY_CODE = new Map(NKBV_SPECIMEN_CANONICAL.map((x) => [x.code, x]));

export function isNkbvSpecimenCode(raw: string | null | undefined): raw is NkbvSpecimenCode {
  return Boolean(raw && BY_CODE.has(raw as NkbvSpecimenCode));
}

export function getSpecimenCanonical(code: string | null | undefined): NkbvSpecimenCanonical | null {
  if (!code) return null;
  return BY_CODE.get(code as NkbvSpecimenCode) ?? null;
}

export function specimenLabel(code: string | null | undefined): string | null {
  return getSpecimenCanonical(code)?.label ?? null;
}

/** Nhóm option cho <select> — optgroup theo danh mục CDC. */
export function specimenSelectGroups(): Array<{
  group: NkbvSpecimenGroup;
  groupLabel: string;
  options: Array<{ code: NkbvSpecimenCode; label: string }>;
}> {
  return NKBV_SPECIMEN_GROUPS.map((group) => ({
    group,
    groupLabel: NKBV_SPECIMEN_GROUP_LABELS[group],
    options: NKBV_SPECIMEN_CANONICAL.filter((x) => x.group === group).map((x) => ({
      code: x.code,
      label: x.label,
    })),
  })).filter((g) => g.options.length > 0);
}

/**
 * Chuỗi dùng cho thuật toán (major / RIT / hội chứng):
 * ưu tiên mã chuẩn → nhãn chuẩn; không thì chuỗi LIS gốc.
 */
export function effectiveSpecimenForAlgorithm(input: {
  loai_benh_pham_chuan?: string | null;
  loai_benh_pham?: string | null;
}): string {
  const canon = getSpecimenCanonical(input.loai_benh_pham_chuan);
  if (canon) return canon.code;
  return String(input.loai_benh_pham || "").trim();
}

/** Nhãn hiển thị ưu tiên chuẩn; fallback LIS. */
export function effectiveSpecimenDisplay(input: {
  loai_benh_pham_chuan?: string | null;
  loai_benh_pham?: string | null;
}): string {
  const canon = getSpecimenCanonical(input.loai_benh_pham_chuan);
  if (canon) return canon.label;
  return String(input.loai_benh_pham || "").trim() || "—";
}

/** Hiển thị trên lưới BA: mã chuẩn → nhãn VI; không thì chuỗi gốc. */
export function displaySpecimenOnGrid(benhPham: string | null | undefined): string {
  return effectiveSpecimenDisplay({
    loai_benh_pham_chuan: isNkbvSpecimenCode(benhPham) ? benhPham : null,
    loai_benh_pham: benhPham,
  });
}

/**
 * Bệnh phẩm chỉ thuộc Chương 17 — cấm tự mở khung UTI / HAP / SSI.
 * UR (hô hấp trên), USI (mô/dịch thận), không phải nước tiểu.
 */
export function isNkbvCh17SpecimenOnly(input: {
  loai_benh_pham?: string | null;
  loai_benh_pham_chuan?: string | null;
  lis_goc?: string | null;
}): boolean {
  const chuan = String(input.loai_benh_pham_chuan || "").trim().toUpperCase();
  if (chuan === "URT") return true;
  const blob = [chuan, input.loai_benh_pham, input.lis_goc]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
  if (!blob.trim()) return false;
  if (/\bUSI\b|MÔ THẬN|MO THAN|DỊCH THẬN|DICH THAN|HỆ TIẾT NIỆU SÂU/.test(blob)) {
    return true;
  }
  if (/HÔ HẤP TRÊN|HO HAP TREN|\bURT\b/.test(blob)) return true;
  // «UR» đứng riêng (không phải URINE)
  if (/\bUR\b/.test(blob) && !/\bURINE\b/.test(blob)) return true;
  return false;
}
