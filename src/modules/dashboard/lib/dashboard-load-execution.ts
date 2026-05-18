import { getDashboardSummaryTable, getDashboardKhoaOverviewRows } from "../actions/compliance-dashboard.actions";
import { getOverviewDashboardBundle } from "../actions/overview-dashboard-bundle.actions";
import { getDashboardGapBundle } from "../actions/gap-dashboard-bundle.actions";
import type { DashboardSummaryRow, DashboardKhoaOverviewRow, DashboardKsnkStaffSupervisionRow } from "../compliance-dashboard.types";
import type { ComplianceDashboardPayload } from "../compliance-dashboard.types";
import type { VstDashboardPayload } from "@/modules/giam-sat-vst/actions/vst-dashboard.types";
import {
  effectiveFilterIds,
  narrowBangKiemMasForRpcBySummary,
  pickBangKiemMasWithDataForSupervision,
  pickBangKiemOptionIdsWithSessionData,
  sortedJoinIds,
  tabToSummarySessionMetric,
} from "./dashboard-hook-helpers";
import type { DashboardTabType } from "../hooks/dashboard-types";
import type { OverviewDashboardBundleInput } from "../actions/overview-dashboard-bundle.actions";

type FetchFn = (
  sType: "ALL" | "KSNK" | "CHEO" | "TU_GIAM_SAT",
  bangKiemOverride?: string[],
) => Promise<{
  vst: VstDashboardPayload | null;
  gsc: Record<string, ComplianceDashboardPayload>;
  errors: string[];
}>;

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
  ksnkStaffSupervision: DashboardKsnkStaffSupervisionRow[];
  showKsnkStaffWorkload: boolean;
  errors: string[];
};

