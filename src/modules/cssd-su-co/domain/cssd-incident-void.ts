/**
 * Vô hiệu phiếu sự cố đã ghi: trả trạm (nếu phiếu này vừa đẩy lui),
 * cờ đỏ theo phiếu còn lại, tắt dòng sổ để tồn tính lại.
 * Thu hồi cả mẻ / điều chuyển / duyệt BOM không đi cửa này.
 */
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { listStationStampSelectColumns } from "@/modules/cssd-erp/workflow/domain/cssd-station-clear";
import { isCssdStation, WORKFLOW_STEPS } from "@/modules/cssd-erp/workflow/domain/cssd-stations";
import {
  isEffectiveCssdRedAlertSource,
  readIncidentGroup,
  readIncidentTypeCode,
  readIncidentTypeLabel,
  type CssdRedAlertSourceRow,
} from "./cssd-incident-attributes";
import { resolveIncidentPolicy } from "./cssd-incident-policy";
import {
  INCIDENT_STATUS_VOID,
  readIncidentPhieuStatus,
} from "./cssd-incident-status";
import { isBatchQcFailTypeId, type IncidentGroup } from "./cssd-incident-taxonomy";
import { readSetReconcileStatus } from "./cssd-set-reconcile-attrs";

export const INCIDENT_VOID_BATCH =
  "Phiếu thu hồi cả mẻ không vô hiệu tại nhật ký. Mẻ và máy giữ nguyên.";
export const INCIDENT_VOID_DRAFT = "Phiếu đang nháp. Hủy trên form rà soát.";
export const INCIDENT_VOID_BOM =
  "Phiếu đang duyệt thành phần bộ. Từ chối trên duyệt, không vô hiệu tại nhật ký.";
export const INCIDENT_VOID_TRANSFER =
  "Phiếu có điều chuyển bộ. Lập phiếu ngược ở Luân chuyển — vô hiệu ở đây lệch cấu phần.";
export const INCIDENT_VOID_ALREADY = "Phiếu sự cố đã bị vô hiệu.";

const BOM_BLOCK = new Set(["BOM_PENDING", "BOM_APPLYING", "BOM_APPLY_FAILED", "BOM_APPROVED"]);

const STAMP_COLS = new Set(listStationStampSelectColumns([...WORKFLOW_STEPS]));

export type VoidRollbackEvent = {
  su_kien?: string | null;
  tu_tram?: string | null;
  den_tram?: string | null;
  chi_tiet?: {
    su_co_id?: string | null;
    before?: Record<string, unknown> | null;
    mo_ta?: string | null;
    tram_phat_hien?: string | null;
  } | null;
};

export type VoidLedgerLine = {
  id: string;
  loaiGiaoDich: string;
  soLuongThayDoi: number;
  loaiDungCuId: string;
  isActive: boolean;
};

export type VoidPeer = CssdRedAlertSourceRow & {
  ma_tram_phat_hien?: string | null;
};

export type IncidentVoidCyclePlan = {
  restoreStation: string | null;
  stamps: Record<string, unknown>;
  isRedAlert: boolean;
  /** null = không đụng khóa an toàn. */
  isDongBang: boolean | null;
  restoreLoId: string | null;
};

export type IncidentVoidPlan =
  | { ok: true; already: true }
  | {
      ok: true;
      already: false;
      attributes: Record<string, unknown>;
      deactivateLedgerIds: string[];
      khoDelta: { loaiDungCuId: string; delta: number }[];
      cycle: IncidentVoidCyclePlan | null;
    }
  | { ok: false; error: string };

function readRollbackTarget(attrs: Record<string, unknown>): string {
  return String(attrs.ROLLBACK_TARGET_STATION ?? attrs.rollback_target_station ?? "")
    .trim()
    .toUpperCase();
}

function readLoId(attrs: Record<string, unknown>): string {
  return String(attrs.LO_TIET_KHUAN_ID ?? attrs.lo_tiet_khuan_id ?? "").trim();
}

