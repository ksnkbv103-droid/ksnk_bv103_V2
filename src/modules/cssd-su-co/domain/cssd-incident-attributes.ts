import type { CauseClass, IncidentGroup } from "./cssd-incident-taxonomy";
import { CAUSE_CLASS_LABEL } from "./cssd-incident-taxonomy";
import { isSetReconcileDraftAttr } from "./cssd-set-reconcile-attrs";
import { INCIDENT_STATUS_VOID, readIncidentPhieuStatus } from "./cssd-incident-status";

export type IncidentAttributeInput = {
  incidentGroup: IncidentGroup;
  typeTen: string;
  typeId?: string;
  causeClass?: CauseClass;
  causeLabel?: string;
  incidentKind: string;
  rollbackTargetStation: string;
  errorQR?: string;
  machineId?: string;
  faultOperator?: string;
  /** FK mdm_nhan_su — người liên quan (khâu lỗi / chọn tay). */
  faultOperatorId?: string;
  nguoiPhatHien?: string;
  nguoiPhatHienId?: string;
  thoiGianPhatHien?: string;
  anhMinhChung?: string;
  reporterEmail?: string | null;
  reporterAuthUserId?: string | null;
  /** PROCESS: gắn mẻ TK (không cần cột FK — đọc từ attributes). */
  loTietKhuanId?: string;
  maLo?: string;
};

/** SSOT thuộc tính sự cố — app chỉ ghi JSONB; cột generated đọc từ đây. */
export function buildIncidentAttributes(data: IncidentAttributeInput): Record<string, string> {
  const attributes: Record<string, string> = {
    INCIDENT_GROUP: data.incidentGroup,
    INCIDENT_TYPE_LABEL: data.typeTen,
    INCIDENT_KIND: data.incidentKind,
    ROLLBACK_TARGET_STATION: data.rollbackTargetStation,
  };
  if (data.typeId) attributes.INCIDENT_TYPE_CODE = data.typeId;
  if (data.causeClass) {
    attributes.CAUSE_CLASS = data.causeClass;
    attributes.CAUSE_LABEL = data.causeLabel || CAUSE_CLASS_LABEL[data.causeClass];
  }
  if (data.errorQR) attributes.ERROR_QR = data.errorQR;
  if (data.machineId) attributes.MACHINE_ID = data.machineId;
  if (data.faultOperator) attributes.FAULT_OPERATOR = data.faultOperator;
  if (data.faultOperatorId) attributes.FAULT_OPERATOR_ID = data.faultOperatorId;
  if (data.nguoiPhatHien) attributes.NGUOI_PHAT_HIEN = data.nguoiPhatHien;
  if (data.nguoiPhatHienId) attributes.NGUOI_PHAT_HIEN_ID = data.nguoiPhatHienId;
  if (data.thoiGianPhatHien) attributes.THOI_GIAN_PHAT_HIEN = data.thoiGianPhatHien;
  if (data.anhMinhChung) attributes.ANH_MINH_CHUNG = data.anhMinhChung;
  if (data.reporterEmail) attributes.REPORTER_EMAIL = String(data.reporterEmail);
  if (data.reporterAuthUserId) attributes.REPORTER_AUTH_USER_ID = String(data.reporterAuthUserId);
  if (data.loTietKhuanId) attributes.LO_TIET_KHUAN_ID = data.loTietKhuanId;
  if (data.maLo) attributes.MA_LO = data.maLo;
  return attributes;
}

export function readLoTietKhuanId(attrs: Record<string, unknown>): string | null {
  const raw = attrs.LO_TIET_KHUAN_ID ?? attrs.lo_tiet_khuan_id ?? null;
  const text = raw != null ? String(raw).trim() : "";
  return text || null;
}

export function readIncidentTypeLabel(attrs: Record<string, unknown>): string | null {
  const raw =
    attrs.INCIDENT_TYPE_LABEL ??
    attrs.incident_type_label ??
    attrs.INCIDENT_TYPE ??
    null;
  const text = raw != null ? String(raw).trim() : "";
  return text || null;
}

export function readIncidentGroup(attrs: Record<string, unknown>): string | null {
  const raw = attrs.INCIDENT_GROUP ?? attrs.incident_group ?? null;
  const text = raw != null ? String(raw).trim() : "";
  return text || null;
}

export function readIncidentTypeCode(attrs: Record<string, unknown>): string | null {
  const raw = attrs.INCIDENT_TYPE_CODE ?? attrs.incident_type_code ?? null;
  const text = raw != null ? String(raw).trim() : "";
  return text || null;
}

/** Phiếu luân chuyển số lượng — không phải sự cố an toàn (D1 / G-P0-06). */
const CIRCULATION_INCIDENT_TYPE_CODES = new Set([
  "INSTRUMENT_MOVE",
  "INSTRUMENT_TRANSFER",
  "INSTRUMENT_REPLENISH",
  "INSTRUMENT_RETURN_KHO",
]);

export function isCirculationIncidentTypeCode(code: string | null | undefined): boolean {
  return CIRCULATION_INCIDENT_TYPE_CODES.has(String(code || "").trim().toUpperCase());
}

/**
 * Tử số «sự cố» báo cáo (mọi nhóm an toàn trừ luân chuyển/nháp/vô hiệu).
 * `includeDraft`: lúc ghi phiếu, nháp đang mở của chính lần ghi vẫn tính.
 */
