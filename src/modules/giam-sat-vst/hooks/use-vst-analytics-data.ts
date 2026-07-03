import { useCallback, useEffect, useRef, useState } from "react";
import type { VstStrategicPayload } from "../types/vst-strategic.types";
import { fetchStrategicAnalytics } from "@/lib/analytics/strategic-analytics-fetch";
import { useAnalyticsFilterPayload } from "@/lib/analytics/use-analytics-filter-payload";
import { useAnalyticsFilters } from "@/lib/analytics/use-analytics-filters";

export function useVstAnalyticsData() {
  const filters = useAnalyticsFilters("vst");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payload, setPayload] = useState<VstStrategicPayload | null>(null);

  const filterPayload = useAnalyticsFilterPayload(filters);

  const loadAnalytics = useCallback(async () => {
    if (!filters.initDone) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { vst: res } = await fetchStrategicAnalytics(filterPayload(), ["vst"]);
      if (!res) return;
      if (res.success) setPayload(res.data);
      else setLoadError(res.error);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Có lỗi khi tải thống kê VST");
    } finally {
      setLoading(false);
    }
  }, [filters.initDone, filterPayload]);

  const loadRef = useRef(loadAnalytics);
  useEffect(() => {
    loadRef.current = loadAnalytics;
  }, [loadAnalytics]);

  useEffect(() => {
    if (filters.initDone) void loadRef.current();
  }, [filters.initDone, loadAnalytics]);

  return { ...filters, loading, loadError, payload, loadAnalytics };
}
