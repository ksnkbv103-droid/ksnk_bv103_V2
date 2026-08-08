/**
 * SSOT danh mục NHSN SSI 2025 — 3 namespace riêng (không gộp chung).
 * Mỗi dòng: code · name_en · name_vi (+ metadata thuật toán).
 */

export type NhsnCatalogLabel = {
  code: string;
  name_en: string;
  name_vi: string;
};

export type NhsnProcedureCategory = NhsnCatalogLabel & {
  /** Cửa sổ Deep / Organ-Space theo NHSN (ngày lịch từ ngày mổ). */
  deep_organ_surveillance_days: 30 | 90;
  /** Thường có đường mổ phụ (SIS/DIS) — VD CBGB lấy tĩnh mạch chân. */
  typically_has_secondary_incision?: boolean;
};

export type NhsnSsiEventDepth = "SUPERFICIAL" | "DEEP" | "ORGAN_SPACE";

export type NhsnSsiEventType = NhsnCatalogLabel & {
  depth: NhsnSsiEventDepth;
  incision: "PRIMARY" | "SECONDARY" | "NA";
};

export type NhsnOrganSpaceSite = NhsnCatalogLabel & {
  /** Nếu có: chỉ hợp lệ sau các mã phẫu thuật này. */
  allowed_procedure_codes?: readonly string[];
};

/** Nhãn dropdown: mã — tên Việt */
export function formatNhsnOptionLabel(item: NhsnCatalogLabel): string {
  return `${item.code} — ${item.name_vi}`;
}

export function formatNhsnFullLabel(item: NhsnCatalogLabel): string {
  return `${item.code} — ${item.name_vi} (${item.name_en})`;
}

// ─── A. Operative procedure categories ───────────────────────────────────────

