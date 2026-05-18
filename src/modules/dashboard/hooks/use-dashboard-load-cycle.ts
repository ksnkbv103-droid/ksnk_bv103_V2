import { useCallback, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import type { ComplianceDashboardPayload } from "../compliance-dashboard.types";
import type { VstDashboardPayload } from "@/modules/giam-sat-vst/actions/vst-dashboard.types";
import type {
  DashboardSummaryRow,
  DashboardKhoaOverviewRow,
  DashboardKsnkStaffSupervisionRow,
} from "../compliance-dashboard.types";
import { fetchDashboardPayloadsForSupervisionType } from "../lib/fetch-dashboard-payloads-for-type";
import { executeDashboardLoad, shouldUpdateBangKiemSelection } from "../lib/dashboard-load-execution";
import type { DashboardTabType } from "./dashboard-types";
import type { DashboardLoadInput } from "../lib/dashboard-load-execution";
import { sortedJoinIds } from "../lib/dashboard-hook-helpers";
import { useDashboardBundleQuery } from "./use-dashboard-bundle-query";

type GapCompliance = Record<
  string,
  { kq: ComplianceDashboardPayload; cheo: ComplianceDashboardPayload; tgs: ComplianceDashboardPayload }
>;

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
  setLoading: (v: boolean) => void;
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
    setLoading,
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

  const fetchPayloadsForType = useCallback(
    async (sType: "ALL" | "KSNK" | "CHEO" | "TU_GIAM_SAT", bangKiemOverride?: string[]) =>
      fetchDashboardPayloadsForSupervisionType({
        sType,
        bangKiemOverride,
        selectedBangKiemMas,
        selectedKhoiIds,
        selectedKhoaIds,
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
      selectedKhoaIds,
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

  const sharedBundleArgs = useMemo(
    () => ({
      selectedBangKiemMas,
      selectedKhoiIds,
      selectedKhoaIds,
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
      selectedKhoaIds,
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

  const loadInput = useMemo((): DashboardLoadInput | null => {
    if (!initDone) return null;
    return {
      tuNgay,
      denNgay,
      selectedKhoiIds,
      selectedKhoaIds,
      selectedNgheIds,
      selectedKhuVucIds,
      selectedBangKiemMas,
      filterOptions,
      activeTab,
      fetchPayloadsForType,
      overviewBundleArgs: activeTab === "overview" && widgetAccess.overview ? sharedBundleArgs : null,
      gapBundleArgs: activeTab === "gap" && widgetAccess.gap ? sharedBundleArgs : null,
      widgetAccess,
    };
  }, [
    initDone,
    tuNgay,
    denNgay,
    selectedKhoiIds,
    selectedKhoaIds,
    selectedNgheIds,
    selectedKhuVucIds,
    selectedBangKiemMas,
    filterOptions,
    activeTab,
    fetchPayloadsForType,
    sharedBundleArgs,
    widgetAccess,
  ]);

  const queryKey = useMemo(
    () => ({
      activeTab,
      tuNgay,
      denNgay,
      bangKiem: sortedJoinIds(selectedBangKiemMas),
      khoi: sortedJoinIds(selectedKhoiIds),
      khoa: sortedJoinIds(selectedKhoaIds),
      nghe: sortedJoinIds(selectedNgheIds),
      khu: sortedJoinIds(selectedKhuVucIds),
    }),
    [
      activeTab,
      tuNgay,
      denNgay,
      selectedBangKiemMas,
      selectedKhoiIds,
      selectedKhoaIds,
      selectedNgheIds,
      selectedKhuVucIds,
    ],
  );

  const bundleQuery = useDashboardBundleQuery(queryKey, loadInput, initDone);

  useEffect(() => {
    setLoading(bundleQuery.isFetching);
  }, [bundleQuery.isFetching, setLoading]);

  useEffect(() => {
    const out = bundleQuery.data;
    if (!out) return;
    setSummaryTable(out.summaryRows);
    setKhoaOverviewRows(out.khoaOverviewRows);
    if (out.nextBangKiemSelection) {
      const next = out.nextBangKiemSelection;
      setSelectedBangKiemMas((prev) => (shouldUpdateBangKiemSelection(prev, next) ? next : prev));
    }
    setVstPayload(out.vst);
    setCompliancePayloads(out.gsc);
    setVstGapPayloads(out.vstGap);
    setComplianceGapPayloads(out.complianceGap ?? {});
    setKsnkStaffSupervision(out.ksnkStaffSupervision);
    setShowKsnkStaffWorkload(out.showKsnkStaffWorkload);
  }, [
    bundleQuery.data,
    setSummaryTable,
    setKhoaOverviewRows,
    setSelectedBangKiemMas,
    setVstPayload,
    setCompliancePayloads,
    setVstGapPayloads,
    setComplianceGapPayloads,
    setKsnkStaffSupervision,
    setShowKsnkStaffWorkload,
  ]);

  useEffect(() => {
    if (bundleQuery.error) {
      console.error("[Dashboard] loadDashboard error:", bundleQuery.error);
    }
  }, [bundleQuery.error]);

  const loadDashboard = useCallback(async () => {
    await bundleQuery.refetch();
  }, [bundleQuery]);

  return { loadDashboard, fetchPayloadsForType };
}
