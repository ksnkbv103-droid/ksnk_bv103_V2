import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import type { ComplianceDashboardPayload } from "../compliance-dashboard.types";
import type { VstDashboardPayload } from "@/modules/giam-sat-vst/actions/vst-dashboard.types";
import type { DashboardSummaryRow } from "../compliance-dashboard.types";
import { fetchDashboardPayloadsForSupervisionType } from "../lib/fetch-dashboard-payloads-for-type";
import { executeDashboardLoad, shouldUpdateBangKiemSelection } from "../lib/dashboard-load-execution";
import type { DashboardTabType } from "./dashboard-types";

type GapCompliance = Record<
  string,
  { kq: ComplianceDashboardPayload; cheo: ComplianceDashboardPayload; tgs: ComplianceDashboardPayload }
>;

type ParticipationRow = { id: string; ten: string; so_phien: number };

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
  setTuGiamSatParticipationByKhoa: (v: ParticipationRow[]) => void;
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
    setTuGiamSatParticipationByKhoa,
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

  const loadDashboard = useCallback(async () => {
    if (!initDone) return;
    setLoading(true);
    try {
      const sharedBundleArgs = {
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
      };
      const out = await executeDashboardLoad({
        tuNgay,
        denNgay,
        selectedKhoiIds,
        selectedKhoaIds,
        selectedBangKiemMas,
        filterOptions,
        activeTab,
        fetchPayloadsForType,
        overviewBundleArgs: activeTab === "overview" ? sharedBundleArgs : null,
        gapBundleArgs: activeTab === "gap" ? sharedBundleArgs : null,
      });
      setSummaryTable(out.summaryRows);
      if (out.nextBangKiemSelection) {
        const next = out.nextBangKiemSelection;
        setSelectedBangKiemMas((prev) => (shouldUpdateBangKiemSelection(prev, next) ? next : prev));
      }
      setVstPayload(out.vst);
      setCompliancePayloads(out.gsc);
      setVstGapPayloads(out.vstGap);
      setComplianceGapPayloads(out.complianceGap ?? {});
      setTuGiamSatParticipationByKhoa(out.tuGiamSatParticipation);
    } catch (err) {
      console.error("[Dashboard] loadDashboard error:", err);
    } finally {
      setLoading(false);
    }
  }, [
    initDone,
    activeTab,
    fetchPayloadsForType,
    tuNgay,
    denNgay,
    selectedKhoiIds,
    selectedKhoaIds,
    selectedBangKiemMas,
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
    setTuGiamSatParticipationByKhoa,
  ]);

  useEffect(() => {
    if (!initDone) return;
    void loadDashboard();
  }, [initDone, loadDashboard]);

  return { loadDashboard, fetchPayloadsForType };
}
