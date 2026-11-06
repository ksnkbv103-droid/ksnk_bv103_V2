import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VstStrategicPayload } from "../types/vst-strategic.types";
import { fetchStrategicAnalytics } from "@/lib/analytics/strategic-analytics-fetch";
import { useAnalyticsFilterPayload } from "@/lib/analytics/use-analytics-filter-payload";
import { useAnalyticsFilters } from "@/lib/analytics/use-analytics-filters";
import {
  hinhThucIdsForLens,
  type SupervisionSourceLens,
} from "@/lib/analytics/supervision-source-lens";

export function useVstAnalyticsData() {
  const filters = useAnalyticsFilters("vst");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payload, setPayload] = useState<VstStrategicPayload | null>(null);
  const [sourceLens, setSourceLens] = useState<SupervisionSourceLens>("ksnk");
  const lensHinhThucIds = useMemo(() => hinhThucIdsForLens(sourceLens), [sourceLens]);

  const filterPayload = useAnalyticsFilterPayload(filters, {
    hinhThucIdsOverride: lensHinhThucIds,
  });

  const seqRef = useRef(0);

  const loadAnalytics = useCallback(async () => {
    if (!filters.initDone) return;
    const currentSeq = ++seqRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const { vst: res } = await fetchStrategicAnalytics(filterPayload(), ["vst"]);
      if (currentSeq !== seqRef.current) return;
      if (!res) {
        setLoadError("Không nhận được phản hồi thống kê VST.");
        return;
      }
      if (res.success) setPayload(res.data);
      else setLoadError(res.error);
    } catch (err) {
      if (currentSeq !== seqRef.current) return;
      setLoadError(err instanceof Error ? err.message : "Có lỗi khi tải thống kê VST");
    } finally {
      if (currentSeq === seqRef.current) {
        setLoading(false);
      }
    }
  }, [filters.initDone, filterPayload]);

  const loadRef = useRef(loadAnalytics);
  useEffect(() => {
    loadRef.current = loadAnalytics;
  }, [loadAnalytics]);

  useEffect(() => {
    if (filters.initDone) void loadRef.current();
  }, [filters.initDone, loadAnalytics]);

  return {
    ...filters,
    loading,
    loadError,
    payload,
    loadAnalytics,
    sourceLens,
    setSourceLens,
  };
}
