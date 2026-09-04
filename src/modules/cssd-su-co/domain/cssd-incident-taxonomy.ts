import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { INSTRUMENT_MOVE_TYPE_ID, SET_RECONCILE_TYPE_ID } from "@/lib/domain/cssd-set-reconcile";

export const INCIDENT_GROUPS = ["PROCESS", "INSTRUMENT", "CHEMICAL", "EQUIPMENT", "OTHER"] as const;
export type IncidentGroup = (typeof INCIDENT_GROUPS)[number];

/** Bản chất nguyên nhân — lookup `LOAI_SU_CO` (`sys_lookup_value`). Khác nhóm nghiệp vụ. */
export const CAUSE_CLASSES = ["SC_QUY_TRINH", "SC_CHU_QUAN", "SC_HE_THONG"] as const;
export type CauseClass = (typeof CAUSE_CLASSES)[number];

export const CAUSE_CLASS_LABEL: Record<CauseClass, string> = {
  SC_QUY_TRINH: "Lỗi quy trình kỹ thuật",
  SC_CHU_QUAN: "Lỗi chủ quan cá nhân",
  SC_HE_THONG: "Lỗi hệ thống / dữ liệu",
};

export const BATCH_QC_FAIL_TYPE_IDS = [
  "PROCESS_STERILIZATION_FAIL",
  "PROCESS_STERILE_QC_FAIL",
  "PROCESS_BI_POSITIVE",
] as const;

export function isBatchQcFailTypeId(typeId?: string | null): boolean {
  const code = String(typeId || "").trim().toUpperCase();
  return (BATCH_QC_FAIL_TYPE_IDS as readonly string[]).includes(code);
}

/** Sự cố gắn mẻ: đủ mã lô thì không bắt buộc QR bộ. */
export function isBatchLinkedTypeId(typeId?: string | null): boolean {
  return isBatchQcFailTypeId(typeId);
}

export function defaultCauseClass(group: IncidentGroup): CauseClass {
  if (group === "EQUIPMENT" || group === "CHEMICAL") return "SC_HE_THONG";
  return "SC_QUY_TRINH";
}

export function isAccountabilityCause(code?: string | null): boolean {
  return code === "SC_QUY_TRINH" || code === "SC_CHU_QUAN";
}

export const INCIDENT_GROUP_LABEL: Record<IncidentGroup, string> = {
  PROCESS: "Quy trình (khâu trước không đạt)",
  INSTRUMENT: "Dụng cụ (hỏng / thiếu…)",
  CHEMICAL: "Hóa chất (không đạt)",
  EQUIPMENT: "Máy móc (hỏng / thông số)",
  OTHER: "Khác (tùy biến)",
};

const PROCESS_HINTS = [
  "quy trình",
  "process",
  "dong goi",
  "bao bi",
  "sinh hoc",
  "lam sach",
  "qc",
  "tiet khuan",
  "cap phat",
];
const INSTRUMENT_HINTS = ["dung cu", "instrument", "bo dung cu", "mat", "thieu", "hong", "bo sung", "dieu chuyen"];
const CHEMICAL_HINTS = ["hoa chat", "chemical", "vet tu", "dung dich", "nong do", "han su dung"];
const EQUIPMENT_HINTS = ["may", "thiet bi", "machine", "equipment", "autoclave", "rua"];

function matchesOther(text: string): boolean {
  if (text === "khac" || text === "other") return true;
  if (text.startsWith("khác:") || text.startsWith("khac:")) return true;
  if (text.startsWith("tùy biến:") || text.startsWith("tuy bien:")) return true;
  return false;
}

