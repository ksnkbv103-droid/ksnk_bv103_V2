import { useCallback, useEffect, useRef, useState } from "react";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import { fetchStrategicAnalytics } from "@/lib/analytics/strategic-analytics-fetch";
import { useAnalyticsFilterPayload } from "@/lib/analytics/use-analytics-filter-payload";
import { useAnalyticsFilters } from "@/lib/analytics/use-analytics-filters";
import { getQlcvQuaHanBrief, type QlcvQuaHanBrief } from "@/modules/quan-ly-cong-viec/actions/qlcv-brief.actions";

/** Command Center — 2 RPC strategic + việc quá hạn QLCV. */
export function useCommandCenterBriefData() {
  const filters = useAnalyticsFilters("command-center");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vstPayload, setVstPayload] = useState<VstStrategicPayload | null>(null);
  const [gscPayload, setGscPayload] = useState<GscStrategicPayload | null>(null);
  const [qlcvBrief, setQlcvBrief] = useState<QlcvQuaHanBrief | null>(null);

  const filterPayload = useAnalyticsFilterPayload(filters);

  const loadDashboard = useCallback(async () => {
    if (!filters.initDone) return;
    setLoading(true);
    setLoadError(null);
    setQlcvBrief(null);
    try {
      const fp = filterPayload();
      const [strategic, qlcvRes] = await Promise.all([
        fetchStrategicAnalytics(fp, ["vst", "gsc"]),
        getQlcvQuaHanBrief(8).then(
          (data) => ({ ok: true as const, data }),
          () => ({ ok: false as const, data: null }),
        ),
      ]);
      const vstRes = strategic.vst;
      const gscRes = strategic.gsc;
      if (qlcvRes.ok) {
        setQlcvBrief(qlcvRes.data);
      }
      if (vstRes?.success) setVstPayload(vstRes.data);
      else if (vstRes) console.error("[CommandCenter] VST:", vstRes.error);
      if (gscRes?.success) setGscPayload(gscRes.data);
      else if (gscRes) console.error("[CommandCenter] GSC:", gscRes.error);
      if (vstRes && gscRes && !vstRes.success && !gscRes.success) {
        setLoadError(vstRes.error || gscRes.error || "Không tải được dữ liệu");
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [filters.initDone, filterPayload]);

  const loadRef = useRef(loadDashboard);
  useEffect(() => {
    loadRef.current = loadDashboard;
  }, [loadDashboard]);

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
    loadDashboard,
  ]);

  return {
    ...filters,
    loading,
    loadError,
    vstPayload,
    gscPayload,
    loadDashboard,
    qlcvBrief,
  };
}
