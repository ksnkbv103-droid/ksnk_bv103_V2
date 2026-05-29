/** Pure helpers dùng chung filter analytics (Command Center + module tabs). */

export function sortedJoinIds(ids: string[]): string {
  return [...ids].sort().join("\u0001");
}

/** Trả mảng filter hoặc null nếu chọn hết (= không lọc). */
export function effectiveFilterIds(arr: string[], totalCount: number): string[] | null {
  if (arr.length === 0 || arr.length >= totalCount) return null;
  return arr;
}

/** Thu hẹp khoa đã chọn khi đổi khối — tránh gửi RPC khoa ngoài khối. */
export function pruneKhoaIdsForKhoiSelection(
  selectedKhoaIds: string[],
  selectedKhoiIds: string[],
  khoaOptions: { id: string; khoi_id?: string }[],
  khoiOptionCount: number,
): string[] {
  if (khoiOptionCount === 0 || khoaOptions.length === 0) return selectedKhoaIds;
  const allKhoi = selectedKhoiIds.length === 0 || selectedKhoiIds.length >= khoiOptionCount;
  if (allKhoi) return selectedKhoaIds;

  const allowed = new Set(
    khoaOptions.filter((k) => k.khoi_id && selectedKhoiIds.includes(k.khoi_id)).map((k) => k.id),
  );
  const pruned = selectedKhoaIds.filter((id) => allowed.has(id));
  if (pruned.length > 0) return pruned;
  return [...allowed];
}

export type AnalyticsFilterInput = {
  tu_ngay: string;
  den_ngay: string;
  khoi_ids?: string[];
  khoa_ids?: string[];
  nghe_nghiep_ids?: string[];
  khu_vuc_ids?: string[];
  hinh_thuc_ids?: string[];
  bang_kiem_mas?: string[];
};

export function buildAnalyticsFilterPayload(args: {
  tuNgay: string;
  denNgay: string;
  selectedKhoiIds: string[];
  selectedKhoaIds: string[];
  selectedNgheIds: string[];
  selectedKhuVucIds: string[];
  selectedHinhThucIds: string[];
  selectedBangKiemMas: string[];
  khoiOptionCount: number;
  khoaOptionCount: number;
  ngheOptionCount: number;
  khuOptionCount: number;
}): AnalyticsFilterInput {
  return {
    tu_ngay: args.tuNgay,
    den_ngay: args.denNgay,
    khoi_ids: effectiveFilterIds(args.selectedKhoiIds, args.khoiOptionCount) ?? undefined,
    khoa_ids: effectiveFilterIds(args.selectedKhoaIds, args.khoaOptionCount) ?? undefined,
    nghe_nghiep_ids: effectiveFilterIds(args.selectedNgheIds, args.ngheOptionCount) ?? undefined,
    khu_vuc_ids: effectiveFilterIds(args.selectedKhuVucIds, args.khuOptionCount) ?? undefined,
    hinh_thuc_ids: args.selectedHinhThucIds.length > 0 ? args.selectedHinhThucIds : undefined,
    bang_kiem_mas: args.selectedBangKiemMas.length > 0 ? args.selectedBangKiemMas : undefined,
  };
}
