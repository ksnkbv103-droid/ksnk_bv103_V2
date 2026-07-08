/** Điều hướng Form / Lịch sử / Thống kê — route canonical sau tái cấu trúc 2026-06. */

export type SupervisionHistoryModule = "vst" | "gsc";

const HISTORY_REFRESH_KEY: Record<SupervisionHistoryModule, string> = {
  vst: "bv103:vst:history-refresh",
  gsc: "bv103:gsc:history-refresh",
};

export const SUPERVISION_HISTORY_PATHS: Record<SupervisionHistoryModule, string> = {
  vst: "/lich-su/vst",
  gsc: "/lich-su/gsc",
};

export const SUPERVISION_ANALYTICS_PATHS: Record<SupervisionHistoryModule, string> = {
  vst: "/thong-ke/vst",
  gsc: "/thong-ke/gsc",
};

/** Gắn cờ để bảng lịch sử refetch khi mount (sau lưu phiên). */
export function markSupervisionHistoryStale(module: SupervisionHistoryModule): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(HISTORY_REFRESH_KEY[module], String(Date.now()));
  } catch {
    /* private mode */
  }
}

/** Đọc và xóa cờ refresh — chỉ gọi một lần khi mount bảng lịch sử. */
export function consumeSupervisionHistoryStale(module: SupervisionHistoryModule): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = HISTORY_REFRESH_KEY[module];
    const v = sessionStorage.getItem(key);
    if (!v) return false;
    sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Route form GSC theo pathname hiện tại (giữ sub-loại tuân thủ / nhật ký / hệ thống). */
export function resolveGscFormHref(pathname: string): string {
  if (pathname.startsWith("/giam-sat-chung/tuan-thu")) return "/giam-sat-chung/tuan-thu";
  if (pathname.startsWith("/giam-sat-chung/nhat-ky")) return "/giam-sat-chung/nhat-ky";
  if (pathname.startsWith("/giam-sat-chung/he-thong")) return "/giam-sat-chung/he-thong";
  return "/giam-sat-chung";
}
