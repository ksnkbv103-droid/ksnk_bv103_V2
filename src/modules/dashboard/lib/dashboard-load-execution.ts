import { getDashboardSummaryTable, getDashboardKhoaOverviewRows } from "../actions/compliance-dashboard.actions";
import { getOverviewDashboardBundle } from "../actions/overview-dashboard-bundle.actions";
import { fetchKsnkStaffSupervisionForOverview } from "../actions/dashboard-ksnk-staff-stats.actions";
import { getDashboardGapBundle } from "../actions/gap-dashboard-bundle.actions";
import type { DashboardSummaryRow, DashboardKhoaOverviewRow, DashboardKsnkStaffSupervisionRow } from "../compliance-dashboard.types";
import type { ComplianceDashboardPayload } from "../compliance-dashboard.types";
import type { VstDashboardPayload } from "@/modules/giam-sat-vst/actions/vst-dashboard.types";
import {
  mergeParticipationRows,
  pickBangKiemOptionIdsWithSessionData,
  sortedJoinIds,
} from "./dashboard-hook-helpers";
import { buildComplianceGapMap } from "./build-compliance-gap-map";
import type { DashboardTabType } from "../hooks/dashboard-types";
import type { OverviewDashboardBundleInput } from "../actions/overview-dashboard-bundle.actions";

type FetchFn = (
  sType: "ALL" | "KSNK" | "CHEO" | "TU_GIAM_SAT",
  bangKiemOverride?: string[],
) => Promise<{ vst: VstDashboardPayload | null; gsc: Record<string, ComplianceDashboardPayload> }>;

export type DashboardLoadInput = {
  tuNgay: string;
  denNgay: string;
  selectedKhoiIds: string[];
  selectedKhoaIds: string[];
  selectedNgheIds: string[];
  selectedKhuVucIds: string[];
  selectedBangKiemMas: string[];
  filterOptions: ComplianceDashboardPayload["options"] | null;
  activeTab: DashboardTabType;
  fetchPayloadsForType: FetchFn;
  /** Tham số filter cho bundle overview (1 POST thay vì 2× fetch client). */
  overviewBundleArgs?: OverviewDashboardBundleInput | null;
  /** Tham số filter cho bundle gap (1 POST thay vì 3× fetch client). */
  gapBundleArgs?: OverviewDashboardBundleInput | null;
  /** Quyền widget Command Center — khớp `useDashboardCommandCenterWidgets`. */
  widgetAccess?: {
    overview: boolean;
    supervision: boolean;
    gap: boolean;
  };
};

export type DashboardLoadResult = {
  summaryRows: DashboardSummaryRow[];
  khoaOverviewRows: DashboardKhoaOverviewRow[];
  nextBangKiemSelection: string[] | null;
  vst: VstDashboardPayload | null;
  gsc: Record<string, ComplianceDashboardPayload>;
  vstGap: { kq: VstDashboardPayload | null; cheo: VstDashboardPayload | null; tgs: VstDashboardPayload | null } | null;
  complianceGap: Record<
    string,
    { kq: ComplianceDashboardPayload; cheo: ComplianceDashboardPayload; tgs: ComplianceDashboardPayload }
  > | null;
  tuGiamSatParticipation: ReturnType<typeof mergeParticipationRows>;
  ksnkStaffSupervision: DashboardKsnkStaffSupervisionRow[];
  showKsnkStaffWorkload: boolean;
};

