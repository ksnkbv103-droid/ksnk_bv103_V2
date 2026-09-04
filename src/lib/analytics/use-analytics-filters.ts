"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { todayYmdInVn } from "@/lib/format-datetime-vi";
import { bv103DefaultTuNgayFromToday } from "@/lib/bv103-analytics-default-range";
import { supabase } from "@/lib/supabase";
import { getAnalyticsViewerScope, type AnalyticsViewerScope } from "@/modules/dashboard/actions/analytics-viewer-scope.actions";
import { getComplianceFilterOptions } from "@/modules/dashboard/actions/compliance-dashboard.actions";
import { resolveDashboardFilterUi } from "@/modules/dashboard/lib/resolve-dashboard-filter-ui";
import { pruneKhoaIdsForKhoiSelection, sortedJoinIds } from "@/lib/analytics/filter-helpers";
import {
  appendPreservedAnalyticsQueryKeys,
  buildAnalyticsUrlQuery,
  hasAnalyticsUrlSeed,
  isAnalyticsFilterPath,
  parseAnalyticsUrlSeed,
  preservedAnalyticsQuerySnapshot,
} from "@/lib/analytics/supervision-deep-link";
import type { DashboardFilterOptions } from "@/modules/dashboard/compliance-dashboard.types";
import type { AnalyticsShellContext } from "@/modules/dashboard/lib/dashboard-command-center-access";

function toBkLabelRecord(options: { id: string; label: string }[]): Record<string, string> {
  return Object.fromEntries(options.map((x) => [x.id, x.label] as const));
}

