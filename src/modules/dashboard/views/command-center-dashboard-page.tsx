"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { Users, Eye, ClipboardList, Filter, LayoutDashboard, FileBarChart, ShieldCheck } from "lucide-react";
import { useDashboardData } from "@/modules/dashboard/hooks/useDashboardData";
import { buildEmptyComplianceDashboardPayload } from "@/modules/dashboard/compliance-dashboard.types";
import type { ComplianceDashboardPayload } from "@/modules/dashboard/compliance-dashboard.types";
import {
  gscPayloadHasSessions,
  listGscBangKiemKeysToRender,
  resolveCompliancePayloadForKey,
} from "@/modules/dashboard/lib/dashboard-hook-helpers";
import { GapAnalysisPanel } from "@/modules/dashboard/components/GapAnalysisPanel";
import { DashboardFilterPanel } from "@/modules/dashboard/components/DashboardFilterPanel";

const chartChunkFallback = (className: string) => (
  <div className={`animate-pulse rounded-xl border border-slate-200 bg-slate-50/90 ${className}`} />
);

const ComplianceDashboardPanel = dynamic(
  () => import("@/modules/dashboard/components/ComplianceDashboardPanel"),
  { ssr: false, loading: () => chartChunkFallback("min-h-[500px] w-full") },
);

const SupervisionSourceStats = dynamic(
  () => import("@/modules/dashboard/components/SupervisionSourceStats").then((m) => ({ default: m.SupervisionSourceStats })),
  { ssr: false, loading: () => chartChunkFallback("min-h-[560px] w-full") },
);

const VstDashboardPanel = dynamic(() => import("@/modules/giam-sat-vst/components/VstDashboardPanel"), {
  ssr: false,
  loading: () => chartChunkFallback("min-h-[700px] w-full"),
});

type KhoaOpt = { id: string; label?: string; khoi_id?: string };
type KhoiOpt = { id: string; label: string };

/** Cụm dashboard Giám sát chung theo từng bảng kiểm — mặc định chỉ bảng có ≥1 phiên trong payload. */
function GscComplianceDashboardBlocks(props: {
  selectedBangKiemMas: string[];
  compliancePayloads: Record<string, ComplianceDashboardPayload>;
  tuNgay: string;
  denNgay: string;
  loading: boolean;
  bkLabelMap: Map<string, string>;
  khoaCatalog: KhoaOpt[];
  khoiCatalog: KhoiOpt[];
  /** false = luôn render mọi bảng đã chọn (kể cả 0 phiên) */
  onlyWithSessions?: boolean;
  onExport?: () => void;
}) {
  const {
    selectedBangKiemMas,
    compliancePayloads,
    tuNgay,
    denNgay,
    loading,
    bkLabelMap,
    khoaCatalog,
    khoiCatalog,
    onlyWithSessions = true,
    onExport,
  } = props;
  const gscKeys = listGscBangKiemKeysToRender(selectedBangKiemMas, compliancePayloads, onlyWithSessions);
  const gscSelectedCount = selectedBangKiemMas.filter((bk) => bk !== "VST_WHO").length;
  if (gscKeys.length === 0) {
    if (gscSelectedCount === 0) return null;
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
        Không có bảng kiểm Giám sát chung nào có phiên trong khoảng lọc và tab nguồn giám sát hiện tại.
      </p>
    );
  }
  return (
    <>
      {gscKeys.map((bk) => {
        const p =
          resolveCompliancePayloadForKey(bk, compliancePayloads) ??
          buildEmptyComplianceDashboardPayload(tuNgay, denNgay);
        if (onlyWithSessions && !gscPayloadHasSessions(p)) return null;
        return (
          <div key={bk} className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-800">{bkLabelMap.get(bk) || bk}</h4>
            </div>
            <ComplianceDashboardPanel
              payload={p}
              loading={loading}
              khoaCatalog={khoaCatalog}
              khoiCatalog={khoiCatalog}
              onExport={onExport}
            />
          </div>
        );
      })}
    </>
  );
}