export const NKBV_NHSN_PROCEDURES: readonly NhsnProcedureCategory[] = [
  // 30-day Deep/Organ
  { code: "AAA", name_en: "Abdominal aortic aneurysm repair", name_vi: "Phẫu thuật sửa phình động mạch chủ bụng", deep_organ_surveillance_days: 30 },
  { code: "AMP", name_en: "Limb amputation", name_vi: "Phẫu thuật cắt cụt chi", deep_organ_surveillance_days: 30 },
  { code: "APPY", name_en: "Appendix surgery", name_vi: "Phẫu thuật ruột thừa", deep_organ_surveillance_days: 30 },
  { code: "AVSD", name_en: "Shunt for dialysis", name_vi: "Phẫu thuật đặt shunt/thông nối động–tĩnh mạch chạy thận", deep_organ_surveillance_days: 30 },
  { code: "BILI", name_en: "Bile duct, liver or pancreatic surgery", name_vi: "Phẫu thuật đường mật, gan hoặc tụy", deep_organ_surveillance_days: 30 },
  { code: "CEA", name_en: "Carotid endarterectomy", name_vi: "Phẫu thuật bóc tách nội mạc động mạch cảnh", deep_organ_surveillance_days: 30 },
  { code: "CHOL", name_en: "Gallbladder surgery", name_vi: "Phẫu thuật cắt túi mật", deep_organ_surveillance_days: 30 },
  { code: "COLO", name_en: "Colon surgery", name_vi: "Phẫu thuật đại tràng", deep_organ_surveillance_days: 30 },
  { code: "CSEC", name_en: "Cesarean section", name_vi: "Phẫu thuật mổ lấy thai", deep_organ_surveillance_days: 30 },
  { code: "GAST", name_en: "Gastric surgery", name_vi: "Phẫu thuật dạ dày", deep_organ_surveillance_days: 30 },
  { code: "HTP", name_en: "Heart transplant", name_vi: "Phẫu thuật ghép tim", deep_organ_surveillance_days: 30 },
  { code: "HYST", name_en: "Abdominal hysterectomy", name_vi: "Phẫu thuật cắt tử cung ngả bụng", deep_organ_surveillance_days: 30 },
  { code: "KTP", name_en: "Kidney transplant", name_vi: "Phẫu thuật ghép thận", deep_organ_surveillance_days: 30 },
  { code: "LAM", name_en: "Laminectomy", name_vi: "Phẫu thuật cắt cung sau đốt sống", deep_organ_surveillance_days: 30 },
  { code: "LTP", name_en: "Liver transplant", name_vi: "Phẫu thuật ghép gan", deep_organ_surveillance_days: 30 },
  { code: "NECK", name_en: "Neck surgery", name_vi: "Phẫu thuật vùng cổ", deep_organ_surveillance_days: 30 },
  { code: "NEPH", name_en: "Kidney surgery", name_vi: "Phẫu thuật thận", deep_organ_surveillance_days: 30 },
  { code: "OVRY", name_en: "Ovarian surgery", name_vi: "Phẫu thuật buồng trứng", deep_organ_surveillance_days: 30 },
  { code: "PRST", name_en: "Prostate surgery", name_vi: "Phẫu thuật tuyến tiền liệt", deep_organ_surveillance_days: 30 },
  { code: "REC", name_en: "Rectal surgery", name_vi: "Phẫu thuật trực tràng", deep_organ_surveillance_days: 30 },
  { code: "SB", name_en: "Small bowel surgery", name_vi: "Phẫu thuật ruột non", deep_organ_surveillance_days: 30 },
  { code: "SPLE", name_en: "Spleen surgery", name_vi: "Phẫu thuật lách", deep_organ_surveillance_days: 30 },
  { code: "THOR", name_en: "Thoracic surgery", name_vi: "Phẫu thuật lồng ngực", deep_organ_surveillance_days: 30 },
  { code: "THYR", name_en: "Thyroid and/or parathyroid surgery", name_vi: "Phẫu thuật tuyến giáp và/hoặc tuyến cận giáp", deep_organ_surveillance_days: 30 },
  { code: "VHYS", name_en: "Vaginal hysterectomy", name_vi: "Phẫu thuật cắt tử cung ngả âm đạo", deep_organ_surveillance_days: 30 },
  { code: "XLAP", name_en: "Exploratory laparotomy", name_vi: "Phẫu thuật mở bụng thăm dò", deep_organ_surveillance_days: 30 },
  // 90-day Deep/Organ
  { code: "BRST", name_en: "Breast surgery", name_vi: "Phẫu thuật tuyến vú", deep_organ_surveillance_days: 90 },
  { code: "CARD", name_en: "Cardiac surgery", name_vi: "Phẫu thuật tim", deep_organ_surveillance_days: 90 },
  {
    code: "CBGB",
    name_en: "Coronary artery bypass graft with both chest and donor site incisions",
    name_vi: "Phẫu thuật bắc cầu chủ–vành (đường mổ ngực + lấy tĩnh mạch)",
    deep_organ_surveillance_days: 90,
    typically_has_secondary_incision: true,
  },
  { code: "CBGC", name_en: "Coronary artery bypass graft with chest incision only", name_vi: "Phẫu thuật bắc cầu chủ–vành (chỉ đường mổ ngực)", deep_organ_surveillance_days: 90 },
  { code: "CRAN", name_en: "Craniotomy", name_vi: "Phẫu thuật mở nắp sọ", deep_organ_surveillance_days: 90 },
  { code: "FUSN", name_en: "Spinal fusion", name_vi: "Phẫu thuật hàn khớp/cố định cột sống", deep_organ_surveillance_days: 90 },
  { code: "FX", name_en: "Open reduction of fracture", name_vi: "Phẫu thuật kết hợp xương gãy hở", deep_organ_surveillance_days: 90 },
  { code: "HER", name_en: "Herniorrhaphy", name_vi: "Phẫu thuật tạo hình/khâu thoát vị", deep_organ_surveillance_days: 90 },
  { code: "HPRO", name_en: "Hip prosthesis", name_vi: "Phẫu thuật thay khớp háng nhân tạo", deep_organ_surveillance_days: 90 },
  { code: "KPRO", name_en: "Knee prosthesis", name_vi: "Phẫu thuật thay khớp gối nhân tạo", deep_organ_surveillance_days: 90 },
  { code: "PACE", name_en: "Pacemaker surgery", name_vi: "Phẫu thuật đặt máy tạo nhịp tim", deep_organ_surveillance_days: 90 },
  { code: "PVBY", name_en: "Peripheral vascular bypass surgery", name_vi: "Phẫu thuật bắc cầu mạch máu ngoại vi", deep_organ_surveillance_days: 90 },
  { code: "VSHN", name_en: "Ventricular shunt", name_vi: "Phẫu thuật đặt dẫn lưu não thất", deep_organ_surveillance_days: 90 },
] as const;

export type NhsnProcedureCode = (typeof NKBV_NHSN_PROCEDURES)[number]["code"];

const PROCEDURE_BY_CODE = new Map(
  NKBV_NHSN_PROCEDURES.map((p) => [p.code.toUpperCase(), p]),
);

export function getNhsnProcedure(code: string | null | undefined): NhsnProcedureCategory | null {
  if (!code?.trim()) return null;
  return PROCEDURE_BY_CODE.get(code.trim().toUpperCase()) || null;
}

