import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { WORKFLOW_STEPS, stepIndex } from "@/modules/cssd-erp/workflow/domain/cssd-stations";
import { recallTargetStationForLotMember } from "./cssd-batch-recall";
import { isBatchQcFailTypeId, type IncidentGroup } from "./cssd-incident-taxonomy";

/** Mã nội bộ (chi tiết sự cố / tích hợp sau này). */
export type IncidentKind =
  | "process_failure"
  | "missing_component"
  | "chemical_issue"
  | "equipment_block"
  | "generic";

export type IncidentPolicyOutcome = {
  targetStation: Station;
  faultStation: Station;
  clearSterilizationBatchLink: boolean;
  /** Khóa an toàn tại chỗ — thiết bị/nguy cơ không cho chuyển tiếp. */
  freezeSafetyLock: boolean;
  /** SC-10: thu hồi mọi bộ cùng mẻ. */
  recallEntireBatch: boolean;
  /** SC-10: chuyển máy mẻ sang HOLD_QC nếu đang sẵn sàng. */
  holdMachineQc: boolean;
  kind: IncidentKind;
};

function normalize(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function detectKind(typeTen: string, incidentGroup: IncidentGroup): IncidentKind {
  if (incidentGroup === "OTHER") return "generic";
  if (incidentGroup === "PROCESS") return "process_failure";
  if (incidentGroup === "INSTRUMENT") return "missing_component";
  if (incidentGroup === "CHEMICAL") return "chemical_issue";
  if (incidentGroup === "EQUIPMENT") return "equipment_block";
  const t = normalize(typeTen);
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
  if (t.includes("may ") || t.startsWith("may") || t.includes("thiet bi") || t.includes("equipment"))
    return "equipment_block";
  if (t.includes("lam sach") || (t.includes("khau rua") && !t.includes("may")) || t.includes("cleaning"))
    return "process_failure";
  return "generic";
}

/**
 * Domino / rollback: không chỉ «bước trước» mà kéo về đúng khâu xử lý lại theo loại sự cố.
 */
export function resolveIncidentPolicy(args: {
  detectionStation: Station;
  incidentTypeTen: string;
  incidentGroup: IncidentGroup;
  faultStation?: Station;
  typeId?: string;
  /** Trạm hiện tại của bộ đang báo — SC-10: bộ đã cấp phát về Tiếp nhận. */
  currentStation?: string | null;
}): IncidentPolicyOutcome {
  const det = args.detectionStation;
  const detIdx = stepIndex(det);

  /** QC mẻ (QT.23) — không áp cho QC trạm (`PROCESS_QC_FAIL`). */
  if (args.incidentGroup === "PROCESS" && isBatchQcFailTypeId(args.typeId)) {
    const target = recallTargetStationForLotMember(args.currentStation || det);
    return {
      targetStation: target,
      faultStation: args.faultStation || "TIET_KHUAN",
      clearSterilizationBatchLink: true,
      freezeSafetyLock: target === "DONG_GOI",
      recallEntireBatch: true,
      holdMachineQc: true,
      kind: "process_failure",
    };
  }

  const previousStep = (): Station => {
    return WORKFLOW_STEPS[Math.max(0, detIdx - 1)] ?? "TIEP_NHAN";
  };

  const noLotRecall = { recallEntireBatch: false as const, holdMachineQc: false as const };

  /** Nhóm Khác: ưu tiên trạm rollback do người chọn; không chọn thì về bước trước trạm phát hiện. */
  if (args.incidentGroup === "OTHER") {
    const target = args.faultStation ?? previousStep();
    return {
      targetStation: target,
      faultStation: args.faultStation ?? det,
      clearSterilizationBatchLink: target === "TIET_KHUAN" || target === "CAP_PHAT",
      freezeSafetyLock: false,
      ...noLotRecall,
      kind: "generic",
    };
  }

  const kind = detectKind(args.incidentTypeTen, args.incidentGroup);

  switch (kind) {
    case "process_failure": {
      const fault = args.faultStation || det;
      return {
        targetStation: fault,
        faultStation: fault,
        clearSterilizationBatchLink: fault === "TIET_KHUAN" || fault === "CAP_PHAT",
        freezeSafetyLock: false,
        ...noLotRecall,
        kind,
      };
    }
    case "chemical_issue":
      return {
        targetStation: det,
        faultStation: det,
        clearSterilizationBatchLink: det === "TIET_KHUAN" || det === "CAP_PHAT",
        freezeSafetyLock: true,
        ...noLotRecall,
        kind,
      };
    case "missing_component":
      if (args.incidentGroup === "INSTRUMENT") {
        return {
          targetStation: det,
          faultStation: det,
          clearSterilizationBatchLink: false,
          freezeSafetyLock: false,
          ...noLotRecall,
          kind,
        };
      }
      return {
        targetStation: det,
        faultStation: det,
        clearSterilizationBatchLink: false,
        freezeSafetyLock: true,
        ...noLotRecall,
        kind,
      };
    case "equipment_block":
      return {
        targetStation: det,
        faultStation: det,
        clearSterilizationBatchLink: false,
        freezeSafetyLock: true,
        ...noLotRecall,
        kind,
      };
    default:
      return {
        targetStation: previousStep(),
        faultStation: previousStep(),
        clearSterilizationBatchLink: det === "TIET_KHUAN" || det === "CAP_PHAT",
        freezeSafetyLock: false,
        ...noLotRecall,
        kind: "generic",
      };
  }
}
