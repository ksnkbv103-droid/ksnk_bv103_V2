/**
 * SC-8 / CSSD-02: vòng đời phiếu sự cố — mở → đã xác nhận → đã đóng (giải phóng) | vô hiệu.
 * Cất trong attributes (không thêm cột). Không dùng nguoi_xac_nhan_id (cột đó là duyệt BOM kiểm kê).
 */

export const INCIDENT_STATUS_OPEN = "OPEN" as const;
export const INCIDENT_STATUS_CONFIRMED = "DA_XAC_NHAN" as const;
export const INCIDENT_STATUS_CLOSED = "DA_DONG" as const;
export const INCIDENT_STATUS_VOID = "VO_HIEU" as const;

export type IncidentPhieuStatus =
  | typeof INCIDENT_STATUS_OPEN
  | typeof INCIDENT_STATUS_CONFIRMED
  | typeof INCIDENT_STATUS_CLOSED
  | typeof INCIDENT_STATUS_VOID;

export const INCIDENT_STATUS_LABEL: Record<IncidentPhieuStatus, string> = {
  OPEN: "Chưa xác nhận",
  DA_XAC_NHAN: "Đã xác nhận",
  DA_DONG: "Đã đóng (giải phóng)",
  VO_HIEU: "Đã vô hiệu",
};

export const INCIDENT_ALREADY_CONFIRMED =
  "Phiếu sự cố đã được xác nhận. Không xác nhận lại.";

export const INCIDENT_ALREADY_VOID = "Phiếu sự cố đã bị vô hiệu.";

export const INCIDENT_ALREADY_CLOSED = "Phiếu sự cố đã đóng (giải phóng).";

export const INCIDENT_CLOSE_NEEDS_CONFIRM =
  "Chỉ đóng (giải phóng) phiếu sự cố đã xác nhận.";

export const INCIDENT_CLOSE_NEEDS_FIELDS =
  "Đóng (giải phóng) cần lý do và số biên bản.";

/** N-CSSD-2 tạm: Trưởng CSSD / Hội đồng KSNK / Admin. */
export const CSSD_INCIDENT_CLOSE_ROLES = ["ADMIN", "HOI_DONG_KSNK", "TRUONG_CSSD"] as const;

/** SC-02/03 tạm: xác nhận BM.02 / ra lệnh thu hồi mẻ = Trưởng CSSD / Admin. */
export const CSSD_INCIDENT_APPROVE_ROLES = ["ADMIN", "TRUONG_CSSD"] as const;

export function canCloseSterilizationIncidentRelease(roles: readonly string[]): boolean {
  const set = new Set(roles.map((r) => String(r || "").trim().toUpperCase()).filter(Boolean));
  return (CSSD_INCIDENT_CLOSE_ROLES as readonly string[]).some((r) => set.has(r));
}

/** Vai trò khóa (Trưởng / Hội đồng / Admin) hoặc quyền ma trận `BAO_SU_CO.close`. */
export function canCloseCssdIncidentRelease(input: {
  roles: readonly string[];
  hasClosePermission?: boolean;
}): boolean {
  if (input.hasClosePermission) return true;
  return canCloseSterilizationIncidentRelease(input.roles);
}

export function canApproveCssdIncident(roles: readonly string[]): boolean {
  const set = new Set(roles.map((r) => String(r || "").trim().toUpperCase()).filter(Boolean));
  return (CSSD_INCIDENT_APPROVE_ROLES as readonly string[]).some((r) => set.has(r));
}

export const INCIDENT_SELF_CONFIRM_FORBIDDEN =
  "Người báo không được tự xác nhận phiếu của mình — cần Trưởng CSSD / Admin.";

export const INCIDENT_APPROVE_FORBIDDEN =
  "Chỉ Trưởng CSSD / Admin được xác nhận hoặc ra lệnh thu hồi mẻ.";

/** SC-03: lý do vô hiệu bắt buộc. */
export const INCIDENT_VOID_REASON_CODES = ["NHAP_NHAM", "TRUNG", "SAI_BO", "KHAC"] as const;
export type IncidentVoidReasonCode = (typeof INCIDENT_VOID_REASON_CODES)[number];

export const INCIDENT_VOID_REASON_LABEL: Record<IncidentVoidReasonCode, string> = {
  NHAP_NHAM: "Nhập nhầm",
  TRUNG: "Trùng phiếu",
  SAI_BO: "Sai bộ / sai QR",
  KHAC: "Khác",
};

export const INCIDENT_VOID_NEEDS_REASON = "Vô hiệu phiếu sự cố cần chọn lý do.";

export function assertIncidentVoidReason(
  code?: string | null,
  note?: string | null,
): { ok: true; code: IncidentVoidReasonCode; note: string } | { ok: false; error: string } {
  const c = String(code || "").trim().toUpperCase() as IncidentVoidReasonCode;
  if (!(INCIDENT_VOID_REASON_CODES as readonly string[]).includes(c)) {
    return { ok: false, error: INCIDENT_VOID_NEEDS_REASON };
  }
  const noteText = String(note || "").trim();
  if (c === "KHAC" && !noteText) {
    return { ok: false, error: "Lý do «Khác» cần ghi chú." };
  }
  return { ok: true, code: c, note: noteText };
}

