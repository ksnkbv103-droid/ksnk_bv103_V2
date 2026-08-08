import type { IncidentGroup } from "./cssd-incident-taxonomy";

export type IncidentAttributeInput = {
  incidentGroup: IncidentGroup;
  typeTen: string;
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
