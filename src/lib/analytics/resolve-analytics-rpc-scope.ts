import type { ActorKsnkScope } from "@/lib/actor-ksnk-scope.types";
import type { AnalyticsShellContext } from "@/modules/dashboard/lib/dashboard-command-center-access";

export type AnalyticsRpcFilterInput = {
  khoi_ids?: string[];
  khoa_ids?: string[];
  nghe_nghiep_ids?: string[];
  khu_vuc_ids?: string[];
  hinh_thuc_ids?: string[];
};

export type AnalyticsRpcFilterArgs = {
  p_khoi_ids: string[] | null;
  p_khoa_ids: string[] | null;
  p_nghe_nghiep_ids: string[] | null;
  p_khu_vuc_ids: string[] | null;
  p_hinh_thuc_ids: string[] | null;
};

function pickIds(ids: string[] | undefined): string[] | null {
  return ids && ids.length > 0 ? ids : null;
}

/**
 * SSOT phạm vi RPC strategic analytics.
 * - Tab Thống kê (`vst` / `gsc`): tôn trọng bộ lọc client (mạng lưới + khách so sánh toàn viện).
 * - Command Center: mạng lưới vẫn khóa khoa nếu gọi (họ không có quyền vào CC).
 */
export function resolveAnalyticsRpcFilters(
  scope: ActorKsnkScope,
  filters: AnalyticsRpcFilterInput,
  shell: AnalyticsShellContext,
): AnalyticsRpcFilterArgs {
  const thongKeShell = shell === "vst" || shell === "gsc";
  if (thongKeShell || scope.isGuestStatsOnly) {
    return {
      p_khoi_ids: pickIds(filters.khoi_ids),
      p_khoa_ids: pickIds(filters.khoa_ids),
      p_nghe_nghiep_ids: pickIds(filters.nghe_nghiep_ids),
      p_khu_vuc_ids: pickIds(filters.khu_vuc_ids),
      p_hinh_thuc_ids: pickIds(filters.hinh_thuc_ids),
    };
  }

  const lockNetwork =
    scope.isMangLuoiKsnk && !scope.isAdmin && !scope.isNhanVienKsnk && Boolean(scope.actorKhoaId);
  if (lockNetwork) {
    return {
      p_khoi_ids: null,
      p_khoa_ids: [scope.actorKhoaId!],
      p_nghe_nghiep_ids: null,
      p_khu_vuc_ids: null,
      p_hinh_thuc_ids: null,
    };
  }

  return {
    p_khoi_ids: pickIds(filters.khoi_ids),
    p_khoa_ids: pickIds(filters.khoa_ids),
    p_nghe_nghiep_ids: pickIds(filters.nghe_nghiep_ids),
    p_khu_vuc_ids: pickIds(filters.khu_vuc_ids),
    p_hinh_thuc_ids: pickIds(filters.hinh_thuc_ids),
  };
}

/** UI khóa bộ lọc khoa — chỉ khi CC và mạng lưới (không áp Thống kê). */
export function resolveAnalyticsKhoaFilterLocked(
  scope: ActorKsnkScope,
  shell: AnalyticsShellContext,
): boolean {
  if (shell === "vst" || shell === "gsc" || scope.isGuestStatsOnly) return false;
  return (
    scope.isMangLuoiKsnk && !scope.isAdmin && !scope.isNhanVienKsnk && Boolean(scope.actorKhoaId)
  );
}