export function useAnalyticsFilters(shell: AnalyticsShellContext = "command-center") {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlSeed = useMemo(() => parseAnalyticsUrlSeed(searchParams), [searchParams]);
  const preservedQuerySnapshot = useMemo(
    () => preservedAnalyticsQuerySnapshot(searchParams),
    [searchParams],
  );
  const urlSeedAppliedRef = useRef(false);
  const urlSyncReadyRef = useRef(false);
  const [selectedBangKiemMas, setSelectedBangKiemMas] = useState<string[]>([]);
  const [selectedKhoiIds, setSelectedKhoiIds] = useState<string[]>([]);
  const [selectedKhoaIds, setSelectedKhoaIds] = useState<string[]>([]);
  const [selectedNgheIds, setSelectedNgheIds] = useState<string[]>([]);
  const [selectedKhuVucIds, setSelectedKhuVucIds] = useState<string[]>([]);
  const [selectedHinhThucIds, setSelectedHinhThucIds] = useState<string[]>([]);
  const [tuNgay, setTuNgay] = useState(() => bv103DefaultTuNgayFromToday());
  const [denNgay, setDenNgay] = useState(() => todayYmdInVn());
  const [filterOptions, setFilterOptions] = useState<DashboardFilterOptions | null>(null);
  const [viewerScope, setViewerScope] = useState<AnalyticsViewerScope | null>(null);
  const [initDone, setInitDone] = useState(false);
  const [filterInitError, setFilterInitError] = useState<string | null>(null);
  const filtersLoadedRef = useRef(false);

  const { bangKiemOptions, khoiOptions, khoaOptions, ngheOptions, khuVucOptions, bkLabelMap } =
    resolveDashboardFilterUi(filterOptions);
  const bkLabelRecord = useMemo(() => toBkLabelRecord(bangKiemOptions), [bangKiemOptions]);

  const khoaFilterLocked = Boolean(viewerScope?.isKhoaLocked && viewerScope.actorKhoaId);

  useEffect(() => {
    if (!initDone || khoiOptions.length === 0 || khoaFilterLocked) return;
    setSelectedKhoaIds((prev) => {
      const next = pruneKhoaIdsForKhoiSelection(prev, selectedKhoiIds, khoaOptions, khoiOptions.length);
      return sortedJoinIds(prev) === sortedJoinIds(next) ? prev : next;
    });
  }, [initDone, selectedKhoiIds, khoaOptions, khoiOptions.length, khoaFilterLocked]);

  useEffect(() => {
    if (!initDone || urlSeedAppliedRef.current || !hasAnalyticsUrlSeed(urlSeed)) return;
    urlSeedAppliedRef.current = true;
    if (urlSeed.tu_ngay) setTuNgay(urlSeed.tu_ngay);
    if (urlSeed.den_ngay) setDenNgay(urlSeed.den_ngay);
    if (urlSeed.khoa_ids?.length && !khoaFilterLocked) setSelectedKhoaIds(urlSeed.khoa_ids);
  }, [initDone, urlSeed, khoaFilterLocked]);

  useEffect(() => {
    if (!initDone || !isAnalyticsFilterPath(pathname)) return;

    if (!urlSyncReadyRef.current) {
      urlSyncReadyRef.current = true;
      if (hasAnalyticsUrlSeed(urlSeed)) return;
    }

    const allKhoaSelected =
      khoaOptions.length > 0 && selectedKhoaIds.length >= khoaOptions.length;
    const params = new URLSearchParams(
      buildAnalyticsUrlQuery({
        tu_ngay: tuNgay,
        den_ngay: denNgay,
        khoa_ids: allKhoaSelected || khoaFilterLocked ? undefined : selectedKhoaIds,
      }),
    );
    appendPreservedAnalyticsQueryKeys(params, searchParams);
    const q = params.toString();
    const nextUrl = q ? `${pathname}?${q}` : pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [
    initDone,
    pathname,
    tuNgay,
    denNgay,
    selectedKhoaIds,
    khoaOptions.length,
    khoaFilterLocked,
    urlSeed,
    preservedQuerySnapshot,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function initFilters() {
      if (cancelled || filtersLoadedRef.current) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;

      try {
        const [res, scopeRes] = await Promise.all([
          getComplianceFilterOptions(shell),
          getAnalyticsViewerScope(shell),
        ]);
        if (cancelled) return;
        if (scopeRes.success) setViewerScope(scopeRes.data);
        if (res.success) {
          setFilterInitError(null);
          setFilterOptions(res.data);
          setSelectedBangKiemMas([]);
          setSelectedHinhThucIds([]);
          setSelectedKhoiIds(res.data.khoi.map((x) => x.id));
          const scope = scopeRes.success ? scopeRes.data : null;
          if (scope?.isKhoaLocked && scope.actorKhoaId) {
            setSelectedKhoaIds([scope.actorKhoaId]);
            const myKhoa = res.data.khoa.find((k) => k.id === scope.actorKhoaId);
            if (myKhoa?.khoi_id) setSelectedKhoiIds([myKhoa.khoi_id]);
          } else {
            setSelectedKhoaIds(res.data.khoa.map((x) => x.id));
          }
          setSelectedNgheIds(res.data.nghe_nghiep.map((x) => x.id));
          setSelectedKhuVucIds(res.data.khu_vuc.map((x) => x.id));
          filtersLoadedRef.current = true;
          setInitDone(true);
        } else {
          setFilterInitError(res.error || "Không tải được bộ lọc thống kê.");
          setInitDone(true);
        }
      } catch (err) {
        console.error("[AnalyticsFilters] init error:", err);
        if (!cancelled) {
          setFilterInitError(err instanceof Error ? err.message : "Không tải được bộ lọc thống kê.");
          setInitDone(true);
        }
      }
    }

    void initFilters();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void initFilters();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [shell]);

  const lockedKhoaLabel = useMemo(() => {
    if (!viewerScope?.actorKhoaId) return null;
    return khoaOptions.find((k) => k.id === viewerScope.actorKhoaId)?.label ?? null;
  }, [khoaOptions, viewerScope]);

  return {
    selectedBangKiemMas,
    setSelectedBangKiemMas,
    selectedKhoiIds,
    setSelectedKhoiIds,
    selectedKhoaIds,
    setSelectedKhoaIds,
    selectedNgheIds,
    setSelectedNgheIds,
    selectedKhuVucIds,
    setSelectedKhuVucIds,
    selectedHinhThucIds,
    setSelectedHinhThucIds,
    tuNgay,
    setTuNgay,
    denNgay,
    setDenNgay,
    filterOptions,
    initDone,
    filterInitError,
    bangKiemOptions,
    khoiOptions,
    khoaOptions,
    ngheOptions,
    khuVucOptions,
    bkLabelMap,
    bkLabelRecord,
    khoaFilterLocked,
    lockedKhoaLabel,
    viewerScope,
  };
}
