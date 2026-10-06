/** TTL / key mốc kiểm phiên — dùng chung Gate + test. */
export const STAFF_GATE_AUTH_CHECK_AT_KEY = "staff_gate_auth_check_at";
export const STAFF_GATE_AUTH_CHECK_TTL_MS = 60_000;
export const STAFF_GATE_LINK_SYNC_TTL_MS = 5 * 60_000;

export type StaffGateDecision =
  | { action: "allow" }
  | { action: "sign_out_inactive" }
  | { action: "block_check_failed" };

/**
 * check_failed — phương án:
 * A) Đăng xuất như inactive — rủi ro vòng lặp / đá user khi DB chập chờn.
 * B) Lớp chặn + «Thử lại» (+ «Đăng xuất») — chọn B.
 */
export function decideStaffGateAction(
  res: { ok: true } | { ok: false; reason?: string }
): StaffGateDecision {
  if (res.ok) return { action: "allow" };
  if (res.reason === "inactive") return { action: "sign_out_inactive" };
  if (res.reason === "check_failed") return { action: "block_check_failed" };
  return { action: "allow" };
}

export function clearStaffGateAuthCheckAt() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STAFF_GATE_AUTH_CHECK_AT_KEY);
}

export function shouldRunGateTask(key: string, ttlMs: number) {
  if (typeof window === "undefined") return true;
  const now = Date.now();
  const last = Number(window.sessionStorage.getItem(key) || "0");
  if (Number.isFinite(last) && now - last < ttlMs) return false;
  window.sessionStorage.setItem(key, String(now));
  return true;
}