export function countsTowardCssdSafetyTally(
  attrs: Record<string, unknown> | null | undefined,
  opts?: { includeDraft?: boolean },
): boolean {
  const row = attrs && typeof attrs === "object" ? attrs : {};
  if (readIncidentPhieuStatus(row) === INCIDENT_STATUS_VOID) return false;
  if (isCirculationIncidentTypeCode(readIncidentTypeCode(row))) return false;
  if (!opts?.includeDraft && isSetReconcileDraftAttr(row)) return false;
  return true;
}

/**
 * SC-04: cờ đỏ chỉ đếm phiếu PROCESS gắn chu trình.
 * Ngưỡng: prior ≥ CSSD_RED_ALERT_PRIOR_THRESHOLD → bật ở phiếu thứ (threshold+1) = ≥3.
 */
export const CSSD_RED_ALERT_PRIOR_THRESHOLD = 2;
export const CSSD_RED_ALERT_DISPLAY_MIN = CSSD_RED_ALERT_PRIOR_THRESHOLD + 1;

export function countsTowardCssdRedAlert(
  attrs: Record<string, unknown> | null | undefined,
  opts?: { includeDraft?: boolean },
): boolean {
  if (!countsTowardCssdSafetyTally(attrs, opts)) return false;
  return readIncidentGroup(attrs && typeof attrs === "object" ? attrs : {}) === "PROCESS";
}

export type CssdRedAlertSourceRow = {
  is_active?: boolean | null;
  is_red_alert?: boolean | null;
  quy_trinh_id?: string | null;
  attributes?: Record<string, unknown> | null;
};

/**
 * Phiếu còn hiệu lực cho cờ đỏ kho.
 * Vô hiệu = `is_active` false (không có cột HUY/void riêng).
 * Nháp và luân chuyển: `countsTowardCssdSafetyTally`.
 */
export function isEffectiveCssdRedAlertSource(
  row: CssdRedAlertSourceRow,
  opts?: { includeDraft?: boolean },
): boolean {
  if (row.is_active === false) return false;
  return countsTowardCssdRedAlert(row.attributes, opts);
}

/** Overlay kho: chỉ `quy_trinh_id` của phiếu đã gắn cờ đỏ và còn hiệu lực. Không key `ma_qr`. */
export function quyTrinhIdsWithEffectiveRedAlert(rows: readonly CssdRedAlertSourceRow[]): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.is_red_alert !== true) continue;
    if (!isEffectiveCssdRedAlertSource(row)) continue;
    const id = String(row.quy_trinh_id || "").trim();
    if (id) ids.add(id);
  }
  return ids;
}

/**
 * Cột đỏ trên nhật ký báo cáo.
 * Chỉ `quy_trinh_id`. Phiếu không gắn chu kỳ không tô các chu kỳ cùng mã bộ.
 */
export function collectReportRedQuyTrinhIds(
  rows: readonly {
    quy_trinh_id?: string | null;
    is_red_alert?: boolean | null;
    attributes?: Record<string, unknown> | null;
  }[],
): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.is_red_alert !== true) continue;
    if (!countsTowardCssdSafetyTally(row.attributes)) continue;
    const id = String(row.quy_trinh_id || "").trim();
    if (id) ids.add(id);
  }
  return ids;
}

/** SC-04: đếm phiếu PROCESS còn hiệu lực trên đúng chu kỳ (nháp đang mở vẫn tính). */
export function countPriorSafetyIncidentsOnCycle(
  rows: readonly CssdRedAlertSourceRow[],
  quyTrinhId: string,
): number {
  const id = String(quyTrinhId || "").trim();
  if (!id) return 0;
  let n = 0;
  for (const row of rows) {
    if (String(row.quy_trinh_id || "").trim() !== id) continue;
    if (!isEffectiveCssdRedAlertSource(row, { includeDraft: true })) continue;
    n += 1;
  }
  return n;
}

export function shouldRaiseRedAlert(priorCount: number): boolean {
  return priorCount >= CSSD_RED_ALERT_PRIOR_THRESHOLD;
}

export function readCauseClass(attrs: Record<string, unknown>): string | null {
  const raw = attrs.CAUSE_CLASS ?? attrs.cause_class ?? null;
  const text = raw != null ? String(raw).trim() : "";
  return text || null;
}

export function readCauseLabel(attrs: Record<string, unknown>): string | null {
  const raw = attrs.CAUSE_LABEL ?? attrs.cause_label ?? null;
  const text = raw != null ? String(raw).trim() : "";
  return text || null;
}

export function readMaLo(attrs: Record<string, unknown>): string | null {
  const raw = attrs.MA_LO ?? attrs.ma_lo ?? null;
  const text = raw != null ? String(raw).trim() : "";
  return text || null;
}

/** Ưu tiên payload form; thiếu thì lấy từ quy trình đang gắn mẻ. */
export function resolveProcessBatchLink(
  payload?: { loTietKhuanId?: string; maLo?: string } | null,
  quyTrinh?: { lo_tiet_khuan_id?: string | null } | null,
): { loTietKhuanId?: string; maLo?: string } {
  const fromPayloadId = String(payload?.loTietKhuanId || "").trim();
  const fromQuyTrinhId = String(quyTrinh?.lo_tiet_khuan_id || "").trim();
  const loTietKhuanId = fromPayloadId || fromQuyTrinhId || undefined;
  const maLo = String(payload?.maLo || "").trim() || undefined;
  return { loTietKhuanId, maLo };
}
