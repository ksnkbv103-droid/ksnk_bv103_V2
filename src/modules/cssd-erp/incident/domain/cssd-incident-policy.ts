import type { Station } from "../../types/cssd.types";
import { WORKFLOW_STEPS, stepIndex } from "../../workflow/domain/cssd-stations";

/** Mã nội bộ (chi tiết sự cố / tích hợp sau này). */
export type IncidentKind =
  | "cleaning_failure"
  | "packaging_failure"
  | "biological_failure"
  | "missing_component"
  | "equipment_block"
  | "generic";

export type IncidentPolicyOutcome = {
  targetStation: Station;
  faultStation: Station;
  clearSterilizationBatchLink: boolean;
  /** Khóa an toàn tại chỗ — thiết bị/nguy cơ không cho chuyển tiếp. */
  freezeSafetyLock: boolean;
  kind: IncidentKind;
};

function normalize(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function detectKind(typeTen: string): IncidentKind {
  const t = normalize(typeTen);
  if (t.includes("sinh hoc") || t.includes("bi ") || t.includes("biological")) return "biological_failure";
  if (t.includes("dong goi") || t.includes("bao bi") || t.includes("packaging")) return "packaging_failure";
  if (
    t.includes("thieu") ||
    t.includes("mat ") ||
    t.startsWith("mat ") ||
    t.includes(" missing") ||
    t.includes("lost") ||
    t.includes("hong hac") ||
    t.includes("hu hong")
  )
    return "missing_component";
  /** Máy / thiết bị kiểm tra trước «rửa/làm sạch» — tránh “máy rửa…” bị gán nhầm cleaning. */
  if (t.includes("may ") || t.startsWith("may") || t.includes("thiet bi") || t.includes("equipment"))
    return "equipment_block";
  if (t.includes("lam sach") || (t.includes("khau rua") && !t.includes("may")) || t.includes("cleaning"))
    return "cleaning_failure";
  return "generic";
}

/**
 * Domino / rollback: không chỉ «bước trước» mà kéo về đúng khâu xử lý lại theo loại sự cố.
 */
export function resolveIncidentPolicy(args: { detectionStation: Station; incidentTypeTen: string }): IncidentPolicyOutcome {
  const kind = detectKind(args.incidentTypeTen);
  const det = args.detectionStation;
  const detIdx = stepIndex(det);

  const previousStep = (): Station => {
    return WORKFLOW_STEPS[Math.max(0, detIdx - 1)] ?? "TIEP_NHAN";
  };

  switch (kind) {
    case "biological_failure":
      return {
        targetStation: "DONG_GOI",
        faultStation: det,
        clearSterilizationBatchLink: true,
        freezeSafetyLock: true,
        kind,
      };
    case "packaging_failure":
      return {
        targetStation: "QC",
        faultStation: "DONG_GOI",
        clearSterilizationBatchLink: true,
        freezeSafetyLock: false,
        kind,
      };
    case "cleaning_failure":
      return {
        targetStation: "LAM_SACH",
        faultStation: "LAM_SACH",
        clearSterilizationBatchLink: false,
        freezeSafetyLock: false,
        kind,
      };
    case "missing_component":
      return {
        targetStation: det,
        faultStation: det,
        clearSterilizationBatchLink: false,
        freezeSafetyLock: true,
        kind,
      };
    case "equipment_block":
      return {
        targetStation: det,
        faultStation: det,
        clearSterilizationBatchLink: false,
        freezeSafetyLock: true,
        kind,
      };
    default:
      return {
        targetStation: previousStep(),
        faultStation: previousStep(),
        clearSterilizationBatchLink: det === "TIET_KHUAN" || det === "CAP_PHAT",
        freezeSafetyLock: false,
        kind: "generic",
      };
  }
}
