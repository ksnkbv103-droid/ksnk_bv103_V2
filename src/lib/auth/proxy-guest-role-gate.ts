import { isGuestStatsOnlyRole, isGuestStatsPathAllowed } from "@/lib/auth/guest-stats-access";

/**
 * BE-GUEST-01 — khi lookup roles lỗi (PostgREST `{ error }` hoặc throw):
 * A) Áp hạn chế như khách — user thường tạm vào allowlist thống kê; dễ hiểu nhầm quyền.
 * B) 503 «Không kiểm tra được quyền» ngoài allowlist khách — rõ ràng, không khóa /login
 *    và trang khách (GUEST_STATS_HOME_PATH thuộc allowlist → không vòng redirect).
 * C) Như B + GET Accept:html trả HTML có «Thử lại»; request khác (action/API) → 503 ngắn.
 * Chọn C: fail-closed ngoài allowlist, không gán nhầm vai khách khi DB chập chờn.
 */

export type GuestRoleLookupOutcome =
  | { kind: "guest" }
  | { kind: "not_guest" }
  | { kind: "lookup_failed" };

export type GuestProxyDecision =
  | { action: "allow" }
  | { action: "redirect_guest_home" }
  | { action: "service_unavailable" };

/** Phân loại kết quả tra `v_sys_user_permissions.roles` (không gọi DB). */
export function classifyGuestRoleLookup(input: {
  data: { roles?: unknown } | null;
  error: unknown | null;
  threw?: boolean;
}): GuestRoleLookupOutcome {
  if (input.threw || input.error) return { kind: "lookup_failed" };
  // Không dòng (data null, error null) = bootstrap → không phải khách.
  if (!input.data) return { kind: "not_guest" };
  const roles = Array.isArray(input.data.roles) ? (input.data.roles as string[]) : [];
  return isGuestStatsOnlyRole(roles) ? { kind: "guest" } : { kind: "not_guest" };
}

export function decideGuestProxyAccess(input: {
  outcome: GuestRoleLookupOutcome;
  pathname: string;
  onLoginRoute: boolean;
}): GuestProxyDecision {
  const { outcome, pathname, onLoginRoute } = input;

  if (outcome.kind === "lookup_failed") {
    // Allowlist khách (gồm /login và GUEST_STATS_HOME_PATH) vẫn qua — tránh vòng redirect / chặn login.
    if (isGuestStatsPathAllowed(pathname)) return { action: "allow" };
    return { action: "service_unavailable" };
  }

  if (outcome.kind === "guest") {
    if (onLoginRoute || !isGuestStatsPathAllowed(pathname)) {
      return { action: "redirect_guest_home" };
    }
    return { action: "allow" };
  }

  // not_guest — luồng login redirect / tiếp tục do proxy xử lý ngoài hàm này.
  return { action: "allow" };
}

/** PA C: HTML «Thử lại» chỉ cho điều hướng trang; action/API nhận 503 ngắn. */
export function guestLookupFailWantsHtmlPage(method: string, acceptHeader: string | null): boolean {
  const m = method.toUpperCase();
  if (m !== "GET" && m !== "HEAD") return false;
  return (acceptHeader ?? "").includes("text/html");
}
