/**
 * SC-8: vòng đời phiếu sự cố — mở → đã xác nhận.
 * Cất trong attributes (không thêm cột). Không dùng nguoi_xac_nhan_id (cột đó là duyệt BOM kiểm kê).
 */

export const INCIDENT_STATUS_OPEN = "OPEN" as const;
export const INCIDENT_STATUS_CONFIRMED = "DA_XAC_NHAN" as const;

export type IncidentPhieuStatus = typeof INCIDENT_STATUS_OPEN | typeof INCIDENT_STATUS_CONFIRMED;

export const INCIDENT_STATUS_LABEL: Record<IncidentPhieuStatus, string> = {
  OPEN: "Chưa xác nhận",
  DA_XAC_NHAN: "Đã xác nhận",
};

export const INCIDENT_ALREADY_CONFIRMED =
  "Phiếu sự cố đã được xác nhận. Không xác nhận lại.";

export function readIncidentPhieuStatus(attrs: Record<string, unknown> | null | undefined): IncidentPhieuStatus {
  const raw = String(attrs?.INCIDENT_STATUS ?? attrs?.incident_status ?? "")
    .trim()
    .toUpperCase();
  if (raw === INCIDENT_STATUS_CONFIRMED) return INCIDENT_STATUS_CONFIRMED;
  return INCIDENT_STATUS_OPEN;
}

export function isIncidentPhieuConfirmed(attrs: Record<string, unknown> | null | undefined): boolean {
  return readIncidentPhieuStatus(attrs) === INCIDENT_STATUS_CONFIRMED;
}

export function assertIncidentPhieuCanConfirm(
  attrs: Record<string, unknown> | null | undefined,
): { ok: true } | { ok: false; error: string } {
  if (isIncidentPhieuConfirmed(attrs)) {
    return { ok: false, error: INCIDENT_ALREADY_CONFIRMED };
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

export function readIncidentConfirmedAt(attrs: Record<string, unknown> | null | undefined): string | null {
  const t = String(attrs?.INCIDENT_CONFIRMED_AT ?? attrs?.incident_confirmed_at ?? "").trim();
  return t || null;
}

export function readIncidentConfirmedByName(attrs: Record<string, unknown> | null | undefined): string | null {
  const t = String(attrs?.INCIDENT_CONFIRMED_BY_NAME ?? attrs?.incident_confirmed_by_name ?? "").trim();
  return t || null;
}
