// src/modules/cssd-erp/views/CSSDReportPage.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Download, Printer, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useModulePermission } from "@/hooks/useModulePermission";
import { fetchCssdReportBundle } from "../actions/cssd-report-read.actions";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { useImportExport } from "@/hooks/useImportExport";
import ReportFilters from "../components/report/ReportFilters";
import ReportDashboard from "../components/report/ReportDashboard";
import CSSDPageShell from "../components/layout/cssd-page-shell";
import CssdModuleChrome from "../components/layout/CssdModuleChrome";
import { CSSD_ROUTES } from "@/lib/cssd-routes";
import {
  CSSD_UI_ACTION_PRIMARY,
  CSSD_UI_ACTION_SECONDARY,
  CSSD_UI_DATA_SURFACE,
  CSSD_UI_TAB_ACTIVE,
  CSSD_UI_TAB_GROUP,
  CSSD_UI_TAB_IDLE,
} from "../shared/ui/cssd-ui-chrome";
import { INCIDENT_GROUP_LABEL, INCIDENT_GROUPS } from "@/modules/cssd-su-co/domain/cssd-incident-taxonomy";

const ReportCharts = dynamic(() => import("../components/report/ReportCharts"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />,
});

const STATIONS = ["TIEP_NHAN", "LAM_SACH", "QC", "DONG_GOI", "TIET_KHUAN", "CAP_PHAT"] as const;
type ReportTab = "OVERVIEW" | "INCIDENT" | "ACCOUNTABILITY";

function CSSDReportPageInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { allowed } = useModulePermission("CSSD_REPORT");
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
  const initialTab: ReportTab =
    tabParam === "incident" ? "INCIDENT" : tabParam === "accountability" ? "ACCOUNTABILITY" : "OVERVIEW";
  const [tab, setTab] = useState<ReportTab>(initialTab);

  useEffect(() => {
    if (tabParam === "incident") setTab("INCIDENT");
    else if (tabParam === "accountability") setTab("ACCOUNTABILITY");
    else if (tabParam === "overview" || !tabParam) setTab("OVERVIEW");
  }, [tabParam]);
  const [filters, setFilters] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
    station: "ALL",
  });
  const [raw, setRaw] = useState<{ quyTrinh: any[]; suCo: any[] }>({ quyTrinh: [], suCo: [] });
  const [loading, setLoading] = useState(true);

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
        compliance: raw.quyTrinh.length ? (100 - (raw.suCo.length / raw.quyTrinh.length) * 100).toFixed(1) : "100",
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
        .filter((x) => x.incident_group === "PROCESS")
        .map((x) => ({ ...x, fault_operator: x.fault_operator || x.reporter_email || "Chưa ghi nhận" })),
    };
  }, [raw]);

  const handleExport = () => exportTemplate(raw.quyTrinh);

  if (!allowed.view) {
    return (
      <CSSDPageShell title="Báo cáo CSSD" subtitle="Khoa KSNK — BV103">
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-black uppercase tracking-widest text-slate-400 shadow-sm">
          Bạn không có quyền xem báo cáo tổng hợp
        </div>
      </CSSDPageShell>
    );
  }

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
          <Link
            href={CSSD_ROUTES.suCo}
            className={`${CSSD_UI_ACTION_SECONDARY} h-10 inline-flex flex-1 items-center justify-center gap-2 sm:flex-none`}
          >
            <AlertTriangle size={18} aria-hidden />
            Ghi nhận sự cố
          </Link>
          <button type="button" onClick={() => window.print()} className={`${CSSD_UI_ACTION_SECONDARY} h-10 flex-1 sm:flex-none`}>
            <Printer size={20} /> In
          </button>
          <button type="button" onClick={handleExport} className={`${CSSD_UI_ACTION_PRIMARY} h-10 flex-1 sm:flex-none`}>
            <Download size={20} /> Xuất Excel
          </button>
        </>
      }
    >
      <CssdModuleChrome />
      <ReportFilters filters={filters} setFilters={setFilters} stations={[...STATIONS]} />
      <div className={CSSD_UI_TAB_GROUP}>
        <button onClick={() => setTab("OVERVIEW")} className={`rounded-lg px-4 py-2 text-xs font-semibold ${tab === "OVERVIEW" ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE}`}>
          Tổng quan
        </button>
        <button onClick={() => setTab("INCIDENT")} className={`rounded-lg px-4 py-2 text-xs font-semibold ${tab === "INCIDENT" ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE}`}>
          Sự cố theo nhóm
        </button>
        <button onClick={() => setTab("ACCOUNTABILITY")} className={`rounded-lg px-4 py-2 text-xs font-semibold ${tab === "ACCOUNTABILITY" ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE}`}>
          Khâu lỗi & người lỗi
        </button>
      </div>

      {tab === "OVERVIEW" && (
        <>
          <ReportDashboard stats={stats} alerts={alerts} />
          <ReportCharts pieData={pieData} barData={barData} />
          <div className={`${CSSD_UI_DATA_SURFACE} print:hidden`}>
            <div className="flex items-center justify-between px-6 pb-2 pt-6 sm:px-8">
              <h3 className="text-[11px] font-medium text-slate-500">Nhật ký quy trình (kỳ lọc)</h3>
            </div>
            <AdvancedDataTable
              columns={[
                { header: "MÃ QR", accessorKey: "ma_vach_qr", cell: (v: any) => <span className="font-black text-[var(--primary)]">{v.ma_vach_qr}</span> },
                {
                  header: "TRẠM CUỐI",
                  accessorKey: "trang_thai_hien_tai",
                  cell: (v: any) => <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase text-slate-600">{v.trang_thai_hien_tai?.replace(/_/g, " ")}</span>,
                },
                {
                  header: "CẢNH BÁO",
                  accessorKey: "is_red_alert",
                  cell: (v: any) => (v.is_red_alert ? <span className="font-black text-red-600">Cảnh báo đỏ</span> : <span className="text-[11px] font-bold uppercase text-emerald-600">Bình thường</span>),
                },
                {
                  header: "NGÀY TẠO",
                  accessorKey: "created_at",
                  cell: (v: any) => <span className="font-bold text-slate-500">{new Date(v.created_at).toLocaleDateString("vi-VN")}</span>,
                },
              ]}
              data={raw.quyTrinh}
              loading={loading}
              enableMultiSelect={false}
            />
          </div>
        </>
      )}

      {tab === "INCIDENT" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {incidentGroupStats.map((x) => (
              <div key={x.group} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{x.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-800">{x.count}</p>
              </div>
            ))}
          </div>
          <div className={`${CSSD_UI_DATA_SURFACE} print:hidden`}>
            <div className="flex items-center justify-between px-6 pb-2 pt-6 sm:px-8">
              <h3 className="text-[11px] font-medium text-slate-500">Nhật ký sự cố theo nhóm nghiệp vụ</h3>
            </div>
            <AdvancedDataTable
              columns={[
                { header: "MÃ QR", accessorKey: "ma_vach_qr", cell: (v: any) => <span className="font-black text-red-600">{v.ma_vach_qr || "—"}</span> },
                { header: "NHÓM", accessorKey: "incident_group_label", cell: (v: any) => <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold">{v.incident_group_label}</span> },
                { header: "LOẠI CHI TIẾT", accessorKey: "loai_su_co", cell: (v: any) => <span className="font-semibold text-slate-700">{v.loai_su_co || "—"}</span> },
                { header: "KHÂU PHÁT HIỆN", accessorKey: "tram_phat_hien", cell: (v: any) => <span className="text-[11px] font-bold uppercase text-slate-600">{String(v.tram_phat_hien || "Không áp dụng").replace(/_/g, " ")}</span> },
                { header: "KHÂU GÂY LỖI", accessorKey: "tram_gay_loi", cell: (v: any) => <span className="text-[11px] font-bold uppercase text-amber-700">{String(v.tram_gay_loi || "Không áp dụng").replace(/_/g, " ")}</span> },
              ]}
              data={raw.suCo}
              loading={loading}
              enableMultiSelect={false}
            />
          </div>
        </>
      )}

      {tab === "ACCOUNTABILITY" && (
        <div className={`${CSSD_UI_DATA_SURFACE} print:hidden`}>
          <div className="flex items-center justify-between px-6 pb-2 pt-6 sm:px-8">
            <h3 className="text-[11px] font-medium text-slate-500">Sự cố quy trình: khâu lỗi và người thao tác</h3>
          </div>
          <AdvancedDataTable
            columns={[
              { header: "MÃ QR", accessorKey: "ma_vach_qr", cell: (v: any) => <span className="font-black text-red-600">{v.ma_vach_qr || "—"}</span> },
              { header: "LOẠI LỖI", accessorKey: "loai_su_co", cell: (v: any) => <span className="font-semibold text-slate-700">{v.loai_su_co || "—"}</span> },
              { header: "KHÂU PHÁT HIỆN", accessorKey: "tram_phat_hien", cell: (v: any) => <span className="text-[11px] font-bold uppercase text-slate-600">{String(v.tram_phat_hien || "Không áp dụng").replace(/_/g, " ")}</span> },
              { header: "KHÂU GÂY LỖI", accessorKey: "tram_gay_loi", cell: (v: any) => <span className="text-[11px] font-bold uppercase text-amber-700">{String(v.tram_gay_loi || "Không áp dụng").replace(/_/g, " ")}</span> },
              { header: "NGƯỜI THAO TÁC", accessorKey: "fault_operator", cell: (v: any) => <span className="font-medium text-slate-700">{v.fault_operator || "Chưa ghi nhận"}</span> },
              { header: "THỜI GIAN", accessorKey: "created_at", cell: (v: any) => <span className="font-bold text-slate-500">{new Date(v.created_at).toLocaleString("vi-VN")}</span> },
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
