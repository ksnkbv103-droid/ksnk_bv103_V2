"use client";

import React, { useMemo } from "react";
import { Users, Eye, ClipboardList, Filter, LayoutDashboard, FileBarChart, Printer } from "lucide-react";
import { useDashboardData } from "@/modules/dashboard/hooks/useDashboardData";
import { buildEmptyComplianceDashboardPayload } from "@/modules/dashboard/compliance-dashboard.types";
import { SupervisionSourceStats } from "@/modules/dashboard/components/SupervisionSourceStats";
import VstDashboardPanel from "@/modules/giam-sat-vst/components/VstDashboardPanel";
import type { VstDashboardPayload } from "@/modules/giam-sat-vst/actions/vst-dashboard.types";
import ComplianceDashboardPanel from "@/modules/dashboard/components/ComplianceDashboardPanel";
import type { ComplianceDashboardPayload } from "@/modules/dashboard/compliance-dashboard.types";
import { GapAnalysisPanel } from "@/modules/dashboard/components/GapAnalysisPanel";
import { DashboardFilterPanel } from "@/modules/dashboard/components/DashboardFilterPanel";

function vstPayloadHasData(p: VstDashboardPayload | null | undefined): boolean {
  if (!p?.kpis) return false;
  return (p.kpis.tong_co_hoi ?? 0) > 0 || (p.kpis.tong_phien ?? 0) > 0;
}

