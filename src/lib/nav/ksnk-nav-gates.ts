/**
 * Map menu → module VIEW (permission-registry).
 * Sidebar: hiển thị mục nếu admin hoặc có view ít nhất một module liệt kê.
 */

export type NavGate = {
  /** Khóa ổn định cho React key */
  id: string;
  /** Mã module: phải khớp MODULE_REGISTRY + bảng permissions */
  moduleKeys: readonly string[];
  /**
   * true: cần VIEW trên mọi moduleKeys (AND).
   * false/undefined: chỉ cần VIEW một trong các module (OR) — mặc định sidebar.
   */
  requireEveryView?: boolean;
};

export const NAV_GATE_DASHBOARD: NavGate = {
  id: "dash",
  moduleKeys: [
    "DASHBOARD",
    "DASHBOARD_CC_OVERVIEW",
    "DASHBOARD_CC_SUPERVISION",
    "DASHBOARD_CC_GAP",
  ],
};
/** Trùng quyền với action dashboard Giám sát tuân thủ (DASHBOARD + GIAM_SAT_CHUNG). */
export const NAV_GATE_DASHBOARD_COMPLIANCE: NavGate = {
  id: "dash-compliance",
  moduleKeys: ["DASHBOARD", "GIAM_SAT_CHUNG"],
  requireEveryView: true,
};
/** Tab NKBV trên Dashboard: cần cả quyền dashboard và module NKBV. */
export const NAV_GATE_DASHBOARD_NKBV: NavGate = {
  id: "dash-nkbv",
  moduleKeys: ["DASHBOARD", "GIAM_SAT_NKBV"],
  requireEveryView: true,
};
export const NAV_GATE_VST: NavGate = { id: "vst", moduleKeys: ["GIAM_SAT_VST"] };
export const NAV_GATE_GSC: NavGate = { id: "gsc", moduleKeys: ["GIAM_SAT_CHUNG"] };
export const NAV_GATE_NKBV: NavGate = { id: "nkbv", moduleKeys: ["GIAM_SAT_NKBV"] };
export const NAV_GATE_CONG_VIEC: NavGate = { id: "cv", moduleKeys: ["CONG_VIEC"] };
export const NAV_GATE_CSSD: NavGate = {
  id: "cssd",
  moduleKeys: ["CSSD_WORKFLOW", "CSSD_KHO_DUNGCU", "CSSD_REPORT", "KSNK_KHO_HOACHAT"],
};
/** OR: giống `canSeeQuanTriSection` — user chỉ có NHAN_SU vẫn cần mục Quản trị (vào hub /nhan-su). */
export const NAV_GATE_QUAN_TRI: NavGate = { id: "qt", moduleKeys: ["DANH_MUC", "PHAN_QUYEN", "NHAN_SU"] };
export const NAV_GATE_DM_HUB: NavGate = { id: "dmhub", moduleKeys: ["DANH_MUC"] };

export function canSeeNavGate(
  isAdmin: boolean,
  canView: (module: string) => boolean,
  gate: NavGate,
): boolean {
  if (isAdmin) return true;
  if (gate.requireEveryView) {
    return gate.moduleKeys.length > 0 && gate.moduleKeys.every((k) => canView(k));
  }
  return gate.moduleKeys.some((k) => canView(k));
}

export function canSeeQuanTriSection(isAdmin: boolean, canView: (module: string) => boolean): boolean {
  return isAdmin || canView("DANH_MUC") || canView("PHAN_QUYEN") || canView("NHAN_SU");
}
