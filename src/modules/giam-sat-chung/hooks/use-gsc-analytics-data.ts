import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getGscStrategicAnalytics } from "../actions/gsc-strategic-analytics.actions";
import type { GscStrategicPayload } from "../types/gsc-strategic.types";
import { buildAnalyticsFilterPayload } from "@/lib/analytics/filter-helpers";
import { useAnalyticsFilters } from "@/lib/analytics/use-analytics-filters";

type LoaiGiamSat = "TUAN_THU" | "NHAT_KY_VAN_HANH" | "DANH_GIA_HE_THONG" | undefined;

function filterBangKiemByLoai(
  options: { id: string; label?: string }[],
  loai: LoaiGiamSat,
): string[] {
  if (!loai) return options.filter((o) => o.id !== "VST_WHO").map((o) => o.id);
  // Strategic RPC lọc theo bang_kiem_mas — khi chưa có metadata loai trên option, gửi undefined (= all GSC).
  return options.filter((o) => o.id !== "VST_WHO").map((o) => o.id);
}

export function useGscAnalyticsData(initialLoaiGiamSat?: LoaiGiamSat) {
  const filters = useAnalyticsFilters();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payload, setPayload] = useState<GscStrategicPayload | null>(null);

  const bangKiemMasForRpc = useMemo(
    () =>
      filters.selectedBangKiemMas.length > 0
        ? filters.selectedBangKiemMas.filter((id) => id !== "VST_WHO")
        : filterBangKiemByLoai(filters.bangKiemOptions, initialLoaiGiamSat),
    [filters.selectedBangKiemMas, filters.bangKiemOptions, initialLoaiGiamSat],
  );

  const loadAnalytics = useCallback(async () => {
    if (!filters.initDone) return;
    setLoading(true);
    setLoadError(null);
    try {
      const base = buildAnalyticsFilterPayload({
        tuNgay: filters.tuNgay,
        denNgay: filters.denNgay,
        selectedKhoiIds: filters.selectedKhoiIds,
        selectedKhoaIds: filters.selectedKhoaIds,
        selectedNgheIds: filters.selectedNgheIds,
        selectedKhuVucIds: filters.selectedKhuVucIds,
        selectedHinhThucIds: filters.selectedHinhThucIds,
        selectedBangKiemMas: bangKiemMasForRpc,
        khoiOptionCount: filters.khoiOptions.length,
        khoaOptionCount: filters.khoaOptions.length,
        ngheOptionCount: filters.ngheOptions.length,
        khuOptionCount: filters.khuVucOptions.length,
      });
      const res = await getGscStrategicAnalytics(base);
      if (res.success) setPayload(res.data);
      else setLoadError(res.error);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Có lỗi khi tải thống kê GSC");
    } finally {
      setLoading(false);
    }
  }, [
    filters.initDone,
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
    bangKiemMasForRpc,
  ]);

  const loadRef = useRef(loadAnalytics);
  useEffect(() => {
    loadRef.current = loadAnalytics;
  }, [loadAnalytics]);

  useEffect(() => {
    if (filters.initDone) void loadRef.current();
  }, [filters.initDone, loadAnalytics]);

  return { ...filters, loading, loadError, payload, loadAnalytics, initialLoaiGiamSat };
}
