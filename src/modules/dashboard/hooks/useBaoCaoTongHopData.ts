import { useCallback, useEffect, useRef, useState } from "react";
import { buildAnalyticsFilterPayload } from "@/lib/analytics/filter-helpers";
import { useAnalyticsFilters } from "@/lib/analytics/use-analytics-filters";
import { getBaoCaoTongHopAnalytics } from "../actions/bao-cao-tong-hop.actions";
import type { BaoCaoChuyenDe, BaoCaoTongHopPayload } from "../types/bao-cao-tong-hop.types";

export function useBaoCaoTongHopData() {
  const filters = useAnalyticsFilters();
  const [chuyenDe, setChuyenDe] = useState<BaoCaoChuyenDe>("ALL");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payload, setPayload] = useState<BaoCaoTongHopPayload | null>(null);

  const filterPayload = useCallback(
    () =>
      buildAnalyticsFilterPayload({
        tuNgay: filters.tuNgay,
        denNgay: filters.denNgay,
        selectedKhoiIds: filters.selectedKhoiIds,
        selectedKhoaIds: filters.selectedKhoaIds,
        selectedNgheIds: filters.selectedNgheIds,
        selectedKhuVucIds: filters.selectedKhuVucIds,
        selectedHinhThucIds: filters.selectedHinhThucIds,
        selectedBangKiemMas: filters.selectedBangKiemMas,
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
      filters.selectedBangKiemMas,
      filters.khoiOptions.length,
      filters.khoaOptions.length,
      filters.ngheOptions.length,
      filters.khuVucOptions.length,
    ],
  );

  const loadReport = useCallback(async () => {
    if (!filters.initDone) return;
    setLoading(true);
    setLoadError(null);
    try {
      const fp = filterPayload();
      const res = await getBaoCaoTongHopAnalytics({ ...fp, chuyen_de: chuyenDe });
      if (res.success) setPayload(res.data);
      else {
        setPayload(null);
        setLoadError(res.error);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Có lỗi khi tải báo cáo tổng hợp");
    } finally {
      setLoading(false);
    }
  }, [filters.initDone, filterPayload, chuyenDe]);

  const loadRef = useRef(loadReport);
  useEffect(() => {
    loadRef.current = loadReport;
  }, [loadReport]);

  useEffect(() => {
    if (filters.initDone) void loadRef.current();
  }, [
    filters.initDone,
    filters.tuNgay,
    filters.denNgay,
    filters.selectedBangKiemMas,
    filters.selectedKhoiIds,
    filters.selectedKhoaIds,
    filters.selectedNgheIds,
    filters.selectedKhuVucIds,
    filters.selectedHinhThucIds,
    chuyenDe,
    loadReport,
  ]);

  return {
    ...filters,
    chuyenDe,
    setChuyenDe,
    loading,
    loadError,
    payload,
    loadReport,
  };
}
