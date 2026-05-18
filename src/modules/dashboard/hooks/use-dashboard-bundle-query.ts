"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { dashboardQueryStaleTimeMs } from "@/lib/bv103-feature-config";
import { executeDashboardLoad, type DashboardLoadInput, type DashboardLoadResult } from "../lib/dashboard-load-execution";

export type DashboardBundleQueryKey = {
  activeTab: string;
  tuNgay: string;
  denNgay: string;
  bangKiem: string;
  khoi: string;
  khoa: string;
  nghe: string;
  khu: string;
};

function buildDashboardQueryKey(input: DashboardBundleQueryKey): readonly string[] {
  return [
    "bv103-dashboard-bundle",
    input.activeTab,
    input.tuNgay,
    input.denNgay,
    input.bangKiem,
    input.khoi,
    input.khoa,
    input.nghe,
    input.khu,
  ] as const;
}

export function useDashboardBundleQuery(
  queryKey: DashboardBundleQueryKey,
  loadInput: DashboardLoadInput | null,
  enabled: boolean,
) {
  const key = buildDashboardQueryKey(queryKey);

  return useQuery({
    queryKey: key,
    enabled: enabled && loadInput != null,
    staleTime: dashboardQueryStaleTimeMs(),
    queryFn: async (): Promise<DashboardLoadResult> => {
      if (!loadInput) {
        throw new Error("Dashboard load input missing");
      }
      return executeDashboardLoad(loadInput);
    },
  });
}

export function useInvalidateDashboardBundle() {
  const qc = useQueryClient();
  return useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["bv103-dashboard-bundle"] });
  }, [qc]);
}
