/** Soft account-access request stored on mdm_nhan_su.extra_data (fallback when table absent). */

export const ACCOUNT_REQUEST_STATUSES = ["CHO_DUYET", "DUYET", "TU_CHOI"] as const;
export type AccountRequestStatus = (typeof ACCOUNT_REQUEST_STATUSES)[number];

export const ACCOUNT_REQUEST_KINDS = ["REQUEST", "RESET"] as const;
export type AccountRequestKind = (typeof ACCOUNT_REQUEST_KINDS)[number];

export type AccountRequestMeta = {
  status: AccountRequestStatus;
  /** REQUEST = xin cấp TK; RESET = xin admin đặt lại MK. Default REQUEST for legacy. */
  kind?: AccountRequestKind;
  ly_do?: string;
  /** Legacy free-text; prefer chuc_danh_id. */
  chuc_danh?: string;
  chuc_danh_id?: string;
  submitted_at?: string;
  reject_reason?: string;
  rejected_at?: string;
  rejected_by?: string | null;
  approved_at?: string;
  approved_by?: string | null;
  /** Link to sys_account_access_request.id when dual-written. */
  ticket_id?: string;
  /** Dòng ảo dựng từ phiếu (chưa/không phải hồ sơ thật) — UI ẩn «Sửa hồ sơ». */
  ticket_only?: boolean;
};

/** ACC-1: so email không phân biệt hoa thường, đã trim; rỗng không bao giờ khớp. */
export function accountEmailsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = String(a ?? "").trim().toLowerCase();
  const y = String(b ?? "").trim().toLowerCase();
  return x.length > 0 && x === y;
}

/** ACC-1: phiếu RESET chỉ tạo khi hồ sơ có TK, đang hoạt động và email nhập khớp email hồ sơ. */
export function canCreateResetTicket(
  staff: { auth_user_id?: string | null; is_active?: boolean | null; email?: string | null } | null | undefined,
  submittedEmail: string,
): boolean {
  if (!staff?.auth_user_id || staff.is_active === false) return false;
  return accountEmailsMatch(staff.email, submittedEmail);
}

/** Giới hạn phiếu công khai: gửi lại theo email / mã NV và số phiếu chờ duyệt còn mở. */
export const ACCESS_REQUEST_COOLDOWN_MS = 45_000;
export const ACCESS_REQUEST_MA_NV_WINDOW_MS = 10 * 60_000;
export const ACCESS_REQUEST_MAX_PENDING = 2;

export function isAccessRequestThrottled(counts: {
  recentByEmail: number;
  recentByMaNv: number;
  pendingByEmail: number;
  pendingByMaNv: number;
}): boolean {
  return (
    counts.recentByEmail > 0 ||
    counts.recentByMaNv > 0 ||
    counts.pendingByEmail >= ACCESS_REQUEST_MAX_PENDING ||
    counts.pendingByMaNv >= ACCESS_REQUEST_MAX_PENDING
  );
}

/** Mã phiếu ngắn để người xin đọc / hỏi quản trị — không phải UUID đầy đủ. */
export function formatAccountRequestTicketCode(ticketId: string | null | undefined): string | null {
  const raw = String(ticketId || "").replace(/-/g, "").trim();
  if (raw.length < 8) return null;
  return `YC-${raw.slice(0, 8).toUpperCase()}`;
}

export function readAccountRequest(
  extra: Record<string, unknown> | null | undefined,
): AccountRequestMeta | null {
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) return null;
  const raw = extra.account_request;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const status = String((raw as { status?: unknown }).status || "").trim().toUpperCase();
  if (!ACCOUNT_REQUEST_STATUSES.includes(status as AccountRequestStatus)) return null;
  const kindRaw = String((raw as { kind?: unknown }).kind || "REQUEST").trim().toUpperCase();
  const kind = ACCOUNT_REQUEST_KINDS.includes(kindRaw as AccountRequestKind)
    ? (kindRaw as AccountRequestKind)
    : "REQUEST";
  return { ...(raw as AccountRequestMeta), status: status as AccountRequestStatus, kind };
}

/** Cùng lọc với danh sách «Chỉ chờ duyệt» trên Nhân sự (`v_mdm_nhan_su_full.extra_data`). */
export const PENDING_ACCOUNT_REQUEST_CONTAINS = {
  account_request: { status: "CHO_DUYET" as const },
};

export function isPendingAccountRequest(
  extra: Record<string, unknown> | null | undefined,
): boolean {
  return readAccountRequest(extra)?.status === "CHO_DUYET";
}

export function pendingAccountRequestKind(
  extra: Record<string, unknown> | null | undefined,
): AccountRequestKind | null {
  const req = readAccountRequest(extra);
  if (!req || req.status !== "CHO_DUYET") return null;
  return req.kind || "REQUEST";
}

export function mergeAccountRequest(
  extra: Record<string, unknown> | null | undefined,
  patch: AccountRequestMeta,
): Record<string, unknown> {
  const base =
    extra && typeof extra === "object" && !Array.isArray(extra)
      ? { ...extra }
      : {};
  const prev = readAccountRequest(base);
  base.account_request = { ...(prev || {}), ...patch };
  return base;
}