/** Sự kiện đẩy lui cuối cùng của đúng phiếu. Phiếu sau giữ trạm. */
export function pickDominoRollbackToUndo(
  events: readonly VoidRollbackEvent[],
  ticket: { id: string; moTa: string; detectionStation: string; targetStation: string },
): Record<string, unknown> | null {
  const rollbacks = events.filter((e) => String(e.su_kien || "") === "SU_CO_DOMINO_ROLLBACK");
  const last = rollbacks[rollbacks.length - 1];
  if (!last) return null;
  const detail = last.chi_tiet || {};
  const linked = String(detail.su_co_id || "").trim();
  if (linked && linked !== ticket.id) return null;
  if (!linked) {
    const tu = String(last.tu_tram || detail.tram_phat_hien || "")
      .trim()
      .toUpperCase();
    const den = String(last.den_tram || "")
      .trim()
      .toUpperCase();
    const mo = String(detail.mo_ta || "").trim();
    if (tu !== ticket.detectionStation.trim().toUpperCase()) return null;
    if (ticket.targetStation && den && den !== ticket.targetStation.trim().toUpperCase()) return null;
    if (mo && ticket.moTa.trim() && mo !== ticket.moTa.trim()) return null;
  }
  const before = detail.before;
  return before && typeof before === "object" ? before : {};
}

function stampPatch(before: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(before)) {
    if (!STAMP_COLS.has(key) || value == null || String(value).trim() === "") continue;
    out[key] = value;
  }
  return out;
}

function peerFreezes(row: VoidPeer): boolean {
  if (!isEffectiveCssdRedAlertSource(row)) return false;
  const group = readIncidentGroup(row.attributes || {}) as IncidentGroup | null;
  if (!group || group === "INSTRUMENT") return false;
  const stationRaw = String(row.ma_tram_phat_hien || "").trim().toUpperCase();
  if (!isCssdStation(stationRaw)) return false;
  const policy = resolveIncidentPolicy({
    detectionStation: stationRaw,
    incidentTypeTen: readIncidentTypeLabel(row.attributes || {}) || "",
    incidentGroup: group,
    typeId: readIncidentTypeCode(row.attributes || {}) || undefined,
    faultStation: isCssdStation(readRollbackTarget(row.attributes || {}))
      ? (readRollbackTarget(row.attributes || {}) as Station)
      : undefined,
    currentStation: stationRaw,
  });
  return policy.freezeSafetyLock;
}

export function summarizeVoidLedger(
  lines: readonly VoidLedgerLine[],
): { ok: true; deactivateLedgerIds: string[]; khoDelta: { loaiDungCuId: string; delta: number }[] } | { ok: false; error: string } {
  const active = lines.filter((l) => l.isActive && String(l.id || "").trim());
  if (active.some((l) => String(l.loaiGiaoDich || "").toUpperCase() === "DIEU_CHUYEN")) {
    return { ok: false, error: INCIDENT_VOID_TRANSFER };
  }
  const byLoai = new Map<string, number>();
  for (const line of active) {
    const kind = String(line.loaiGiaoDich || "").toUpperCase();
    const abs = Math.abs(Math.trunc(Number(line.soLuongThayDoi) || 0));
    if (!abs) continue;
    const loai = String(line.loaiDungCuId || "").trim();
    if ((kind === "BO_SUNG" || kind === "NHAP_KHO") && !loai) {
      return { ok: false, error: "Phiếu thiếu loại dụng cụ, không hoàn kho dự phòng." };
    }
    if (!loai) continue;
    const sign = kind === "BO_SUNG" ? abs : kind === "NHAP_KHO" ? -abs : 0;
    if (!sign) continue;
    byLoai.set(loai, (byLoai.get(loai) || 0) + sign);
  }
  return {
    ok: true,
    deactivateLedgerIds: active.map((l) => l.id),
    khoDelta: [...byLoai.entries()]
      .filter(([, delta]) => delta !== 0)
      .map(([loaiDungCuId, delta]) => ({ loaiDungCuId, delta })),
  };
}