// ─── B. Specific event types ─────────────────────────────────────────────────

export const NKBV_NHSN_SSI_EVENT_TYPES: readonly NhsnSsiEventType[] = [
  {
    code: "SIP",
    name_en: "Superficial Incisional Primary",
    name_vi: "Nhiễm khuẩn vết mổ nông — đường mổ chính",
    depth: "SUPERFICIAL",
    incision: "PRIMARY",
  },
  {
    code: "SIS",
    name_en: "Superficial Incisional Secondary",
    name_vi: "Nhiễm khuẩn vết mổ nông — đường mổ phụ",
    depth: "SUPERFICIAL",
    incision: "SECONDARY",
  },
  {
    code: "DIP",
    name_en: "Deep Incisional Primary",
    name_vi: "Nhiễm khuẩn vết mổ sâu — đường mổ chính",
    depth: "DEEP",
    incision: "PRIMARY",
  },
  {
    code: "DIS",
    name_en: "Deep Incisional Secondary",
    name_vi: "Nhiễm khuẩn vết mổ sâu — đường mổ phụ",
    depth: "DEEP",
    incision: "SECONDARY",
  },
  {
    code: "ORGAN_SPACE",
    name_en: "Organ/Space SSI",
    name_vi: "Nhiễm khuẩn cơ quan/khoang phẫu thuật",
    depth: "ORGAN_SPACE",
    incision: "NA",
  },
] as const;

export type NhsnSsiEventTypeCode = (typeof NKBV_NHSN_SSI_EVENT_TYPES)[number]["code"];

const EVENT_BY_CODE = new Map(
  NKBV_NHSN_SSI_EVENT_TYPES.map((e) => [e.code.toUpperCase(), e]),
);

export function getNhsnSsiEventType(code: string | null | undefined): NhsnSsiEventType | null {
  if (!code?.trim()) return null;
  return EVENT_BY_CODE.get(code.trim().toUpperCase()) || null;
}

export function depthFromSsiEventType(
  code: string | null | undefined,
): NhsnSsiEventDepth | null {
  return getNhsnSsiEventType(code)?.depth ?? null;
}

/** Gợi ý mã sự kiện mặc định từ độ sâu (đường mổ chính). */
export function defaultSsiEventTypeForDepth(depth: NhsnSsiEventDepth | "NONE"): NhsnSsiEventTypeCode | "" {
  if (depth === "SUPERFICIAL") return "SIP";
  if (depth === "DEEP") return "DIP";
  if (depth === "ORGAN_SPACE") return "ORGAN_SPACE";
  return "";
}

// ─── C. Organ/Space specific sites (Ch. 17) ──────────────────────────────────

export const NKBV_NHSN_ORGAN_SPACE_SITES: readonly NhsnOrganSpaceSite[] = [
  { code: "BONE", name_en: "Osteomyelitis", name_vi: "Viêm xương tủy" },
  { code: "BRST", name_en: "Breast abscess or mastitis", name_vi: "Áp xe vú hoặc viêm vú" },
  { code: "CARD", name_en: "Myocarditis or pericarditis", name_vi: "Viêm cơ tim hoặc viêm màng ngoài tim" },
  { code: "DISC", name_en: "Disc space infection", name_vi: "Nhiễm trùng khoang đĩa đệm cột sống" },
  { code: "EAR", name_en: "Ear, mastoid infection", name_vi: "Nhiễm trùng tai, viêm xương chũm" },
  { code: "EMET", name_en: "Endometritis", name_vi: "Viêm nội mạc tử cung" },
  { code: "ENDO", name_en: "Endocarditis", name_vi: "Viêm nội tâm mạc nhiễm khuẩn" },
  { code: "GIT", name_en: "Gastrointestinal tract infection", name_vi: "Nhiễm trùng đường tiêu hóa" },
  { code: "IAB", name_en: "Intraabdominal infection, not specified elsewhere", name_vi: "Nhiễm trùng khoang ổ bụng (không phân loại nơi khác)" },
  { code: "IC", name_en: "Intracranial infection", name_vi: "Nhiễm trùng nội sọ" },
  { code: "JNT", name_en: "Joint or bursa infection", name_vi: "Nhiễm trùng khớp hoặc bao hoạt dịch (khớp tự nhiên)" },
  { code: "LUNG", name_en: "Other infection of the lower respiratory tract", name_vi: "Nhiễm trùng đường hô hấp dưới / khoang màng phổi" },
  { code: "MED", name_en: "Mediastinitis", name_vi: "Viêm trung thất" },
  { code: "MEN", name_en: "Meningitis or ventriculitis", name_vi: "Viêm màng não hoặc viêm não thất" },
  { code: "ORAL", name_en: "Oral cavity infection", name_vi: "Nhiễm trùng khoang miệng" },
  { code: "OREP", name_en: "Deep pelvic tissue infection or other reproductive tract infection", name_vi: "Nhiễm trùng mô chậu sâu hoặc cơ quan sinh dục khác" },
  {
    code: "PJI",
    name_en: "Periprosthetic Joint Infection",
    name_vi: "Nhiễm trùng khớp nhân tạo",
    allowed_procedure_codes: ["HPRO", "KPRO"],
  },
  { code: "SA", name_en: "Spinal abscess/infection", name_vi: "Áp xe cột sống / nhiễm trùng ngoài màng cứng tủy" },
  { code: "SINU", name_en: "Sinusitis", name_vi: "Viêm xoang" },
  { code: "UR", name_en: "Upper respiratory tract infection", name_vi: "Nhiễm trùng đường hô hấp trên" },
  { code: "USI", name_en: "Urinary System Infection", name_vi: "Nhiễm trùng hệ tiết niệu sâu" },
  { code: "VASC", name_en: "Arterial or venous infection", name_vi: "Nhiễm trùng động mạch hoặc tĩnh mạch" },
  {
    code: "VCUF",
    name_en: "Vaginal cuff infection",
    name_vi: "Nhiễm trùng mỏm cắt âm đạo",
    allowed_procedure_codes: ["HYST", "VHYS"],
  },
] as const;