export async function executeDashboardLoad(input: DashboardLoadInput): Promise<DashboardLoadResult> {
  const wa = input.widgetAccess ?? { overview: true, supervision: true, gap: true };

  const khoiOptionCount = input.filterOptions?.khoi?.length ?? 0;
  const khoaOptionCount = input.filterOptions?.khoa?.length ?? 0;
  const effKhoi = effectiveFilterIds(input.selectedKhoiIds, khoiOptionCount);
  const effKhoa = effectiveFilterIds(input.selectedKhoaIds, khoaOptionCount);

  /** Bảng theo khoa (Tự GS) — chỉ tab cần hiển thị (tránh RPC thừa trên KSNK/chéo/gap). */
  const shouldLoadKhoaOverview =
    (input.activeTab === "overview" && wa.overview) || (input.activeTab === "tu_giam_sat" && wa.supervision);

  const needsSummaryForBk =
    input.activeTab === "overview" ||
    input.activeTab === "ksnk" ||
    input.activeTab === "cheo" ||
    input.activeTab === "tu_giam_sat" ||
    input.activeTab === "gap";

  const summaryPromise = needsSummaryForBk
    ? getDashboardSummaryTable({
        tu_ngay: input.tuNgay,
        den_ngay: input.denNgay,
        khoi_ids: effKhoi ?? undefined,
        khoa_ids: effKhoa ?? undefined,
      })
    : Promise.resolve({ success: true as const, data: [] as DashboardSummaryRow[] });

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

  const loadErrors: string[] = [];
  if (!summaryRes.success) loadErrors.push(`Bảng tổng hợp: ${summaryRes.error}`);
  if (!khoaOverviewRes.success) loadErrors.push(`Theo khoa: ${khoaOverviewRes.error}`);

  const summaryRows = summaryRes.success ? summaryRes.data : [];
  const khoaOverviewRows =
    khoaOverviewRes.success ? khoaOverviewRes.data : [];

  /** Luôn tôn trọng bảng kiểm người dùng đã chọn; chỉ auto-gợi ý khi chưa chọn (mảng rỗng). */
  let bangKiemForFetch =
    input.selectedBangKiemMas.length > 0 ? [...input.selectedBangKiemMas] : ["VST_WHO"];
  let nextBangKiemSelection: string[] | null = null;
  if (
    input.selectedBangKiemMas.length === 0 &&
    input.filterOptions?.bang_kiem?.length &&
    summaryRows.length > 0
  ) {
    const withData = pickBangKiemOptionIdsWithSessionData(
      input.filterOptions.bang_kiem,
      summaryRows,
      tabToSummarySessionMetric(input.activeTab),
    );
    if (withData.length > 0) {
      bangKiemForFetch = withData;
      nextBangKiemSelection = withData;
    }
  }

  const summaryHasCounts = summaryRows.some(
    (r) => (r.tong ?? 0) > 0 || (r.ksnk ?? 0) > 0 || (r.cheo ?? 0) > 0 || (r.tu_gs ?? 0) > 0,
  );

  /** Chỉ thu hẹp BK khi summary đã có số — tránh chặn RPC khi summary trống/lệch khóa. */
  if (summaryHasCounts && bangKiemForFetch.length > 1) {
    const narrowed = narrowBangKiemMasForRpcBySummary(bangKiemForFetch, summaryRows);
    if (narrowed.length > 0) bangKiemForFetch = narrowed;
  }

  let vst: VstDashboardPayload | null = null;
  let gsc: Record<string, ComplianceDashboardPayload> = {};
  let vstGap: DashboardLoadResult["vstGap"] = null;
  let complianceGap: DashboardLoadResult["complianceGap"] = null;
  let ksnkStaffSupervision: DashboardKsnkStaffSupervisionRow[] = [];
  let showKsnkStaffWorkload = false;

  if (input.activeTab === "overview" || input.activeTab === "ksnk" || input.activeTab === "cheo" || input.activeTab === "tu_giam_sat") {
    const tabToType = { overview: "ALL", ksnk: "KSNK", cheo: "CHEO", tu_giam_sat: "TU_GIAM_SAT" } as const;
    if (input.activeTab !== "overview" && summaryHasCounts) {
      const sType = tabToType[input.activeTab];
      const tabNarrowed = pickBangKiemMasWithDataForSupervision(bangKiemForFetch, summaryRows, sType);
      if (tabNarrowed.length > 0) bangKiemForFetch = tabNarrowed;
    }
    if (input.activeTab === "overview") {
      if (wa.overview) {
        const overviewInput: OverviewDashboardBundleInput =
          input.overviewBundleArgs ?? {
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
          };
        const bundle = await getOverviewDashboardBundle({
          ...overviewInput,
          bangKiemOverride: bangKiemForFetch,
        });
        vst = bundle.vst;
        gsc = bundle.gsc;
        ksnkStaffSupervision = bundle.ksnkStaffSupervision;
        showKsnkStaffWorkload = bundle.showKsnkStaffWorkload;
      }
    } else if (wa.supervision) {
      const toFetch =
        bangKiemForFetch.length > 0
          ? bangKiemForFetch
          : input.selectedBangKiemMas.length > 0
            ? input.selectedBangKiemMas
            : ["VST_WHO"];
      const res = await input.fetchPayloadsForType(tabToType[input.activeTab], toFetch);
      vst = res.vst;
      gsc = res.gsc;
      loadErrors.push(...res.errors);
    }
  } else if (input.activeTab === "gap") {
    if (wa.gap) {
      const gapInput: OverviewDashboardBundleInput =
        input.gapBundleArgs ?? {
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
        };
      const gap = await getDashboardGapBundle({
        ...gapInput,
        bangKiemOverride: bangKiemForFetch,
      });
      vstGap = gap.vstGap;
      complianceGap = gap.complianceGap;
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
    ksnkStaffSupervision,
    showKsnkStaffWorkload,
    errors: loadErrors,
  };
}

export function shouldUpdateBangKiemSelection(prev: string[], next: string[]): boolean {
  return sortedJoinIds(prev) !== sortedJoinIds(next);
}