export function planCssdIncidentVoid(input: {
  ticket: {
    id: string;
    isActive: boolean;
    attributes: Record<string, unknown>;
    moTa: string;
    detectionStation: string;
    quyTrinhId: string | null;
  };
  peers: readonly VoidPeer[];
  ledger: readonly VoidLedgerLine[];
  rollbackEvents: readonly VoidRollbackEvent[];
  currentLoId: string | null;
  voidedAt: string;
  actorName?: string | null;
  actorNhanSuId?: string | null;
}): IncidentVoidPlan {
  const attrs = input.ticket.attributes || {};
  if (input.ticket.isActive === false || readIncidentPhieuStatus(attrs) === INCIDENT_STATUS_VOID) {
    return { ok: true, already: true };
  }
  const typeId = readIncidentTypeCode(attrs);
  if (String(attrs.BATCH_RECALL || "") === "1" || isBatchQcFailTypeId(typeId)) {
    return { ok: false, error: INCIDENT_VOID_BATCH };
  }
  const reconcile = readSetReconcileStatus(attrs);
  if (reconcile === "DRAFT") return { ok: false, error: INCIDENT_VOID_DRAFT };
  if (reconcile && BOM_BLOCK.has(reconcile)) return { ok: false, error: INCIDENT_VOID_BOM };

  const ledger = summarizeVoidLedger(input.ledger);
  if (!ledger.ok) return ledger;

  const group = readIncidentGroup(attrs) as IncidentGroup | null;
  const target = readRollbackTarget(attrs);
  const detection = String(input.ticket.detectionStation || "").trim().toUpperCase();
  const quyId = String(input.ticket.quyTrinhId || "").trim();
  const peers = input.peers.filter((p) => String(p.quy_trinh_id || "").trim() === quyId);

  let cycle: IncidentVoidCyclePlan | null = null;
  if (quyId) {
    const movesSet = group !== "INSTRUMENT" && isCssdStation(target) && isCssdStation(detection);
    const before = movesSet
      ? pickDominoRollbackToUndo(input.rollbackEvents, {
          id: input.ticket.id,
          moTa: input.ticket.moTa,
          detectionStation: detection,
          targetStation: target,
        })
      : null;
    const policy =
      group && isCssdStation(detection)
        ? resolveIncidentPolicy({
            detectionStation: detection,
            incidentTypeTen: readIncidentTypeLabel(attrs) || "",
            incidentGroup: group,
            typeId: typeId || undefined,
            faultStation: isCssdStation(target) ? target : undefined,
            currentStation: detection,
          })
        : null;
    const loOnTicket = readLoId(attrs);
    const restoreLo =
      before && policy?.clearSterilizationBatchLink && !String(input.currentLoId || "").trim() && loOnTicket
        ? loOnTicket
        : null;
    const thisFreezes = Boolean(policy?.freezeSafetyLock);
    const othersFreeze = peers.some(peerFreezes);
    cycle = {
      restoreStation: before ? detection : null,
      stamps: before ? stampPatch(before) : {},
      isRedAlert: peers.some(
        (p) => p.is_red_alert === true && isEffectiveCssdRedAlertSource(p),
      ),
      isDongBang: thisFreezes ? othersFreeze : null,
      restoreLoId: restoreLo,
    };
  }

  const next: Record<string, unknown> = {
    ...attrs,
    INCIDENT_STATUS: INCIDENT_STATUS_VOID,
    INCIDENT_VOIDED_AT: input.voidedAt,
  };
  const byId = String(input.actorNhanSuId || "").trim();
  if (byId) next.INCIDENT_VOIDED_BY_ID = byId;
  const byName = String(input.actorName || "").trim();
  if (byName) next.INCIDENT_VOIDED_BY_NAME = byName;

  return {
    ok: true,
    already: false,
    attributes: next,
    deactivateLedgerIds: ledger.deactivateLedgerIds,
    khoDelta: ledger.khoDelta,
    cycle,
  };
}