function normalize(input: string): string {
  return String(input || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function classifyIncidentGroupByTypeName(typeName: string): IncidentGroup {
  const text = normalize(typeName);
  if (matchesOther(text)) return "OTHER";
  if (CHEMICAL_HINTS.some((x) => text.includes(x))) return "CHEMICAL";
  if (EQUIPMENT_HINTS.some((x) => text.includes(x))) return "EQUIPMENT";
  if (INSTRUMENT_HINTS.some((x) => text.includes(x))) return "INSTRUMENT";
  if (PROCESS_HINTS.some((x) => text.includes(x))) return "PROCESS";
  return "PROCESS";
}

export type IncidentPreset = { code: string; label: string };

export const INCIDENT_TYPE_PRESETS: Record<IncidentGroup, IncidentPreset[]> = {
  PROCESS: [
    { code: "PROCESS_MISSTEP", label: "Sai thao tác quy trình tại khâu" },
    { code: "PROCESS_QC_FAIL", label: "Không đạt kiểm tra chất lượng tại khâu" },
    { code: "PROCESS_STERILIZATION_FAIL", label: "Chất lượng tiệt khuẩn / mẻ không đạt" },
    { code: "PROCESS_STERILE_QC_FAIL", label: "Nội kiểm mẻ TK hoặc Bowie-Dick không đạt" },
    { code: "PROCESS_BI_POSITIVE", label: "Chỉ thị sinh học (BI) dương tính" },
  ],
  INSTRUMENT: [
    { code: SET_RECONCILE_TYPE_ID, label: "Đổi danh mục / hỏng / mất" },
    { code: INSTRUMENT_MOVE_TYPE_ID, label: "Chuyển" },
    { code: "INSTRUMENT_TRANSFER", label: "Điều chuyển bộ ↔ bộ" },
    { code: "INSTRUMENT_REPLENISH", label: "Kho ↔ bộ" },
    { code: "INSTRUMENT_BROKEN", label: "Dụng cụ hỏng" },
    { code: "INSTRUMENT_MISSING", label: "Dụng cụ mất / thất lạc" },
  ],
  CHEMICAL: [
    { code: "CHEMICAL_STOCK_OUT", label: "Thiếu hóa chất / vật tư" },
    { code: "CHEMICAL_EXPIRED", label: "Hóa chất quá hạn / nghi ngờ chất lượng" },
    { code: "CHEMICAL_CONCENTRATION", label: "Sai nồng độ / sai pha" },
  ],
  EQUIPMENT: [
    { code: "EQUIPMENT_BREAKDOWN", label: "Máy hỏng / dừng hoạt động" },
    { code: "EQUIPMENT_PARAMETER", label: "Thông số máy bất thường" },
    { code: "EQUIPMENT_MAINTENANCE", label: "Máy chờ bảo trì / hiệu chuẩn" },
  ],
  OTHER: [{ code: "OTHER_CUSTOM", label: "Khác — mô tả chi tiết ở phần dưới" }],
};

export const INCIDENT_STATION_OPTIONS: Array<{ value: Station; label: string }> = [
  { value: "TIEP_NHAN", label: "Tiếp nhận" },
  { value: "LAM_SACH", label: "Làm sạch" },
  { value: "QC", label: "Kiểm tra chất lượng (QC)" },
  { value: "DONG_GOI", label: "Đóng gói" },
  { value: "TIET_KHUAN", label: "Tiệt khuẩn" },
  { value: "CAP_PHAT", label: "Cấp phát" },
];

/** Hai cửa dụng cụ trên form — đổi danh mục/hỏng/mất riêng; chuyển (bộ/kho) một cửa. */
export function instrumentFormTypeOptions(): IncidentPreset[] {
  return INCIDENT_TYPE_PRESETS.INSTRUMENT.filter(
    (x) => x.code === SET_RECONCILE_TYPE_ID || x.code === INSTRUMENT_MOVE_TYPE_ID,
  );
}

export function coerceInstrumentFormTypeId(typeId?: string | null): string {
  const code = String(typeId || "").trim();
  if (
    code === INSTRUMENT_MOVE_TYPE_ID ||
    code === "INSTRUMENT_TRANSFER" ||
    code === "INSTRUMENT_REPLENISH"
  ) {
    return INSTRUMENT_MOVE_TYPE_ID;
  }
  return SET_RECONCILE_TYPE_ID;
}

export function groupTypeDefaults(group: IncidentGroup): { typeId: string; typeTen: string } {
  if (group === "OTHER") {
    return { typeId: "OTHER_CUSTOM", typeTen: "Sự cố khác" };
  }
  const first = INCIDENT_TYPE_PRESETS[group][0];
  return { typeId: first?.code || "", typeTen: first?.label || "" };
}