export function readIncidentPhieuStatus(attrs: Record<string, unknown> | null | undefined): IncidentPhieuStatus {
  const raw = String(attrs?.INCIDENT_STATUS ?? attrs?.incident_status ?? "")
    .trim()
    .toUpperCase();
  if (raw === INCIDENT_STATUS_VOID) return INCIDENT_STATUS_VOID;
  if (raw === INCIDENT_STATUS_CLOSED || raw === "CLOSED") return INCIDENT_STATUS_CLOSED;
  if (raw === INCIDENT_STATUS_CONFIRMED) return INCIDENT_STATUS_CONFIRMED;
  return INCIDENT_STATUS_OPEN;
}

export function isIncidentPhieuConfirmed(attrs: Record<string, unknown> | null | undefined): boolean {
  const s = readIncidentPhieuStatus(attrs);
  return s === INCIDENT_STATUS_CONFIRMED || s === INCIDENT_STATUS_CLOSED;
}

export function isIncidentPhieuClosed(attrs: Record<string, unknown> | null | undefined): boolean {
  return readIncidentPhieuStatus(attrs) === INCIDENT_STATUS_CLOSED;
}

export function assertIncidentPhieuCanConfirm(
  attrs: Record<string, unknown> | null | undefined,
): { ok: true } | { ok: false; error: string } {
  const status = readIncidentPhieuStatus(attrs);
  if (status === INCIDENT_STATUS_VOID) {
    return { ok: false, error: INCIDENT_ALREADY_VOID };
  }
  if (status === INCIDENT_STATUS_CLOSED) {
    return { ok: false, error: INCIDENT_ALREADY_CLOSED };
  }
  if (status === INCIDENT_STATUS_CONFIRMED) {
    return { ok: false, error: INCIDENT_ALREADY_CONFIRMED };
  }
  return { ok: true };
}

export function assertIncidentPhieuCanCloseRelease(
  attrs: Record<string, unknown> | null | undefined,
  opts: { lyDo?: string | null; soBienBan?: string | null },
): { ok: true } | { ok: false; error: string } {
  const status = readIncidentPhieuStatus(attrs);
  if (status === INCIDENT_STATUS_VOID) {
    return { ok: false, error: INCIDENT_ALREADY_VOID };
  }
  if (status === INCIDENT_STATUS_CLOSED) {
    return { ok: false, error: INCIDENT_ALREADY_CLOSED };
  }
  if (status !== INCIDENT_STATUS_CONFIRMED) {
    return { ok: false, error: INCIDENT_CLOSE_NEEDS_CONFIRM };
  }
  const lyDo = String(opts.lyDo || "").trim();
  const soBienBan = String(opts.soBienBan || "").trim();
  if (!lyDo || !soBienBan) {
    return { ok: false, error: INCIDENT_CLOSE_NEEDS_FIELDS };
  }
  return { ok: true };
}

export function buildIncidentConfirmAttributePatch(
  existing: Record<string, unknown>,
  opts: {
    confirmedAt: string;
    confirmedById?: string | null;
    confirmedByName?: string | null;
    confirmedByAuthUserId?: string | null;
  },
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...existing,
    INCIDENT_STATUS: INCIDENT_STATUS_CONFIRMED,
    INCIDENT_CONFIRMED_AT: opts.confirmedAt,
  };
  const byId = String(opts.confirmedById ?? "").trim();
  if (byId) next.INCIDENT_CONFIRMED_BY_ID = byId;
  const byName = String(opts.confirmedByName ?? "").trim();
  if (byName) next.INCIDENT_CONFIRMED_BY_NAME = byName;
  const authId = String(opts.confirmedByAuthUserId ?? "").trim();
  if (authId) next.INCIDENT_CONFIRMED_BY_AUTH_USER_ID = authId;
  return next;
}

export function buildIncidentCloseReleaseAttributePatch(
  existing: Record<string, unknown>,
  opts: {
    closedAt: string;
    lyDo: string;
    soBienBan: string;
    closedById?: string | null;
    closedByName?: string | null;
    closedByAuthUserId?: string | null;
  },
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...existing,
    INCIDENT_STATUS: INCIDENT_STATUS_CLOSED,
    INCIDENT_CLOSED_AT: opts.closedAt,
    INCIDENT_CLOSE_REASON: String(opts.lyDo).trim(),
    INCIDENT_CLOSE_BIEN_BAN: String(opts.soBienBan).trim(),
  };
  const byId = String(opts.closedById ?? "").trim();
  if (byId) next.INCIDENT_CLOSED_BY_ID = byId;
  const byName = String(opts.closedByName ?? "").trim();
  if (byName) next.INCIDENT_CLOSED_BY_NAME = byName;
  const authId = String(opts.closedByAuthUserId ?? "").trim();
  if (authId) next.INCIDENT_CLOSED_BY_AUTH_USER_ID = authId;
  return next;
}

export function readIncidentConfirmedAt(attrs: Record<string, unknown> | null | undefined): string | null {
  const t = String(attrs?.INCIDENT_CONFIRMED_AT ?? attrs?.incident_confirmed_at ?? "").trim();
  return t || null;
}

export function readIncidentConfirmedByName(attrs: Record<string, unknown> | null | undefined): string | null {
  const t = String(attrs?.INCIDENT_CONFIRMED_BY_NAME ?? attrs?.incident_confirmed_by_name ?? "").trim();
  return t || null;
}

export function readIncidentClosedAt(attrs: Record<string, unknown> | null | undefined): string | null {
  const t = String(attrs?.INCIDENT_CLOSED_AT ?? "").trim();
  return t || null;
}

export function readIncidentCloseBienBan(attrs: Record<string, unknown> | null | undefined): string | null {
  const t = String(attrs?.INCIDENT_CLOSE_BIEN_BAN ?? "").trim();
  return t || null;
}