export async function executeDashboardLoad(input: DashboardLoadInput): Promise<DashboardLoadResult> {
  const wa = input.widgetAccess ?? { overview: true, supervision: true, gap: true };

  const summaryPromise = getDashboardSummaryTable({
    tu_ngay: input.tuNgay,
    den_ngay: input.denNgay,
    khoi_ids: input.selectedKhoiIds.length ? input.selectedKhoiIds : undefined,
    khoa_ids: input.selectedKhoaIds.length ? input.selectedKhoaIds : undefined,
  });

  /** Bảng theo khoa (Tự GS) cần dữ liệu ở tab Cơ cấu nguồn và tab Tự giám sát — không gắn chỉ `overview` (trước đây chuyển tab làm rỗng bảng). */
  const shouldLoadKhoaOverview =
    (input.activeTab === "overview" && wa.overview) || (input.activeTab === "tu_giam_sat" && wa.supervision);

  const khoaOverviewPromise = shouldLoadKhoaOverview
    ? getDashboardKhoaOverviewRows({
        tu_ngay: input.tuNgay,
        den_ngay: input.denNgay,
        selectedKhoiIds: input.selectedKhoiIds,
        selectedKhoaIds: input.selectedKhoaIds,
        selectedNgheIds: input.selectedNgheIds,
        selectedKhuVucIds: input.selectedKhuVucIds,
        khoiOptionCount: input.filterOptions?.khoi?.length ?? 0,
        khoaOptionCount: input.filterOptions?.khoa?.length ?? 0,
        ngheOptionCount: input.filterOptions?.nghe_nghiep?.length ?? 0,
        khuOptionCount: input.filterOptions?.khu_vuc?.length ?? 0,
      })
    : Promise.resolve({ success: true as const, data: [] as DashboardKhoaOverviewRow[] });

  const [summaryRes, khoaOverviewRes] = await Promise.all([summaryPromise, khoaOverviewPromise]);

  const summaryRows = summaryRes.success ? summaryRes.data : [];
  const khoaOverviewRows =
    khoaOverviewRes.success ? khoaOverviewRes.data : [];

  let bangKiemForFetch =
    input.selectedBangKiemMas.length > 0 ? input.selectedBangKiemMas : ["VST_WHO"];
  let nextBangKiemSelection: string[] | null = null;
  if (input.filterOptions?.bang_kiem?.length && summaryRows.length > 0) {
    const withData = pickBangKiemOptionIdsWithSessionData(input.filterOptions.bang_kiem, summaryRows);
    if (withData.length > 0) {
      bangKiemForFetch = withData;
      nextBangKiemSelection = withData;
    }
  }

  let vst: VstDashboardPayload | null = null;
  let gsc: Record<string, ComplianceDashboardPayload> = {};
  let vstGap: DashboardLoadResult["vstGap"] = null;
  let complianceGap: DashboardLoadResult["complianceGap"] = null;
  let tuGiamSatParticipation: DashboardLoadResult["tuGiamSatParticipation"] = [];
  let ksnkStaffSupervision: DashboardKsnkStaffSupervisionRow[] = [];
  let showKsnkStaffWorkload = false;

  if (input.activeTab === "overview" || input.activeTab === "ksnk" || input.activeTab === "cheo" || input.activeTab === "tu_giam_sat") {
    const tabToType = { overview: "ALL", ksnk: "KSNK", cheo: "CHEO", tu_giam_sat: "TU_GIAM_SAT" } as const;
    if (input.activeTab === "overview") {
      if (wa.overview) {
        if (input.overviewBundleArgs) {
          const bundle = await getOverviewDashboardBundle({
            ...input.overviewBundleArgs,
            bangKiemOverride: bangKiemForFetch,
          });
          vst = bundle.vst;
          gsc = bundle.gsc;
          tuGiamSatParticipation = bundle.tuGiamSatParticipation;
          ksnkStaffSupervision = bundle.ksnkStaffSupervision;
          showKsnkStaffWorkload = bundle.showKsnkStaffWorkload;
        } else {
          const [res, tgs, ksnkBundle] = await Promise.all([
            input.fetchPayloadsForType("ALL", bangKiemForFetch),
            input.fetchPayloadsForType("TU_GIAM_SAT", bangKiemForFetch),
            fetchKsnkStaffSupervisionForOverview({
              selectedBangKiemMas: input.selectedBangKiemMas,
              selectedKhoiIds: input.selectedKhoiIds,
              selectedKhoaIds: input.selectedKhoaIds,
              selectedNgheIds: input.selectedNgheIds,
              selectedKhuVucIds: input.selectedKhuVucIds,
              tuNgay: input.tuNgay,
              denNgay: input.denNgay,
              khoiOptionCount: input.filterOptions?.khoi?.length ?? 0,
              khoaOptionCount: input.filterOptions?.khoa?.length ?? 0,
              ngheOptionCount: input.filterOptions?.nghe_nghiep?.length ?? 0,
              khuOptionCount: input.filterOptions?.khu_vuc?.length ?? 0,
            }),
          ]);
          vst = res.vst;
          gsc = res.gsc;
          tuGiamSatParticipation = mergeParticipationRows(tgs.vst, tgs.gsc);
          ksnkStaffSupervision = ksnkBundle.rows;
          showKsnkStaffWorkload = ksnkBundle.showKsnkStaffWorkload;
        }
      }
    } else if (wa.supervision) {
      const res = await input.fetchPayloadsForType(tabToType[input.activeTab], bangKiemForFetch);
      vst = res.vst;
      gsc = res.gsc;
    }
  } else if (input.activeTab === "gap") {
    if (wa.gap) {
      if (input.gapBundleArgs) {
        const gap = await getDashboardGapBundle({
          ...input.gapBundleArgs,
          bangKiemOverride: bangKiemForFetch,
        });
        vstGap = gap.vstGap;
        complianceGap = gap.complianceGap;
      } else {
        const [resKq, resCheo, resTgs] = await Promise.all([
          input.fetchPayloadsForType("KSNK", bangKiemForFetch),
          input.fetchPayloadsForType("CHEO", bangKiemForFetch),
          input.fetchPayloadsForType("TU_GIAM_SAT", bangKiemForFetch),
        ]);
        vstGap = { kq: resKq.vst, cheo: resCheo.vst, tgs: resTgs.vst };
        complianceGap = buildComplianceGapMap(resKq, resCheo, resTgs, input.tuNgay, input.denNgay);
      }
    }
  }

  return {
    summaryRows,
    khoaOverviewRows,
    nextBangKiemSelection,
    vst,
    gsc,
    vstGap,
    complianceGap,
    tuGiamSatParticipation,
    ksnkStaffSupervision,
    showKsnkStaffWorkload,
  };
}

export function shouldUpdateBangKiemSelection(prev: string[], next: string[]): boolean {
  return sortedJoinIds(prev) !== sortedJoinIds(next);
}
