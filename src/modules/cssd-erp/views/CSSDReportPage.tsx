// src/modules/cssd-erp/views/CSSDReportPage.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Download, Printer, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useModulePermission } from "@/hooks/useModulePermission";
import {
  fetchCssdAnalyticsBundle,
  fetchCssdReportBundle,
  type CssdAnalyticsBundle,
} from "../actions/cssd-report-read.actions";
import { formatDateVi, formatDateTimeVi } from "@/lib/format-datetime-vi";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { useImportExport } from "@/hooks/useImportExport";
import ReportFilters from "../components/report/ReportFilters";
import ReportDashboard from "../components/report/ReportDashboard";
import ReportAnalyticsPanels from "../components/report/ReportAnalyticsPanels";
import CSSDPageShell from "../components/layout/cssd-page-shell";
import {
  CSSD_UI_ACTION_PRIMARY,
  CSSD_UI_ACTION_SECONDARY,
  CSSD_UI_STAT_LABEL,
  CSSD_UI_STAT_VALUE,
  CSSD_UI_TAB_GROUP,
} from "../shared/ui/cssd-ui-chrome";
import { CssdHorizTabButton } from "../components/layout/CssdHorizTabButton";
import { INCIDENT_GROUP_LABEL, INCIDENT_GROUPS, isAccountabilityCause } from "@/modules/cssd-su-co/domain/cssd-incident-taxonomy";
import IncidentJournalPrintButton from "@/modules/cssd-su-co/components/IncidentJournalPrintButton";
import IncidentConfirmButton from "@/modules/cssd-su-co/components/IncidentConfirmButton";
import { INCIDENT_STATUS_CONFIRMED } from "@/modules/cssd-su-co/domain/cssd-incident-status";

const ReportCharts = dynamic(() => import("../components/report/ReportCharts"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />,
});

const STATIONS = ["TIEP_NHAN", "LAM_SACH", "QC", "DONG_GOI", "TIET_KHUAN", "CAP_PHAT"] as const;
type ReportTab = "OVERVIEW" | "VOLUME" | "SETS" | "EQUIPMENT" | "STAFF" | "INCIDENT" | "ACCOUNTABILITY";

function parseReportTab(tabParam: string | null, highlightIncidentId: string): ReportTab {
  if (tabParam === "incident" || highlightIncidentId) return "INCIDENT";
  if (tabParam === "accountability") return "ACCOUNTABILITY";
  if (tabParam === "volume" || tabParam === "san-luong") return "VOLUME";
  if (tabParam === "sets" || tabParam === "bo") return "SETS";
  if (tabParam === "equipment" || tabParam === "may") return "EQUIPMENT";
  if (tabParam === "staff" || tabParam === "nhan-su") return "STAFF";
  return "OVERVIEW";
}

function CSSDReportPageInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const highlightIncidentId = String(searchParams.get("id") || "").trim();
  const { allowed } = useModulePermission("CSSD_REPORT");
  const { allowed: incidentAllowed } = useModulePermission("BAO_SU_CO");
  const { exportTemplate } = useImportExport({
    moduleKey: "CSSD_REPORT",
    tableName: "bao_cao_cssd",
    displayName: "Báo cáo CSSD",
    uniqueKey: "ma_vach_qr",
    columnMapping: {
      "MÃ QR": "ma_vach_qr",
      "TRẠM CUỐI": "trang_thai_hien_tai",
      "SỰ CỐ": "is_red_alert",
      "NGÀY TẠO": "created_at",
    },
    onImport: async () => ({ success: true }),
  });
  const [tab, setTab] = useState<ReportTab>(() => parseReportTab(tabParam, highlightIncidentId));
  const extraTab = tab !== "OVERVIEW" && tab !== "INCIDENT";
  const [showMoreTabs, setShowMoreTabs] = useState(extraTab);

  useEffect(() => {
    setTab(parseReportTab(tabParam, highlightIncidentId));
  }, [tabParam, highlightIncidentId]);

  const [filters, setFilters] = useState(() => {
    const toParam = String(searchParams.get("to") || searchParams.get("den_ngay") || "").trim();
    const fromParam = String(searchParams.get("from") || searchParams.get("tu_ngay") || "").trim();
    const stationParam = String(searchParams.get("station") || "").trim();
    const to = toParam || new Date().toISOString().split("T")[0];
    const fromDays = highlightIncidentId ? 365 : 30;
    const from =
      fromParam ||
      new Date(new Date().setDate(new Date().getDate() - fromDays)).toISOString().split("T")[0];
    return { from, to, station: stationParam || "ALL" };
  });
  const [raw, setRaw] = useState<{ quyTrinh: any[]; suCo: any[] }>({ quyTrinh: [], suCo: [] });
  const [analytics, setAnalytics] = useState<CssdAnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetchCssdReportBundle(filters);
      if (!res.success) {
        toast.error(res.error || "Không tải báo cáo CSSD");
        setRaw({ quyTrinh: [], suCo: [] });
      } else {
        setRaw({ quyTrinh: res.quyTrinh, suCo: res.suCo });
      }
      setLoading(false);
    })();
  }, [filters]);

  useEffect(() => {
    (async () => {
      setAnalyticsLoading(true);
      const res = await fetchCssdAnalyticsBundle({
        from: filters.from,
        to: filters.to,
        station: filters.station,
      });
      if (!res.success) {
        toast.error(res.error || "Không tải thống kê sản lượng CSSD");
        setAnalytics(res.data);
      } else {
        setAnalytics(res.data);
      }
      setAnalyticsLoading(false);
    })();
  }, [filters]);

  const { stats, alerts, pieData, barData, incidentGroupStats, processAccountabilityRows } = useMemo(() => {
    const bData = STATIONS.map((s) => {
      const qCount = raw.quyTrinh.filter((q) => q.trang_thai_hien_tai === s).length;
      const sCount = raw.suCo.filter((sc) => sc.tram_phat_hien === s).length;
      return { name: s, batches: qCount, incidents: sCount, rate: qCount ? (sCount / qCount) * 100 : 0 };
    });
    const sorted = [...bData].sort((a, b) => a.rate - b.rate);
    const pMap = new Map<string, number>();
    raw.suCo.forEach((s) => {
      const key = s.incident_group_label || "Khác";
      pMap.set(key, (pMap.get(key) || 0) + 1);
    });

    return {
      stats: {
        total: raw.quyTrinh.length,
        incidents: raw.suCo.length,
        /** Chỉ số CSSD riêng — không gộp CCS. */
        tyLeQuyTrinhKhongSuCo: raw.quyTrinh.length
          ? (100 - (raw.suCo.length / raw.quyTrinh.length) * 100).toFixed(1)
          : "100",
        bestStation: sorted[0]?.name.replace(/_/g, " ") || "Không áp dụng",
        worstStation: sorted[sorted.length - 1]?.name.replace(/_/g, " ") || "Không áp dụng",
      },
      alerts: bData.filter((b) => b.rate > 5).map((b) => ({ name: b.name, rate: b.rate.toFixed(1) })),
      pieData: Array.from(pMap).map(([name, value]) => ({ name, value })),
      barData: bData.map((b) => ({ ...b, name: b.name.replace(/_/g, " ") })),
      incidentGroupStats: INCIDENT_GROUPS.map((g) => ({
        group: g,
        label: INCIDENT_GROUP_LABEL[g],
        count: raw.suCo.filter((x) => x.incident_group === g).length,
      })),
      processAccountabilityRows: raw.suCo
        .filter((x) => isAccountabilityCause(String(x.cause_class || "")))
        .map((x) => ({ ...x, fault_operator: x.fault_operator || x.reporter_email || "Chưa ghi nhận" })),
    };
  }, [raw]);

  const handleExport = () => exportTemplate(raw.quyTrinh);

  if (!allowed.view) {
    return (
      <CSSDPageShell title="Báo cáo CSSD">
        <div className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-400 shadow-sm">
          Bạn không có quyền xem báo cáo tổng hợp
        </div>
      </CSSDPageShell>
    );
  }

  const analyticsPanel =
    tab === "VOLUME" || tab === "SETS" || tab === "EQUIPMENT" || tab === "STAFF" ? tab : null;

  return (
    <CSSDPageShell
      title={
        <>
          Báo cáo <span className="text-[var(--primary)]">CSSD</span>
        </>
      }
      subtitle="BỆNH VIỆN QUÂN Y 103 — KHOA KSNK"
      actions={
        <>
          <button type="button" onClick={() => window.print()} className={`${CSSD_UI_ACTION_SECONDARY} h-10 flex-1 sm:flex-none`}>
            <Printer size={20} /> In
          </button>
          <button type="button" onClick={handleExport} className={`${CSSD_UI_ACTION_PRIMARY} h-10 flex-1 sm:flex-none`}>
            <Download size={20} /> Xuất Excel
          </button>
        </>
      }
    >
      <ReportFilters filters={filters} setFilters={setFilters} stations={[...STATIONS]} />
      <div className="space-y-2">
        <div className={CSSD_UI_TAB_GROUP}>
          <CssdHorizTabButton active={tab === "OVERVIEW"} onClick={() => setTab("OVERVIEW")} label="Tổng quan" />
          <CssdHorizTabButton active={tab === "INCIDENT"} onClick={() => setTab("INCIDENT")} label="Sự cố theo nhóm" mobileLabel="Sự cố" />
        </div>
        {showMoreTabs || extraTab ? (
          <div className={CSSD_UI_TAB_GROUP}>
            <CssdHorizTabButton active={tab === "VOLUME"} onClick={() => setTab("VOLUME")} label="Sản lượng" />
            <CssdHorizTabButton active={tab === "SETS"} onClick={() => setTab("SETS")} label="Bộ và tái sử dụng" mobileLabel="Bộ" />
            <CssdHorizTabButton active={tab === "EQUIPMENT"} onClick={() => setTab("EQUIPMENT")} label="Máy và bảo trì" mobileLabel="Máy" />
            <CssdHorizTabButton active={tab === "STAFF"} onClick={() => setTab("STAFF")} label="NV CSSD" />
            <CssdHorizTabButton active={tab === "ACCOUNTABILITY"} onClick={() => setTab("ACCOUNTABILITY")} label="Khâu lỗi và người lỗi" mobileLabel="Trách nhiệm" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowMoreTabs(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            Xem thêm (sản lượng, máy, nhân sự)
          </button>
        )}
      </div>

      {tab === "OVERVIEW" && (
        <>
          <ReportDashboard stats={stats} alerts={alerts} />
          {analytics?.brief ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className={CSSD_UI_STAT_LABEL}>Sản lượng cấp phát</p>
                <p className={`mt-1 ${CSSD_UI_STAT_VALUE}`}>
                  {analyticsLoading ? "…" : analytics.brief.san_luong_cap_phat.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className={CSSD_UI_STAT_LABEL}>Số bộ danh mục</p>
                <p className={`mt-1 ${CSSD_UI_STAT_VALUE}`}>
                  {analyticsLoading ? "…" : analytics.brief.so_bo_danh_muc.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className={CSSD_UI_STAT_LABEL}>Mẻ / QC đạt</p>
                <p className={`mt-1 ${CSSD_UI_STAT_VALUE}`}>
                  {analyticsLoading
                    ? "…"
                    : `${analytics.brief.so_me_ky}${
                        analytics.brief.ty_le_qc_dat_me != null
                          ? ` · ${analytics.brief.ty_le_qc_dat_me}%`
                          : ""
                      }`}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className={CSSD_UI_STAT_LABEL}>Máy sẵn sàng</p>
                <p className={`mt-1 ${CSSD_UI_STAT_VALUE}`}>
                  {analyticsLoading
                    ? "…"
                    : `${analytics.brief.may_ready}/${analytics.brief.may_ready + analytics.brief.may_repairing}`}
                </p>
              </div>
            </div>
          ) : null}
          <ReportCharts pieData={pieData} barData={barData} />
          <p className="text-[11px] text-slate-500">
            Biểu đồ cột trạm phía trên = <strong>tồn hiện tại</strong> (trạng thái cuối). Tab «Sản lượng» = hoàn thành
            trong kỳ theo timestamp quét.
          </p>
          <div className="space-y-2 print:hidden">
            <h3 className="text-[11px] font-medium text-slate-500">Nhật ký quy trình (kỳ lọc)</h3>
            <AdvancedDataTable
              columns={[
                { header: "Mã qr", accessorKey: "ma_vach_qr", cell: (v: any) => <span className="font-mono text-[11px] font-medium text-[var(--primary)]">{v.ma_vach_qr}</span> },
                {
                  header: "Trạm cuối",
                  accessorKey: "trang_thai_hien_tai",
                  cell: (v: any) => <span className="text-[11px] font-medium text-slate-600">{v.trang_thai_hien_tai?.replace(/_/g, " ")}</span>,
                },
                {
                  header: "Cảnh báo",
                  accessorKey: "is_red_alert",
                  cell: (v: any) => (v.is_red_alert ? <span className="font-mono text-[11px] font-medium text-red-600">Cảnh báo đỏ</span> : <span className="bv103-type-label text-emerald-600">Bình thường</span>),
                },
                {
                  header: "Ngày tạo",
                  accessorKey: "created_at",
                  cell: (v: any) => <span className="text-[11px] font-medium text-slate-500">{formatDateVi(v.created_at)}</span>,
                },
              ]}
              data={raw.quyTrinh}
              loading={loading}
              enableMultiSelect={false}
            />
          </div>
        </>
      )}

      {analyticsPanel ? (
        <ReportAnalyticsPanels data={analytics} loading={analyticsLoading} panel={analyticsPanel} />
      ) : null}

      {tab === "INCIDENT" && (
        <>
          {highlightIncidentId ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-950">
              {raw.suCo.some((x) => String(x.id) === highlightIncidentId) ? (
                <p className="font-semibold">
                  Đang mở phiếu sự cố từ truy vết SSI/RCA — dòng được tô sáng trong nhật ký bên dưới.
                </p>
              ) : loading ? (
                <p className="font-medium text-slate-600">Đang tìm phiếu sự cố trong kỳ lọc…</p>
              ) : (
                <p className="font-medium text-amber-900">
                  Không thấy phiếu trong kỳ lọc hiện tại. Mở rộng khoảng ngày phía trên hoặc kiểm tra quyền báo cáo
                  CSSD.
                </p>
              )}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {incidentGroupStats.map((x) => (
              <div key={x.group} className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-medium text-slate-500">{x.label}</p>
                <p className={`mt-2 ${CSSD_UI_STAT_VALUE}`}>{x.count}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2 print:hidden">
            <h3 className="text-[11px] font-medium text-slate-500">Nhật ký sự cố theo nhóm nghiệp vụ</h3>
            <AdvancedDataTable
              columns={[
                { header: "Mã qr", accessorKey: "ma_vach_qr", cell: (v: any) => <span className="font-mono text-[11px] font-medium text-red-600">{v.ma_vach_qr || "—"}</span> },
                { header: "Nhóm", accessorKey: "incident_group_label", cell: (v: any) => <span className="text-[11px] font-medium text-slate-700">{v.incident_group_label}</span> },
                { header: "Bản chất", accessorKey: "cause_label", cell: (v: any) => <span className="text-[11px] font-medium text-slate-700">{v.cause_label || "Chưa phân loại"}</span> },
                { header: "Tình huống", accessorKey: "loai_su_co", cell: (v: any) => <span className="font-semibold text-slate-700">{v.loai_su_co || "—"}</span> },
                { header: "Mã lô", accessorKey: "ma_lo", cell: (v: any) => <span className="font-mono text-[11px]">{v.ma_lo || "—"}</span> },
                { header: "Mô tả", accessorKey: "mo_ta_ngan", cell: (v: any) => <span className="line-clamp-2 text-[11px] text-slate-600">{v.mo_ta_ngan || "—"}</span> },
                { header: "Người", accessorKey: "fault_operator", cell: (v: any) => <span className="text-[11px]">{v.fault_operator || v.reporter_email || "—"}</span> },
                { header: "Thời điểm", accessorKey: "created_at", cell: (v: any) => <span className="text-[11px] text-slate-500">{formatDateTimeVi(v.created_at)}</span> },
                {
                  header: "Trạng thái",
                  accessorKey: "incident_status_label",
                  cell: (v: any) => (
                    <span
                      className={
                        v.incident_status === INCIDENT_STATUS_CONFIRMED
                          ? "text-[11px] font-semibold text-emerald-700"
                          : "text-[11px] font-semibold text-amber-800"
                      }
                    >
                      {v.incident_status_label || "Chưa xác nhận"}
                    </span>
                  ),
                },
                { header: "Khâu phát hiện", accessorKey: "tram_phat_hien", cell: (v: any) => <span className="text-[11px] font-medium text-slate-500">{String(v.tram_phat_hien || "Không áp dụng").replace(/_/g, " ")}</span> },
                { header: "Khâu gây lỗi", accessorKey: "tram_gay_loi", cell: (v: any) => <span className="text-[11px] font-medium text-amber-700">{String(v.tram_gay_loi || "Không áp dụng").replace(/_/g, " ")}</span> },
                {
                  header: "In",
                  accessorKey: "id",
                  cell: (v: any) =>
                    v.id ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {incidentAllowed.create && v.incident_status !== INCIDENT_STATUS_CONFIRMED ? (
                          <IncidentConfirmButton
                            incidentId={String(v.id)}
                            onConfirmed={() => setFilters((f) => ({ ...f }))}
                          />
                        ) : null}
                        <IncidentJournalPrintButton incidentId={String(v.id)} />
                      </div>
                    ) : null,
                },
              ]}
              data={
                highlightIncidentId
                  ? [...raw.suCo].sort((a, b) =>
                      String(a.id) === highlightIncidentId ? -1 : String(b.id) === highlightIncidentId ? 1 : 0,
                    )
                  : raw.suCo
              }
              loading={loading}
              enableMultiSelect={false}
              rowClassName={(row) =>
                highlightIncidentId && String((row as { id?: string }).id) === highlightIncidentId
                  ? "bg-emerald-50 ring-2 ring-inset ring-emerald-300"
                  : ""
              }
            />
          </div>
        </>
      )}

      {tab === "ACCOUNTABILITY" && (
        <div className="space-y-2 print:hidden">
          <h3 className="text-[11px] font-medium text-slate-500">Khâu gây lỗi và người thao tác</h3>
          <AdvancedDataTable
            columns={[
              { header: "Mã qr", accessorKey: "ma_vach_qr", cell: (v: any) => <span className="font-mono text-[11px] font-medium text-red-600">{v.ma_vach_qr || "—"}</span> },
              { header: "Bản chất", accessorKey: "cause_label", cell: (v: any) => <span className="text-[11px] font-medium">{v.cause_label || "Chưa phân loại"}</span> },
              { header: "Tình huống", accessorKey: "loai_su_co", cell: (v: any) => <span className="font-semibold text-slate-700">{v.loai_su_co || "—"}</span> },
              { header: "Khâu phát hiện", accessorKey: "tram_phat_hien", cell: (v: any) => <span className="text-[11px] font-medium text-slate-500">{String(v.tram_phat_hien || "Không áp dụng").replace(/_/g, " ")}</span> },
              { header: "Khâu gây lỗi", accessorKey: "tram_gay_loi", cell: (v: any) => <span className="text-[11px] font-medium text-amber-700">{String(v.tram_gay_loi || "Không áp dụng").replace(/_/g, " ")}</span> },
              { header: "Người thao tác", accessorKey: "fault_operator", cell: (v: any) => <span className="font-medium text-slate-700">{v.fault_operator || "Chưa ghi nhận"}</span> },
              { header: "Thời gian", accessorKey: "created_at", cell: (v: any) => <span className="text-[11px] font-medium text-slate-500">{formatDateTimeVi(v.created_at)}</span> },
            ]}
            data={processAccountabilityRows}
            loading={loading}
            enableMultiSelect={false}
          />
        </div>
      )}
    </CSSDPageShell>
  );
}

export default function CSSDReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[40vh] items-center justify-center" aria-busy="true">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
        </div>
      }
    >
      <CSSDReportPageInner />
    </Suspense>
  );
}
