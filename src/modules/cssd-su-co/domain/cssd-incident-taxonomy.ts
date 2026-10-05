import { STATION_LABEL, WORKFLOW_STEPS } from "@/modules/cssd-erp/workflow/domain/cssd-stations";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import {
  INSTRUMENT_MOVE_TYPE_ID,
  INSTRUMENT_PHYSICAL_DOOR_ID,
  SET_RECONCILE_TYPE_ID,
} from "@/lib/domain/cssd-set-reconcile";

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

/** Loại kích hoạt thu hồi cả mẻ (SC-02: chỉ sau lệnh Tổ trưởng / phiếu mẻ). */
export const BATCH_QC_FAIL_TYPE_IDS = [
  "PROCESS_STERILIZATION_FAIL",
  "PROCESS_STERILE_QC_FAIL",
  "PROCESS_BI_POSITIVE",
] as const;

/** SC-02: một gói lỗi sau TK — không thu hồi mẻ. */
export const SINGLE_PACK_POST_STERILE_TYPE_ID = "PROCESS_SINGLE_PACK_FAIL" as const;

/** SC-02 / N-SC-5: Bowie-Dick tách khỏi nội kiểm mẻ — giữ máy, không thu hồi. */
export const BOWIE_DICK_FAIL_TYPE_ID = "PROCESS_BOWIE_DICK_FAIL" as const;

export function isBatchQcFailTypeId(typeId?: string | null): boolean {
  const code = String(typeId || "").trim().toUpperCase();
  return (BATCH_QC_FAIL_TYPE_IDS as readonly string[]).includes(code);
}

export function isSinglePackPostSterileTypeId(typeId?: string | null): boolean {
  return String(typeId || "").trim().toUpperCase() === SINGLE_PACK_POST_STERILE_TYPE_ID;
}

export function isBowieDickFailTypeId(typeId?: string | null): boolean {
  return String(typeId || "").trim().toUpperCase() === BOWIE_DICK_FAIL_TYPE_ID;
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

/** Nhãn cửa trực tiếp (IA A 2026-09-27) — không còn shell An toàn / Biến động. */
export const INCIDENT_GROUP_LABEL: Record<IncidentGroup, string> = {
  PROCESS: "Sự cố quy trình",
  INSTRUMENT: "Hỏng/Mất",
  CHEMICAL: "Sự cố hóa chất",
  EQUIPMENT: "Sự cố máy",
  OTHER: "Sự cố khác",
};

/** Thứ tự 5 cửa picker type-first (Hỏng/Mất trước — tần suất kho). */
export const DIRECT_INCIDENT_DOORS: IncidentGroup[] = [
  "INSTRUMENT",
  "PROCESS",
  "CHEMICAL",
  "EQUIPMENT",
  "OTHER",
];

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
    { code: "PROCESS_QC_FAIL", label: "Không đạt Kiểm bộ tại khâu" },
    { code: "PROCESS_SINGLE_PACK_FAIL", label: "Một gói lỗi sau tiệt khuẩn (rách / ướt / CI trong gói)" },
    { code: "PROCESS_STERILIZATION_FAIL", label: "Chất lượng tiệt khuẩn / mẻ không đạt (hệ thống)" },
    { code: "PROCESS_STERILE_QC_FAIL", label: "Nội kiểm mẻ TK không đạt" },
    { code: "PROCESS_BOWIE_DICK_FAIL", label: "Bowie-Dick không đạt" },
    { code: "PROCESS_BI_POSITIVE", label: "Chỉ thị sinh học (BI) dương tính" },
  ],
  /** D4: legacy TRANSFER/REPLENISH/BROKEN/MISSING không đưa vào picker — giữ mã sổ qua coerce + submit bridge. */
  /** G-P0-06: sự cố dụng cụ chỉ Hỏng/Mất. Luân chuyển số lượng → /cssd-dung-cu tab LUAN_CHUYEN. Đề nghị danh mục → DE_NGHI. */
  INSTRUMENT: [
    { code: INSTRUMENT_PHYSICAL_DOOR_ID, label: "Hỏng/Mất" },
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

export const INCIDENT_STATION_OPTIONS: Array<{ value: Station; label: string }> = WORKFLOW_STEPS.map(
  (value) => ({ value, label: STATION_LABEL[value] }),
);

/** Sự cố dụng cụ: chỉ Hỏng/Mất. Luân chuyển không nằm picker này. */
export function instrumentFormTypeOptions(): IncidentPreset[] {
  return INCIDENT_TYPE_PRESETS.INSTRUMENT;
}


/** Deep-link / bookmark legacy type ids — coerce → 3 cửa; không xóa mã lịch sử sổ. */
export const LEGACY_INSTRUMENT_TYPE_IDS = [
  "INSTRUMENT_BROKEN",
  "INSTRUMENT_MISSING",
  "INSTRUMENT_REPLENISH",
  "INSTRUMENT_TRANSFER",
] as const;

/** SSOT D4: deep-link legacy → 3 cửa form (PHYSICAL / MOVE / SET_RECONCILE). */
export function coerceInstrumentFormTypeId(typeId?: string | null): string {
  const code = String(typeId || "").trim();
  if (code === INSTRUMENT_MOVE_TYPE_ID || code === "INSTRUMENT_TRANSFER" || code === "INSTRUMENT_REPLENISH") {
    return INSTRUMENT_MOVE_TYPE_ID;
  }
  if (
    code === INSTRUMENT_PHYSICAL_DOOR_ID ||
    code === "INSTRUMENT_BROKEN" ||
    code === "INSTRUMENT_MISSING" ||
    code === SET_RECONCILE_TYPE_ID
  ) {
    // A: SET_RECONCILE không còn cửa form — bookmark cũ mở Hỏng/Mất; catalog → cssdCatalogEditProposalHref.
    return INSTRUMENT_PHYSICAL_DOOR_ID;
  }
  return INSTRUMENT_PHYSICAL_DOOR_ID;
}

export function resolveInstrumentFormSubmitTypeId(typeId?: string | null): string {
  const code = String(typeId || "").trim();
  if (code === INSTRUMENT_PHYSICAL_DOOR_ID || code === "INSTRUMENT_BROKEN" || code === "INSTRUMENT_MISSING") {
    return SET_RECONCILE_TYPE_ID;
  }
  return code || SET_RECONCILE_TYPE_ID;
}

export function groupTypeDefaults(group: IncidentGroup): { typeId: string; typeTen: string } {
  if (group === "OTHER") {
    return { typeId: "OTHER_CUSTOM", typeTen: "Sự cố khác" };
  }
  const first = INCIDENT_TYPE_PRESETS[group][0];
  return { typeId: first?.code || "", typeTen: first?.label || "" };
}