/** Chỉ hiện dashboard GSC khi đã có ít nhất một phiên giám sát (theo RPC trong khoảng lọc + tab nguồn). */
function gscPayloadHasSessions(p: ComplianceDashboardPayload | null | undefined): boolean {
  if (!p?.summary) return false;
  return (p.summary.tong_phien ?? 0) > 0;
}

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
  } = props;
  const gscKeys = selectedBangKiemMas.filter((bk) => bk !== "VST_WHO");
  if (gscKeys.length === 0) return null;
  return (
    <>
      {gscKeys.map((bk) => {
        const p = compliancePayloads[bk] ?? buildEmptyComplianceDashboardPayload(tuNgay, denNgay);
        if (onlyWithSessions && !gscPayloadHasSessions(p)) return null;
        return (
          <div key={bk} className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-r-2xl border-l-4 border-blue-600 bg-blue-50 px-6 py-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-blue-900">{bkLabelMap.get(bk) || bk}</h4>
            </div>
            <ComplianceDashboardPanel
              payload={p}
              loading={loading}
              khoaCatalog={khoaCatalog}
              khoiCatalog={khoiCatalog}
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
    loading, vstPayload, compliancePayloads, vstGapPayloads, complianceGapPayloads, summaryTable, tuGiamSatParticipationByKhoa,
    bangKiemOptions, khoiOptions, khoaOptions, ngheOptions, khuVucOptions, bkLabelMap,
    exportCurrentReport, openDialog, setOpenDialog,
    nhanXetDanhGia, setNhanXetDanhGia, kienNghiDeXuat, setKienNghiDeXuat,
    loadDashboard, initDone
  } = useDashboardData();

  const tabs = [
    { id: "overview", label: "Cơ cấu nguồn", icon: LayoutDashboard },
    { id: "ksnk", label: "Chuyên trách", icon: Eye },
    { id: "cheo", label: "Giám sát chéo", icon: ClipboardList },
    { id: "tu_giam_sat", label: "Tự giám sát", icon: Users },
    { id: "gap", label: "Đối soát & Lệch", icon: FileBarChart },
  ] as const;

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

  if (loading && !initDone) return <div className="flex h-[45vh] items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#026f17] border-t-transparent" /></div>;

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 p-6 pb-24">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">Command Center</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Hệ thống chỉ huy & Giám sát KSNK Bệnh viện 103</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 p-1 shadow-sm">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black transition-all ${activeTab === t.id ? "bg-[#026f17] text-white shadow-lg shadow-[#026f17]/20" : "text-slate-500 hover:bg-slate-50"}`}>
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={exportCurrentReport} className="flex h-11 items-center gap-2 rounded-2xl bg-white border border-slate-200 px-5 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
            <Printer className="h-4 w-4" /> Báo cáo (PDF)
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-slate-400">
          <Filter className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Bộ lọc chỉ huy</span>
        </div>
        <DashboardFilterPanel
          tuNgay={tuNgay} setTuNgay={setTuNgay}
          denNgay={denNgay} setDenNgay={setDenNgay}
          bangKiemOptions={bangKiemOptions} selectedBangKiemMas={selectedBangKiemMas} setSelectedBangKiemMas={setSelectedBangKiemMas}
          khoiOptions={khoiOptions} selectedKhoiIds={selectedKhoiIds} setSelectedKhoiIds={setSelectedKhoiIds}
          khoaOptions={khoaOptions} selectedKhoaIds={selectedKhoaIds} setSelectedKhoaIds={setSelectedKhoaIds}
          ngheOptions={ngheOptions} selectedNgheIds={selectedNgheIds} setSelectedNgheIds={setSelectedNgheIds}
          khuVucOptions={khuVucOptions} selectedKhuVucIds={selectedKhuVucIds} setSelectedKhuVucIds={setSelectedKhuVucIds}
          onRefresh={loadDashboard}
          onOpenComment={() => setOpenDialog("nhan_xet")}
          onOpenRecommendation={() => setOpenDialog("kien_nghi")}
          onExport={exportCurrentReport}
        />
      </div>

      <div className="app-data-shell">
        {activeTab === "overview" && (
          <div className="space-y-8">
            <SupervisionSourceStats
              sources={overviewSources}
              participationTuGiamSat={tuGiamSatParticipationByKhoa}
              khoaOptions={khoaOptions}
              selectedKhoaIds={selectedKhoaIds}
              selectedKhoiIds={selectedKhoiIds}
              khoiOptions={khoiOptions}
            />

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-slate-900">Liệt kê các chuyên đề giám sát</h3>
              <div className="overflow-hidden rounded-2xl border border-slate-100">
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
              <p className="mt-4 text-sm text-slate-500">
                Bảng tổng hợp theo chuyên đề (mọi nguồn trong khoảng lọc). Biểu đồ chi tiết từng bảng kiểm (Giám sát chung) chỉ có ở các tab{" "}
                <span className="font-semibold text-slate-700">Chuyên trách</span>,{" "}
                <span className="font-semibold text-slate-700">Giám sát chéo</span> và{" "}
                <span className="font-semibold text-slate-700">Tự giám sát</span>.
              </p>
            </div>
          </div>
        )}

        {(activeTab === "ksnk" || activeTab === "cheo" || activeTab === "tu_giam_sat") && (
          <div className="space-y-12 animate-in fade-in duration-500">
            {selectedBangKiemMas.includes("VST_WHO") && vstPayloadHasData(vstPayload) && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-4 border-emerald-600 bg-emerald-50 px-6 py-4 rounded-r-2xl">
                  <h4 className="text-sm font-black uppercase tracking-widest text-emerald-900">Vệ sinh tay (WHO)</h4>
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
            />
          </div>
        )}

        {activeTab === "gap" && (
          <div className="space-y-6">
            {selectedBangKiemMas.includes("VST_WHO") && vstGapPayloads?.kq && vstPayloadHasData(vstGapPayloads.kq) && (
              <GapAnalysisPanel title="Vệ sinh tay (WHO)" kq={vstGapPayloads.kq.by_khoa} cheo={vstGapPayloads.cheo?.by_khoa || []} tgs={vstGapPayloads.tgs?.by_khoa || []} />
            )}
            {selectedBangKiemMas
              .filter((bk) => bk !== "VST_WHO")
              .map((bk) => {
                const p = complianceGapPayloads[bk];
                if (!p) return null;
                const gapHasSessions =
                  gscPayloadHasSessions(p.kq) || gscPayloadHasSessions(p.cheo) || gscPayloadHasSessions(p.tgs);
                if (!gapHasSessions) return null;
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
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-[2.5rem] border border-white bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300">
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