export type NhsnOrganSpaceSiteCode = (typeof NKBV_NHSN_ORGAN_SPACE_SITES)[number]["code"];

const SITE_BY_CODE = new Map(
  NKBV_NHSN_ORGAN_SPACE_SITES.map((s) => [s.code.toUpperCase(), s]),
);

export function getNhsnOrganSpaceSite(code: string | null | undefined): NhsnOrganSpaceSite | null {
  if (!code?.trim()) return null;
  return SITE_BY_CODE.get(code.trim().toUpperCase()) || null;
}

export function isOrganSpaceSiteAllowedForProcedure(
  siteCode: string | null | undefined,
  procedureCode: string | null | undefined,
): boolean {
  const site = getNhsnOrganSpaceSite(siteCode);
  if (!site) return false;
  if (!site.allowed_procedure_codes?.length) return true;
  const proc = (procedureCode || "").trim().toUpperCase();
  if (!proc) return false;
  return site.allowed_procedure_codes.some((c) => c.toUpperCase() === proc);
}

/** Danh sách site hợp lệ theo mã PT (ẩn PJI/VCUF khi không khớp). */
export function organSpaceSitesForProcedure(
  procedureCode: string | null | undefined,
): NhsnOrganSpaceSite[] {
  return NKBV_NHSN_ORGAN_SPACE_SITES.filter((s) => {
    if (!s.allowed_procedure_codes?.length) return true;
    return isOrganSpaceSiteAllowedForProcedure(s.code, procedureCode);
  });
}

/** SIS / DIS — đường mổ phụ luôn SP 30 ngày (NHSN). */
export function isSecondaryIncisionalEvent(eventTypeCode?: string | null): boolean {
  const code = (eventTypeCode || "").trim().toUpperCase();
  return code === "SIS" || code === "DIS";
}

/**
 * Khung giám sát SSI (ngày lịch):
 * - Nông (SIP/SIS) hoặc SUPERFICIAL: luôn 30
 * - DIS (deep secondary): luôn 30
 * - DIP / Organ: theo mã PT NHSN; không có mã → fallback implant (dữ liệu cũ)
 */
export function resolveSsiSurveillanceDays(input: {
  depth: NhsnSsiEventDepth | "NONE";
  procedureCode?: string | null;
  hasImplantFallback?: boolean;
  eventTypeCode?: string | null;
}): number {
  const event = getNhsnSsiEventType(input.eventTypeCode);
  const depth = event?.depth || input.depth;
  if (depth === "SUPERFICIAL" || depth === "NONE") return 30;
  if (isSecondaryIncisionalEvent(input.eventTypeCode)) return 30;
  const proc = getNhsnProcedure(input.procedureCode);
  if (proc) return proc.deep_organ_surveillance_days;
  return input.hasImplantFallback ? 90 : 30;
}

