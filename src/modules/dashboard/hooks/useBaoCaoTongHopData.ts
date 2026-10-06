import { useCallback, useEffect, useRef, useState } from "react";
import { buildAnalyticsFilterPayload } from "@/lib/analytics/filter-helpers";
import {
  hinhThucIdsForLens,
  type SupervisionSourceLens,
} from "@/lib/analytics/supervision-source-lens";
import { useAnalyticsFilters } from "@/lib/analytics/use-analytics-filters";
import { getBaoCaoTongHopAnalytics } from "../actions/bao-cao-tong-hop.actions";
import type { BaoCaoChuyenDe, BaoCaoTongHopPayload } from "../types/bao-cao-tong-hop.types";
import { createLoadRequestGuard } from "./bao-cao-tong-hop-load-guard";

export function useBaoCaoTongHopData() {
  const filters = useAnalyticsFilters();
  const [chuyenDe, setChuyenDe] = useState<BaoCaoChuyenDe>("ALL");
  /** BCTH-03: lens riêng từng khối — mặc định KSNK (GS-02). */
  const [vstLens, setVstLens] = useState<SupervisionSourceLens>("ksnk");
  const [gscLens, setGscLens] = useState<SupervisionSourceLens>("ksnk");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payload, setPayload] = useState<BaoCaoTongHopPayload | null>(null);
  const requestGuardRef = useRef(createLoadRequestGuard());

  const filterPayload = useCallback(() => {
    const base = buildAnalyticsFilterPayload({
      tuNgay: filters.tuNgay,
      denNgay: filters.denNgay,
      selectedKhoiIds: filters.selectedKhoiIds,
      selectedKhoaIds: filters.selectedKhoaIds,
      selectedNgheIds: filters.selectedNgheIds,
      selectedKhuVucIds: filters.selectedKhuVucIds,
      selectedHinhThucIds: [],
      selectedBangKiemMas: filters.selectedBangKiemMas,
      khoiOptionCount: filters.khoiOptions.length,
      khoaOptionCount: filters.khoaOptions.length,
      ngheOptionCount: filters.ngheOptions.length,
      khuOptionCount: filters.khuVucOptions.length,
    });
    return {
      ...base,
      hinh_thuc_ids_vst: hinhThucIdsForLens(vstLens),
      hinh_thuc_ids_gsc: hinhThucIdsForLens(gscLens),
    };
  }, [
    filters.tuNgay,
    filters.denNgay,
    filters.selectedKhoiIds,
    filters.selectedKhoaIds,
    filters.selectedNgheIds,
    filters.selectedKhuVucIds,
    filters.selectedBangKiemMas,
    filters.khoiOptions.length,
    filters.khoaOptions.length,
    filters.ngheOptions.length,
    filters.khuVucOptions.length,
    vstLens,
    gscLens,
  ]);

  const loadReport = useCallback(async () => {
    if (!filters.initDone) return;
    const requestId = requestGuardRef.current.begin();
    setLoading(true);
    setLoadError(null);
    try {
      const fp = filterPayload();
      const res = await getBaoCaoTongHopAnalytics({ ...fp, chuyen_de: chuyenDe });
      if (!requestGuardRef.current.isCurrent(requestId)) return;
      if (res.success) setPayload(res.data);
      else {
        setPayload(null);
        setLoadError(res.error);
      }
    } catch (err) {
      if (!requestGuardRef.current.isCurrent(requestId)) return;
      setLoadError(err instanceof Error ? err.message : "Có lỗi khi tải báo cáo tổng hợp");
    } finally {
      if (requestGuardRef.current.isCurrent(requestId)) setLoading(false);
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
    vstLens,
    gscLens,
    chuyenDe,
    loadReport,
  ]);

  return {
    ...filters,
    chuyenDe,
    setChuyenDe,
    vstLens,
    setVstLens,
    gscLens,
    setGscLens,
    loading,
    loadError,
    payload,
    loadReport,
  };
}
