import { sortedJoinIds } from "@/lib/analytics/filter-helpers";

/** Khóa cache / dedupe — mọi tham số ảnh hưởng RPC dashboard. */
export function buildDashboardFilterCacheKey(input: {
  tuNgay: string;
  denNgay: string;
  activeTab: string;
  selectedBangKiemMas: string[];
  selectedKhoiIds: string[];
  selectedKhoaIds: string[];
  selectedNgheIds: string[];
  selectedKhuVucIds: string[];
}): string {
  return sortedJoinIds([
    input.tuNgay,
    input.denNgay,
    input.activeTab,
    ...input.selectedBangKiemMas,
    ...input.selectedKhoiIds,
    ...input.selectedKhoaIds,
    ...input.selectedNgheIds,
    ...input.selectedKhuVucIds,
  ]);
}

/** Khóa filter không gồm tab — debounce đổi lọc (tránh double-fetch khi đổi tab). */
export function buildDashboardFilterKeyWithoutTab(
  input: Omit<Parameters<typeof buildDashboardFilterCacheKey>[0], "activeTab">,
): string {
  return sortedJoinIds([
    input.tuNgay,
    input.denNgay,
    ...input.selectedBangKiemMas,
    ...input.selectedKhoiIds,
    ...input.selectedKhoaIds,
    ...input.selectedNgheIds,
    ...input.selectedKhuVucIds,
  ]);
}
