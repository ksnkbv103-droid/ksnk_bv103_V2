import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import type { ComplianceDashboardPayload } from "../compliance-dashboard.types";
import type { VstDashboardPayload } from "@/modules/giam-sat-vst/actions/vst-dashboard.types";
import type {
  DashboardSummaryRow,
  DashboardKhoaOverviewRow,
  DashboardKsnkStaffSupervisionRow,
} from "../compliance-dashboard.types";
import { fetchDashboardPayloadsForSupervisionType } from "../lib/fetch-dashboard-payloads-for-type";
import { executeDashboardLoad, shouldUpdateBangKiemSelection } from "../lib/dashboard-load-execution";
import { pruneKhoaIdsForKhoiSelection } from "../lib/dashboard-hook-helpers";
import {
  buildDashboardFilterCacheKey,
  buildDashboardFilterKeyWithoutTab,
} from "../lib/dashboard-filter-cache-key";
import { applyDashboardLoadResult } from "../lib/dashboard-load-apply";
import type { DashboardTabType } from "./dashboard-types";
import type { DashboardLoadInput, DashboardLoadResult } from "../lib/dashboard-load-execution";

type GapCompliance = Record<
  string,
  { kq: ComplianceDashboardPayload; cheo: ComplianceDashboardPayload; tgs: ComplianceDashboardPayload }
>;

const TAB_CACHE_TTL_MS = 120_000;
const FILTER_DEBOUNCE_MS = 420;

type TabCacheEntry = {
  key: string;
  at: number;
  out: DashboardLoadResult;
};

