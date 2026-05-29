"use client";

import React from "react";
import { AlertTriangle, LayoutDashboard, Lightbulb, MessageSquare, Printer, RefreshCw } from "lucide-react";
import { AnalyticsFilterBar } from "@/components/shared/AnalyticsFilterBar";
import { useCommandCenterBriefData } from "@/modules/dashboard/hooks/useCommandCenterBriefData";
import { useDashboardExportReport } from "@/modules/dashboard/hooks/use-dashboard-export-report";
import {
  CommandCenterBriefSections,
  CommandCenterKsnkStaffSection,
} from "@/modules/dashboard/components/command-center/CommandCenterBriefSections";

export function CommandCenterDashboardPage() {
  const d = useCommandCenterBriefData();

  const handleExport = useDashboardExportReport({
    tuNgay: d.tuNgay,
    denNgay: d.denNgay,
    selectedKhoaIds: d.selectedKhoaIds,
    khoaOptions: d.khoaOptions,
    selectedNgheIds: d.selectedNgheIds,
    ngheOptions: d.ngheOptions,
    selectedKhuVucIds: d.selectedKhuVucIds,
    khuVucOptions: d.khuVucOptions,
    selectedBangKiemMas: d.selectedBangKiemMas,
    vstPayload: d.vstPayload,
    gscPayload: d.gscPayload,
    nhanXetDanhGia: "",
    kienNghiDeXuat: "",
  });

  if (d.loading && !d.initDone) {
    return (
      <div className="mx-auto max-w-[1400px] animate-pulse space-y-6 p-4 md:p-8">
        <div className="h-28 rounded-2xl border border-slate-200 bg-slate-100/80" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1400px] space-y-8 bg-slate-50 p-4 pb-24 md:p-8">
      <div className="sticky top-4 z-50 rounded-2xl border border-slate-200/60 bg-white/90 p-5 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
            <div className="rounded-xl bg-gradient-to-br from-[#026f17] to-teal-700 p-2.5 text-white shadow-lg">
              <LayoutDashboard size={20} />
            </div>
            Command Center
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void d.loadDashboard()}
              className="flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <RefreshCw size={14} /> Cập nhật
            </button>
            <button type="button" className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
              <MessageSquare size={14} /> Nhận xét
            </button>
            <button type="button" className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
              <Lightbulb size={14} /> Kiến nghị
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex h-9 items-center gap-2 rounded-lg bg-emerald-100 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-200"
            >
              <Printer size={14} /> In báo cáo
            </button>
          </div>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-5">
          <AnalyticsFilterBar
            tuNgay={d.tuNgay}
            setTuNgay={d.setTuNgay}
            denNgay={d.denNgay}
            setDenNgay={d.setDenNgay}
            bangKiemOptions={d.bangKiemOptions}
            selectedBangKiemMas={d.selectedBangKiemMas}
            setSelectedBangKiemMas={d.setSelectedBangKiemMas}
            khoiOptions={d.khoiOptions}
            selectedKhoiIds={d.selectedKhoiIds}
            setSelectedKhoiIds={d.setSelectedKhoiIds}
            khoaOptions={d.khoaOptions}
            selectedKhoaIds={d.selectedKhoaIds}
            setSelectedKhoaIds={d.setSelectedKhoaIds}
            ngheOptions={d.ngheOptions}
            selectedNgheIds={d.selectedNgheIds}
            setSelectedNgheIds={d.setSelectedNgheIds}
            khuVucOptions={d.khuVucOptions}
            selectedKhuVucIds={d.selectedKhuVucIds}
            setSelectedKhuVucIds={d.setSelectedKhuVucIds}
            selectedHinhThucIds={d.selectedHinhThucIds}
            setSelectedHinhThucIds={d.setSelectedHinhThucIds}
          />
        </div>
      </div>

      {d.loadError ? (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <span className="flex items-center gap-2 font-medium">
            <AlertTriangle size={18} /> {d.loadError}
          </span>
          <button type="button" className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white" onClick={() => void d.loadDashboard()}>
            Thử lại
          </button>
        </div>
      ) : null}

      <div className={`space-y-8 transition-opacity ${d.loading ? "pointer-events-none opacity-50" : ""}`}>
        <CommandCenterBriefSections vstPayload={d.vstPayload} gscPayload={d.gscPayload} />

        {d.showKsnkStaff || !d.staffLoaded ? (
          <CommandCenterKsnkStaffSection
            rows={d.ksnkStaffStats}
            loading={d.staffLoading}
            onExpand={() => void d.loadKsnkStaff()}
          />
        ) : null}
      </div>
    </div>
  );
}
