"use client";

import { useCallback } from "react";
import { buildAnalyticsFilterPayload } from "./filter-helpers";

/** Slice tối thiểu từ `useAnalyticsFilters()` cho build payload RPC strategic. */
export type AnalyticsFilterSlice = {
  tuNgay: string;
  denNgay: string;
  selectedKhoiIds: string[];
  selectedKhoaIds: string[];
  selectedNgheIds: string[];
  selectedKhuVucIds: string[];
  selectedHinhThucIds: string[];
  selectedBangKiemMas: string[];
  khoiOptions: readonly unknown[];
  khoaOptions: readonly unknown[];
  ngheOptions: readonly unknown[];
  khuVucOptions: readonly unknown[];
};

type Options = {
  /** GSC: loại bỏ VST_WHO hoặc lọc theo loại giám sát. */
  bangKiemMasOverride?: string[];
};

/** Stable ref — inline `[]` mỗi render làm đổi useCallback deps → loop fetch. */
const STABLE_EMPTY_BANG_KIEM: string[] = [];

/** SSOT build filter payload — dùng chung Command Center, GSC/VST analytics. */
export function useAnalyticsFilterPayload(filters: AnalyticsFilterSlice, options?: Options) {
  const override = options?.bangKiemMasOverride;
  const bangKiemMas =
    override === undefined
      ? filters.selectedBangKiemMas
      : override.length === 0
        ? STABLE_EMPTY_BANG_KIEM
        : override;

  return useCallback(
    () =>
      buildAnalyticsFilterPayload({
        tuNgay: filters.tuNgay,
        denNgay: filters.denNgay,
        selectedKhoiIds: filters.selectedKhoiIds,
        selectedKhoaIds: filters.selectedKhoaIds,
        selectedNgheIds: filters.selectedNgheIds,
        selectedKhuVucIds: filters.selectedKhuVucIds,
        selectedHinhThucIds: filters.selectedHinhThucIds,
        selectedBangKiemMas: bangKiemMas,
        khoiOptionCount: filters.khoiOptions.length,
        khoaOptionCount: filters.khoaOptions.length,
        ngheOptionCount: filters.ngheOptions.length,
        khuOptionCount: filters.khuVucOptions.length,
      }),
    [
      filters.tuNgay,
      filters.denNgay,
      filters.selectedKhoiIds,
      filters.selectedKhoaIds,
      filters.selectedNgheIds,
      filters.selectedKhuVucIds,
      filters.selectedHinhThucIds,
      filters.khoiOptions.length,
      filters.khoaOptions.length,
      filters.ngheOptions.length,
      filters.khuVucOptions.length,
      bangKiemMas,
    ],
  );
}