export function surveillanceNoteForSsi(input: {
  depth: NhsnSsiEventDepth | "NONE";
  procedureCode?: string | null;
  hasImplantFallback?: boolean;
  eventTypeCode?: string | null;
}): string {
  const days = resolveSsiSurveillanceDays(input);
  if (isSecondaryIncisionalEvent(input.eventTypeCode)) {
    return `SP đường mổ phụ (${String(input.eventTypeCode).toUpperCase()}) = 30 ngày`;
  }
  const event = getNhsnSsiEventType(input.eventTypeCode);
  const depth = event?.depth || input.depth;
  if (depth === "SUPERFICIAL" || depth === "NONE") {
    return "SP nông = 30 ngày (mọi loại mổ)";
  }
  const proc = getNhsnProcedure(input.procedureCode);
  if (proc) {
    return `SP Deep/Organ = ${days} ngày theo mã PT ${proc.code}`;
  }
  return input.hasImplantFallback
    ? "SP Deep/Organ = 90 ngày (fallback implant — chưa chọn mã PT NHSN)"
    : "SP Deep/Organ = 30 ngày (chưa chọn mã PT NHSN)";
}

/** Cảnh báo mềm khi chọn SIS/DIS trên loại mổ thường không có đường mổ phụ. */
export function secondaryIncisionMismatchWarning(
  eventTypeCode: string | null | undefined,
  procedureCode: string | null | undefined,
): string | null {
  if (!isSecondaryIncisionalEvent(eventTypeCode)) return null;
  const proc = getNhsnProcedure(procedureCode);
  if (!proc) {
    return "SIS/DIS cần mã phẫu thuật NHSN — ưu tiên loại có đường mổ phụ (VD CBGB).";
  }
  if (proc.typically_has_secondary_incision) return null;
  return `Mã PT ${proc.code} thường không có đường mổ phụ — kiểm tra lại trước khi chốt SIS/DIS.`;
}

/** Nhãn phân loại NHSN chuẩn khi đã có event (+ site Organ). */
export function nhsClassificationFromEvent(
  eventTypeCode: string | null | undefined,
  organSpaceSite?: string | null,
): string | null {
  const event = getNhsnSsiEventType(eventTypeCode);
  if (!event) return null;
  if (event.code === "ORGAN_SPACE") {
    const site = (organSpaceSite || "").trim().toUpperCase();
    return site ? `ORGAN_SPACE:${site}` : "ORGAN_SPACE";
  }
  return event.code;
}

/** Thủ thuật cấm Wound Class Clean (SACH) — Domain SSI §1.1. */
export const NKBV_NHSN_FORBIDDEN_CLEAN_PROCEDURES = new Set([
  "APPY",
  "BILI",
  "CHOL",
  "COLO",
  "REC",
  "SB",
  "VHYS",
]);

export type MauSoSurgeryGateWarn = { code: string; message: string };

/** Soft-gate mẫu số phẫu thuật (không chặn lưu cứng — cảnh báo PO/KSNK). */
export function softWarnMauSoSurgery(input: {
  loai_phau_thuat_nhsn: string;
  phan_loai_vet_mo: string;
  asa_score?: number | null;
  thoi_gian_mo_phut?: number | null;
}): MauSoSurgeryGateWarn[] {
  const warns: MauSoSurgeryGateWarn[] = [];
  const code = (input.loai_phau_thuat_nhsn || "").trim().toUpperCase();
  if (
    NKBV_NHSN_FORBIDDEN_CLEAN_PROCEDURES.has(code) &&
    input.phan_loai_vet_mo === "SACH"
  ) {
    warns.push({
      code: "WOUND_CLEAN_FORBIDDEN",
      message: `Mã PT ${code} không được xếp vết mổ Sạch (Clean) theo NHSN — loại khỏi mẫu số SIR nếu giữ nguyên.`,
    });
  }
  if (input.asa_score != null && input.asa_score === 6) {
    warns.push({
      code: "ASA_6_EXCLUDE",
      message: "ASA 6 (chết não hiến tạng) loại trừ khỏi giám sát SSI.",
    });
  }
  const mins = Number(input.thoi_gian_mo_phut);
  if (Number.isFinite(mins) && mins > 0 && mins < 5) {
    warns.push({
      code: "DURATION_LT_5",
      message: "Thời gian mổ < 5 phút — loại trừ khỏi mẫu số NHSN.",
    });
  }
  if (code && !getNhsnProcedure(code)) {
    warns.push({
      code: "UNKNOWN_NHSN_PROC",
      message: `Mã phẫu thuật «${code}» không thuộc danh mục NHSN SSI 2025.`,
    });
  }
  return warns;
}
