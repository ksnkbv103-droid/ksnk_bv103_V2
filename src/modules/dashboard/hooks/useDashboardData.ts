import { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import { bv103DefaultTuNgayFromToday } from "@/lib/bv103-analytics-default-range";
import { getComplianceFilterOptions } from "../actions/compliance-dashboard.actions";
import type {
  DashboardSummaryRow,
  DashboardKhoaOverviewRow,
  DashboardKsnkStaffSupervisionRow,
} from "../compliance-dashboard.types";
import { type ComplianceDashboardPayload } from "../compliance-dashboard.types";
import type { VstDashboardPayload } from "@/modules/giam-sat-vst/actions/vst-dashboard.types";
import { resolveDashboardFilterUi } from "../lib/resolve-dashboard-filter-ui";
import { useDashboardExportReport } from "./use-dashboard-export-report";
import { useDashboardLoadCycle } from "./use-dashboard-load-cycle";
import { useDashboardCommandCenterWidgets } from "./use-dashboard-cc-widgets";
import type { DashboardHeaderFallback, DashboardTabType } from "./dashboard-types";

export type { DashboardTabType as TabType, DashboardHeaderFallback } from "./dashboard-types";

export function useDashboardData(header?: DashboardHeaderFallback | null) {
  const [activeTab, setActiveTab] = useState<DashboardTabType>("overview");
  const [selectedBangKiemMas, setSelectedBangKiemMas] = useState<string[]>([]);
  const [selectedKhoiIds, setSelectedKhoiIds] = useState<string[]>([]);
  const [selectedKhoaIds, setSelectedKhoaIds] = useState<string[]>([]);
  const [selectedNgheIds, setSelectedNgheIds] = useState<string[]>([]);
  const [selectedKhuVucIds, setSelectedKhuVucIds] = useState<string[]>([]);
  const [tuNgay, setTuNgay] = useState(() => bv103DefaultTuNgayFromToday());
  const [denNgay, setDenNgay] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [vstPayload, setVstPayload] = useState<VstDashboardPayload | null>(null);
  const [compliancePayloads, setCompliancePayloads] = useState<Record<string, ComplianceDashboardPayload>>({});
  const [summaryTable, setSummaryTable] = useState<DashboardSummaryRow[]>([]);
  const [khoaOverviewRows, setKhoaOverviewRows] = useState<DashboardKhoaOverviewRow[]>([]);
  const [vstGapPayloads, setVstGapPayloads] = useState<{
    kq: VstDashboardPayload | null;
    cheo: VstDashboardPayload | null;
    tgs: VstDashboardPayload | null;
  } | null>(null);
  const [complianceGapPayloads, setComplianceGapPayloads] = useState<
    Record<string, { kq: ComplianceDashboardPayload; cheo: ComplianceDashboardPayload; tgs: ComplianceDashboardPayload }>
  >({});
  const [ksnkStaffSupervision, setKsnkStaffSupervision] = useState<DashboardKsnkStaffSupervisionRow[]>([]);
  const [showKsnkStaffWorkload, setShowKsnkStaffWorkload] = useState(false);
  const [filterOptions, setFilterOptions] = useState<ComplianceDashboardPayload["options"] | null>(null);
  const [initDone, setInitDone] = useState(false);
  const [openDialog, setOpenDialog] = useState<"nhan_xet" | "kien_nghi" | null>(null);
  const [nhanXetDanhGia, setNhanXetDanhGia] = useState("");
  const [kienNghiDeXuat, setKienNghiDeXuat] = useState("");

  const ccWidgets = useDashboardCommandCenterWidgets();

  const widgetAccess = useMemo(
    () => ({
      overview: ccWidgets.overview,
      supervision: ccWidgets.supervision,
      gap: ccWidgets.gap,
    }),
    [ccWidgets.overview, ccWidgets.supervision, ccWidgets.gap],
  );

  const tabCoercedRef = useRef(false);
  useEffect(() => {
    if (!initDone || ccWidgets.loading || tabCoercedRef.current) return;
    if (ccWidgets.overview) {
      tabCoercedRef.current = true;
      return;
    }
    if (ccWidgets.supervision) {
      setActiveTab("ksnk");
      tabCoercedRef.current = true;
      return;
    }
    if (ccWidgets.gap) {
      setActiveTab("gap");
      tabCoercedRef.current = true;
      return;
    }
    tabCoercedRef.current = true;
  }, [initDone, ccWidgets.loading, ccWidgets.overview, ccWidgets.supervision, ccWidgets.gap]);

  const { bangKiemOptions, khoiOptions, khoaOptions, ngheOptions, khuVucOptions, bkLabelMap } = resolveDashboardFilterUi(
    filterOptions,
    header,
  );

  const exportCurrentReport = useDashboardExportReport({
    tuNgay,
    denNgay,
    selectedKhoaIds,
    khoaOptions,
    selectedNgheIds,
    ngheOptions,
    selectedKhuVucIds,
    khuVucOptions,
    selectedBangKiemMas,
    vstPayload,
    compliancePayloads,
    bkLabelMap,
    nhanXetDanhGia,
    kienNghiDeXuat,
  });

  const { loadDashboard } = useDashboardLoadCycle({
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
    khoiOptionCount: khoiOptions.length,
    khoaOptionCount: khoaOptions.length,
    ngheOptionCount: ngheOptions.length,
    khuOptionCount: khuVucOptions.length,
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
  });

  const loadDashboardRef = useRef(loadDashboard);
  useEffect(() => {
    loadDashboardRef.current = loadDashboard;
  }, [loadDashboard]);

  /** MDM / danh mục đổi ngoài màn hình này — không có realtime; tải lại khi quay về tab hoặc BFCache. */
  useEffect(() => {
    if (!initDone) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      clearTimeout(t);
      t = setTimeout(() => void loadDashboardRef.current(), 400);
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) schedule();
    };
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", schedule);
      window.removeEventListener("pageshow", onPageShow);
      clearTimeout(t);
    };
  }, [initDone]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getComplianceFilterOptions();
        if (cancelled) return;
        if (res.success) {
          setFilterOptions(res.data);
          setSelectedBangKiemMas([]);
          setSelectedKhoiIds(res.data.khoi.map((x) => x.id));
          setSelectedKhoaIds(res.data.khoa.map((x) => x.id));
          setSelectedNgheIds(res.data.nghe_nghiep.map((x) => x.id));
          setSelectedKhuVucIds(res.data.khu_vuc.map((x) => x.id));
          setInitDone(true);
        }
      } catch (err) {
        console.error("[Dashboard] init error:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    activeTab,
    setActiveTab,
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
    tuNgay,
    setTuNgay,
    denNgay,
    setDenNgay,
    loading,
    vstPayload,
    compliancePayloads,
    vstGapPayloads,
    complianceGapPayloads,
    summaryTable,
    khoaOverviewRows,
    ksnkStaffSupervision,
    showKsnkStaffWorkload,
    bangKiemOptions,
    khoiOptions,
    khoaOptions,
    ngheOptions,
    khuVucOptions,
    bkLabelMap,
    exportCurrentReport,
    openDialog,
    setOpenDialog,
    nhanXetDanhGia,
    setNhanXetDanhGia,
    kienNghiDeXuat,
    setKienNghiDeXuat,
    loadDashboard,
    initDone,
    ccWidgets,
  };
}