export function CommandCenterDashboardPage() {
  const {
    activeTab, setActiveTab,
    selectedBangKiemMas, setSelectedBangKiemMas,
    selectedKhoiIds, setSelectedKhoiIds,
    selectedKhoaIds, setSelectedKhoaIds,
    selectedNgheIds, setSelectedNgheIds,
    selectedKhuVucIds, setSelectedKhuVucIds,
    tuNgay, setTuNgay, denNgay, setDenNgay,
    loading, loadError, vstPayload, compliancePayloads, vstGapPayloads, complianceGapPayloads, summaryTable, khoaOverviewRows, ksnkStaffSupervision, showKsnkStaffWorkload,
    bangKiemOptions, khoiOptions, khoaOptions, ngheOptions, khuVucOptions, bkLabelMap,
    exportCurrentReport, openDialog, setOpenDialog,
    nhanXetDanhGia, setNhanXetDanhGia, kienNghiDeXuat, setKienNghiDeXuat,
    loadDashboard, initDone,
    ccWidgets,
  } = useDashboardData();

  const gscKpis = useMemo(() => {
    let tongQuanSat = 0;
    let tongViPham = 0;
    let tongPhien = 0;

    Object.entries(compliancePayloads).forEach(([bk, p]) => {
      if (bk === "VST_WHO") return;
      tongQuanSat += p.summary?.tong_quan_sat ?? 0;
      tongViPham += p.summary?.tong_vi_pham ?? 0;
      tongPhien += p.summary?.tong_phien ?? 0;
    });

    const tyLeTuanThu = tongQuanSat > 0
      ? Math.round(((tongQuanSat - tongViPham) * 1000) / tongQuanSat) / 10
      : 0;

    return {
      tongQuanSat,
      tongViPham,
      tongPhien,
      tyLeTuanThu,
    };
  }, [compliancePayloads]);

  const allTabs = [
    { id: "overview" as const, label: "Cơ cấu nguồn", icon: LayoutDashboard },
    { id: "ksnk" as const, label: "Chuyên trách", icon: Eye },
    { id: "cheo" as const, label: "Giám sát chéo", icon: ClipboardList },
    { id: "tu_giam_sat" as const, label: "Tự giám sát", icon: Users },
    { id: "gap" as const, label: "Đối soát & Lệch", icon: FileBarChart },
  ] as const;

  const visibleTabs = useMemo(() => {
    return allTabs.filter((t) => {
      if (t.id === "overview") return ccWidgets.overview;
      if (t.id === "ksnk" || t.id === "cheo" || t.id === "tu_giam_sat") return ccWidgets.supervision;
      if (t.id === "gap") return ccWidgets.gap;
      return true;
    });
  }, [ccWidgets.overview, ccWidgets.supervision, ccWidgets.gap]);

  const overviewSources = useMemo(() => {
    const ksnk = summaryTable.reduce((acc, row) => acc + (row.ksnk || 0), 0);
    const tu_gs = summaryTable.reduce((acc, row) => acc + (row.tu_gs || 0), 0);
    const cheo = summaryTable.reduce((acc, row) => acc + (row.cheo || 0), 0);

    return [
      { ten: "Chuyên trách (KSNK)", so_phien: ksnk },
      { ten: "Giám sát chéo", so_phien: cheo },
      { ten: "Tự giám sát", so_phien: tu_gs },
    ];
  }, [summaryTable]);

  const summaryRowsWithData = useMemo(() => summaryTable.filter((row) => row.tong > 0), [summaryTable]);

  const tuGsOverviewSources = useMemo(
    () => [{ ten: "Tự giám sát", so_phien: summaryTable.reduce((acc, row) => acc + (row.tu_gs || 0), 0) }],
    [summaryTable],
  );

  const hasStaleContent = summaryTable.length > 0 || Object.keys(compliancePayloads).length > 0;

  if (loading && !initDone) {
    return (
      <div className="mx-auto max-w-[1600px] space-y-4 p-4 md:p-6">
        <div className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100/80" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-slate-50 lg:col-span-2" />
          <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
        </div>
        <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 pb-20 md:p-6 md:pb-24">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">Command Center</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap gap-0.5 rounded-lg border border-slate-200 bg-slate-100/90 p-0.5">
              {visibleTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                    activeTab === t.id ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80" : "text-slate-600 hover:bg-white/70"
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="mb-3 flex items-center gap-2 text-slate-500">
            <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Bộ lọc</span>
          </div>
          <DashboardFilterPanel
            tuNgay={tuNgay}
            setTuNgay={setTuNgay}
            denNgay={denNgay}
            setDenNgay={setDenNgay}
            bangKiemOptions={bangKiemOptions}
            selectedBangKiemMas={selectedBangKiemMas}
            setSelectedBangKiemMas={setSelectedBangKiemMas}
            khoiOptions={khoiOptions}
            selectedKhoiIds={selectedKhoiIds}
            setSelectedKhoiIds={setSelectedKhoiIds}
            khoaOptions={khoaOptions}
            selectedKhoaIds={selectedKhoaIds}
            setSelectedKhoaIds={setSelectedKhoaIds}
            ngheOptions={ngheOptions}
            selectedNgheIds={selectedNgheIds}
            setSelectedNgheIds={setSelectedNgheIds}
            khuVucOptions={khuVucOptions}
            selectedKhuVucIds={selectedKhuVucIds}
            setSelectedKhuVucIds={setSelectedKhuVucIds}
            onRefresh={() => void loadDashboard({ force: true, useCache: false })}
            onOpenComment={() => setOpenDialog("nhan_xet")}
            onOpenRecommendation={() => setOpenDialog("kien_nghi")}
            onExport={ccWidgets.exportPdf ? exportCurrentReport : undefined}
          />
        </div>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {loadError}
          <button
            type="button"
            className="ml-3 font-semibold underline"
            onClick={() => void loadDashboard({ force: true, useCache: false })}
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {/* 2 KPI Lâm sàng Cốt lõi (Hero Section) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* KPI Vệ sinh tay */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-6 shadow-sm transition-all hover:shadow-md">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Tuân thủ Vệ sinh tay (WHO VST)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-emerald-950">
              {loading ? "..." : `${vstPayload?.kpis?.ty_le_tuan_thu ?? 0}%`}
            </span>
            <span className="text-xs font-medium text-emerald-700">đạt chuẩn</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-emerald-100/70 pt-4 text-xs">
            <div>
              <p className="text-emerald-600/80">Cơ hội quan sát</p>
              <p className="mt-0.5 font-bold text-emerald-950">
                {loading ? "..." : `${(vstPayload?.kpis?.da_tuan_thu ?? 0).toLocaleString()} / ${(vstPayload?.kpis?.tong_co_hoi ?? 0).toLocaleString()}`}
              </p>
            </div>
            <div>
              <p className="text-emerald-600/80">Số phiên giám sát</p>
              <p className="mt-0.5 font-bold text-emerald-950">
                {loading ? "..." : (vstPayload?.kpis?.tong_phien ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* KPI Giám sát chung */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-indigo-50/50 p-6 shadow-sm transition-all hover:shadow-md">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-500/5 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
              Tuân thủ Giám sát chung (GSC)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-sky-950">
              {loading ? "..." : `${gscKpis.tyLeTuanThu}%`}
            </span>
            <span className="text-xs font-medium text-sky-700">đạt chuẩn</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-sky-100/70 pt-4 text-xs">
            <div>
              <p className="text-sky-600/80">Tiêu chí đạt chuẩn</p>
              <p className="mt-0.5 font-bold text-sky-950">
                {loading ? "..." : `${(gscKpis.tongQuanSat - gscKpis.tongViPham).toLocaleString()} / ${gscKpis.tongQuanSat.toLocaleString()}`}
              </p>
            </div>
            <div>
              <p className="text-sky-600/80">Số phiên giám sát</p>
              <p className="mt-0.5 font-bold text-sky-950">
                {loading ? "..." : gscKpis.tongPhien.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`app-data-shell transition-opacity duration-200 ${loading && hasStaleContent ? "pointer-events-none opacity-60" : ""}`}
      >
        {activeTab === "overview" && (
          <div className="space-y-8">
            <SupervisionSourceStats
              sources={overviewSources}
              khoaOverviewRows={khoaOverviewRows}
              ksnkStaffSupervision={ksnkStaffSupervision}
              showKsnkStaffWorkload={showKsnkStaffWorkload}
              khoaOptions={khoaOptions}
              selectedKhoaIds={selectedKhoaIds}
              selectedKhoiIds={selectedKhoiIds}
              khoiOptions={khoiOptions}
            />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-800">Liệt kê các chuyên đề giám sát</h3>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Chuyên đề giám sát</th>
                      <th className="px-6 py-4 text-center text-[#f59e0b]">Tự giám sát</th>
                      <th className="px-6 py-4 text-center text-[#026f17]">Chuyên trách</th>
                      <th className="px-6 py-4 text-center text-[#0ea5e9]">Giám sát chéo</th>
                      <th className="px-6 py-4 text-right">Tổng cộng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaryRowsWithData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                          Không có chuyên đề nào có số liệu trong khoảng lọc (hoặc chưa chọn bảng kiểm có dữ liệu).
                        </td>
                      </tr>
                    ) : (
                      summaryRowsWithData.map((row) => (
                        <tr key={row.ma_bk} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-700">{row.ten_bk}</td>
                          <td className="px-6 py-4 text-center font-black text-[#f59e0b]">{row.tu_gs}</td>
                          <td className="px-6 py-4 text-center font-black text-[#026f17]">{row.ksnk}</td>
                          <td className="px-6 py-4 text-center font-black text-[#0ea5e9]">{row.cheo}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-900">{row.tong}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {(activeTab === "ksnk" || activeTab === "cheo" || activeTab === "tu_giam_sat") && (
          <div className="space-y-12 animate-in fade-in duration-500">
            {activeTab === "tu_giam_sat" && (
              <SupervisionSourceStats
                variant="tableOnly"
                sources={tuGsOverviewSources}
                khoaOverviewRows={khoaOverviewRows}
                ksnkStaffSupervision={[]}
                showKsnkStaffWorkload={false}
                khoaOptions={khoaOptions}
                selectedKhoaIds={selectedKhoaIds}
                selectedKhoiIds={selectedKhoiIds}
                khoiOptions={khoiOptions}
              />
            )}
            {selectedBangKiemMas.includes("VST_WHO") && (vstPayload?.kpis?.tong_phien ?? 0) > 0 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Vệ sinh tay (WHO)</h4>
                </div>
                <VstDashboardPanel payload={vstPayload} loading={loading} />
              </div>
            )}

            <GscComplianceDashboardBlocks
              selectedBangKiemMas={selectedBangKiemMas}
              compliancePayloads={compliancePayloads}
              tuNgay={tuNgay}
              denNgay={denNgay}
              loading={loading}
              bkLabelMap={bkLabelMap}
              khoaCatalog={khoaOptions}
              khoiCatalog={khoiOptions}
              onlyWithSessions
              onExport={ccWidgets.exportPdf ? exportCurrentReport : undefined}
            />
          </div>
        )}

        {activeTab === "gap" && (
          <div className="space-y-6">
            {selectedBangKiemMas.includes("VST_WHO") &&
              (vstGapPayloads?.kq?.kpis?.tong_phien ?? 0) > 0 &&
              vstGapPayloads?.kq && (
              <GapAnalysisPanel title="Vệ sinh tay (WHO)" kq={vstGapPayloads.kq.by_khoa} cheo={vstGapPayloads.cheo?.by_khoa || []} tgs={vstGapPayloads.tgs?.by_khoa || []} />
            )}
            {selectedBangKiemMas
              .filter((bk) => bk !== "VST_WHO")
              .filter((bk) => {
                const p = complianceGapPayloads[bk];
                if (!p) return false;
                return [p.kq, p.cheo, p.tgs].some((x) => (x?.by_khoa?.length ?? 0) > 0);
              })
              .map((bk) => {
                const p = complianceGapPayloads[bk];
                if (!p) return null;
                return (
                  <GapAnalysisPanel
                    key={bk}
                    title={bkLabelMap.get(bk) || bk}
                    kq={p.kq?.by_khoa ?? []}
                    cheo={p.cheo?.by_khoa ?? []}
                    tgs={p.tgs?.by_khoa ?? []}
                  />
                );
              })}
          </div>
        )}
      </div>

      {openDialog && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl animate-in rounded-2xl border border-white bg-white p-8 shadow-2xl duration-300 zoom-in-95">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{openDialog === "nhan_xet" ? "Nhận xét & Đánh giá" : "Kiến nghị & Đề xuất"}</h3>
            <textarea className="mt-6 min-h-[200px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#026f17] focus:ring-4 focus:ring-[#026f17]/5 transition-all" value={openDialog === "nhan_xet" ? nhanXetDanhGia : kienNghiDeXuat} onChange={(e) => (openDialog === "nhan_xet" ? setNhanXetDanhGia(e.target.value) : setKienNghiDeXuat(e.target.value))} />
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setOpenDialog(null)} className="h-12 rounded-xl border border-slate-200 px-6 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">Hủy bỏ</button>
              <button onClick={() => setOpenDialog(null)} className="h-12 rounded-xl bg-[#026f17] px-8 text-sm font-bold text-white shadow-lg shadow-[#026f17]/20">Lưu thông tin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