export function useDashboardLoadCycle(args: {
  initDone: boolean;
  activeTab: DashboardTabType;
  tuNgay: string;
  denNgay: string;
  selectedBangKiemMas: string[];
  selectedKhoiIds: string[];
  selectedKhoaIds: string[];
  selectedNgheIds: string[];
  selectedKhuVucIds: string[];
  filterOptions: ComplianceDashboardPayload["options"] | null;
  khoiOptionCount: number;
  khoaOptionCount: number;
  ngheOptionCount: number;
  khuOptionCount: number;
  khoaOptions: { id: string; khoi_id?: string }[];
  setLoading: (v: boolean) => void;
  setLoadError: (v: string | null) => void;
  setSummaryTable: (v: DashboardSummaryRow[]) => void;
  setSelectedBangKiemMas: Dispatch<SetStateAction<string[]>>;
  setVstPayload: (v: VstDashboardPayload | null) => void;
  setCompliancePayloads: (v: Record<string, ComplianceDashboardPayload>) => void;
  setVstGapPayloads: (
    v: { kq: VstDashboardPayload | null; cheo: VstDashboardPayload | null; tgs: VstDashboardPayload | null } | null,
  ) => void;
  setComplianceGapPayloads: (v: GapCompliance) => void;
  setKsnkStaffSupervision: (v: DashboardKsnkStaffSupervisionRow[]) => void;
  setShowKsnkStaffWorkload: (v: boolean) => void;
  setKhoaOverviewRows: (v: DashboardKhoaOverviewRow[]) => void;
  widgetAccess: NonNullable<DashboardLoadInput["widgetAccess"]>;
}) {
  const {
    initDone,
    activeTab,
    tuNgay,
    denNgay,
    selectedBangKiemMas,
    selectedKhoiIds,
    selectedKhoaIds,
    selectedNgheIds,
    selectedKhuVucIds,
    filterOptions,
    khoiOptionCount,
    khoaOptionCount,
    ngheOptionCount,
    khuOptionCount,
    khoaOptions,
    setLoading,
    setLoadError,
    setSummaryTable,
    setSelectedBangKiemMas,
    setVstPayload,
    setCompliancePayloads,
    setVstGapPayloads,
    setComplianceGapPayloads,
    setKsnkStaffSupervision,
    setShowKsnkStaffWorkload,
    setKhoaOverviewRows,
    widgetAccess,
  } = args;

  const reqIdRef = useRef(0);
  const tabCacheRef = useRef<Partial<Record<DashboardTabType, TabCacheEntry>>>({});
  const filterKeyRef = useRef("");

  const prunedKhoaIds = useMemo(
    () => pruneKhoaIdsForKhoiSelection(selectedKhoaIds, selectedKhoiIds, khoaOptions, khoiOptionCount),
    [selectedKhoaIds, selectedKhoiIds, khoaOptions, khoiOptionCount],
  );

  const filterKeyWithoutTab = useMemo(
    () =>
      buildDashboardFilterKeyWithoutTab({
        tuNgay,
        denNgay,
        selectedBangKiemMas,
        selectedKhoiIds,
        selectedKhoaIds: prunedKhoaIds,
        selectedNgheIds,
        selectedKhuVucIds,
      }),
    [
      tuNgay,
      denNgay,
      selectedBangKiemMas,
      selectedKhoiIds,
      prunedKhoaIds,
      selectedNgheIds,
      selectedKhuVucIds,
    ],
  );

  const cacheKey = useMemo(
    () =>
      buildDashboardFilterCacheKey({
        tuNgay,
        denNgay,
        activeTab,
        selectedBangKiemMas,
        selectedKhoiIds,
        selectedKhoaIds: prunedKhoaIds,
        selectedNgheIds,
        selectedKhuVucIds,
      }),
    [
      tuNgay,
      denNgay,
      activeTab,
      selectedBangKiemMas,
      selectedKhoiIds,
      prunedKhoaIds,
      selectedNgheIds,
      selectedKhuVucIds,
    ],
  );

  const applySetters = useMemo(
    () => ({
      setSummaryTable,
      setKhoaOverviewRows,
      setVstPayload,
      setCompliancePayloads,
      setVstGapPayloads,
      setComplianceGapPayloads,
      setKsnkStaffSupervision,
      setShowKsnkStaffWorkload,
      setSelectedBangKiemMas,
      shouldUpdateBangKiemSelection,
    }),
    [
      setSummaryTable,
      setKhoaOverviewRows,
      setVstPayload,
      setCompliancePayloads,
      setVstGapPayloads,
      setComplianceGapPayloads,
      setKsnkStaffSupervision,
      setShowKsnkStaffWorkload,
      setSelectedBangKiemMas,
    ],
  );

  const fetchPayloadsForType = useCallback(
    async (sType: "ALL" | "KSNK" | "CHEO" | "TU_GIAM_SAT", bangKiemOverride?: string[]) =>
      fetchDashboardPayloadsForSupervisionType({
        sType,
        bangKiemOverride,
        selectedBangKiemMas,
        selectedKhoiIds,
        selectedKhoaIds: prunedKhoaIds,
        selectedNgheIds,
        selectedKhuVucIds,
        tuNgay,
        denNgay,
        khoiOptionCount,
        khoaOptionCount,
        ngheOptionCount,
        khuOptionCount,
      }),
    [
      selectedBangKiemMas,
      selectedKhoiIds,
      prunedKhoaIds,
      selectedNgheIds,
      selectedKhuVucIds,
      tuNgay,
      denNgay,
      khoiOptionCount,
      khoaOptionCount,
      ngheOptionCount,
      khuOptionCount,
    ],
  );

  const loadDashboard = useCallback(
    async (opts?: { force?: boolean; useCache?: boolean }) => {
      if (!initDone) return;

      const useCache = opts?.useCache !== false;
      const cached = tabCacheRef.current[activeTab];
      if (useCache && !opts?.force && cached && cached.key === cacheKey && Date.now() - cached.at < TAB_CACHE_TTL_MS) {
        applyDashboardLoadResult(cached.out, applySetters);
        setLoadError(cached.out.errors.length > 0 ? cached.out.errors.join(" · ") : null);
        return;
      }

      const reqId = ++reqIdRef.current;
      setLoading(true);
      setLoadError(null);
      try {
        const sharedBundleArgs = {
          selectedBangKiemMas,
          selectedKhoiIds,
          selectedKhoaIds: prunedKhoaIds,
          selectedNgheIds,
          selectedKhuVucIds,
          tuNgay,
          denNgay,
          khoiOptionCount,
          khoaOptionCount,
          ngheOptionCount,
          khuOptionCount,
        };
        const out = await executeDashboardLoad({
          tuNgay,
          denNgay,
          selectedKhoiIds,
          selectedKhoaIds: prunedKhoaIds,
          selectedNgheIds,
          selectedKhuVucIds,
          selectedBangKiemMas,
          filterOptions,
          activeTab,
          fetchPayloadsForType,
          overviewBundleArgs: activeTab === "overview" && widgetAccess.overview ? sharedBundleArgs : null,
          gapBundleArgs: activeTab === "gap" && widgetAccess.gap ? sharedBundleArgs : null,
          widgetAccess,
        });
        if (reqId !== reqIdRef.current) return;

        tabCacheRef.current[activeTab] = { key: cacheKey, at: Date.now(), out };
        applyDashboardLoadResult(out, applySetters);
        setLoadError(out.errors.length > 0 ? out.errors.join(" · ") : null);
      } catch (err) {
        if (reqId !== reqIdRef.current) return;
        const msg = err instanceof Error ? err.message : "Không tải được dữ liệu dashboard.";
        setLoadError(msg);
        console.error("[Dashboard] loadDashboard error:", err);
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    },
    [
      initDone,
      activeTab,
      cacheKey,
      fetchPayloadsForType,
      tuNgay,
      denNgay,
      selectedKhoiIds,
      prunedKhoaIds,
      selectedBangKiemMas,
      selectedNgheIds,
      selectedKhuVucIds,
      filterOptions,
      khoiOptionCount,
      khoaOptionCount,
      ngheOptionCount,
      khuOptionCount,
      widgetAccess,
      applySetters,
      setLoading,
      setLoadError,
    ],
  );

  useEffect(() => {
    if (!initDone) return;
    void loadDashboard({ useCache: true });
  }, [initDone, activeTab, loadDashboard]);

  useEffect(() => {
    if (!initDone) return;
    const prev = filterKeyRef.current;
    if (prev === "") {
      filterKeyRef.current = filterKeyWithoutTab;
      return;
    }
    if (prev === filterKeyWithoutTab) return;
    filterKeyRef.current = filterKeyWithoutTab;
    tabCacheRef.current = {};
    const t = window.setTimeout(() => {
      void loadDashboard({ force: true, useCache: false });
    }, FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [initDone, filterKeyWithoutTab, loadDashboard]);

  return { loadDashboard, fetchPayloadsForType };
}
