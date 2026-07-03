"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useBaoCaoTongHopPrint } from "../hooks/use-bao-cao-tong-hop-print";
import { AnalyticsFilterBar } from "@/components/shared/AnalyticsFilterBar";
import { Bv103AnalyticsPageFrame, Bv103AnalyticsPageSkeleton } from "@/components/shared/Bv103AnalyticsPageFrame";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { useBaoCaoTongHopData } from "../hooks/useBaoCaoTongHopData";
import { ComprehensiveKpiCards } from "../components/comprehensive/ComprehensiveKpiCards";
import { ReportPrintNarrativeControls } from "../components/comprehensive/ReportPrintNarrativeControls";
import { ReportSection, ReportSectionNav } from "../components/comprehensive/ReportSectionNav";
import { AnalyticsKhoaScopeBanner } from "../components/AnalyticsKhoaScopeBanner";

function ChartSectionSkeleton() {
  return <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />;
}

const ComprehensiveTrend = dynamic(
  () => import("../components/comprehensive/ComprehensiveTrend").then((m) => ({ default: m.ComprehensiveTrend })),
  { loading: () => <ChartSectionSkeleton /> },
);
const ComprehensiveCompare = dynamic(
  () => import("../components/comprehensive/ComprehensiveCompare").then((m) => ({ default: m.ComprehensiveCompare })),
  { loading: () => <ChartSectionSkeleton /> },
);
const ComprehensiveNkbvOutcome = dynamic(
  () =>
    import("../components/comprehensive/ComprehensiveNkbvOutcome").then((m) => ({
      default: m.ComprehensiveNkbvOutcome,
    })),
  { loading: () => <ChartSectionSkeleton /> },
);
const ComprehensiveGscBkIntervention = dynamic(
  () =>
    import("../components/comprehensive/ComprehensiveGscBkIntervention").then((m) => ({
      default: m.ComprehensiveGscBkIntervention,
    })),
  { loading: () => <ChartSectionSkeleton /> },
);
const ComprehensiveTopicHybrid = dynamic(
  () =>
    import("../components/comprehensive/ComprehensiveTopicHybrid").then((m) => ({
      default: m.ComprehensiveTopicHybrid,
    })),
  { loading: () => <ChartSectionSkeleton /> },
);

export function BaoCaoTongHopPage() {
  const d = useBaoCaoTongHopData();
  const [nhanXetDanhGia, setNhanXetDanhGia] = useState("");
  const [kienNghiDeXuat, setKienNghiDeXuat] = useState("");

  const { print: handlePrint, printing } = useBaoCaoTongHopPrint({
    tuNgay: d.tuNgay,
    denNgay: d.denNgay,
    selectedKhoaIds: d.selectedKhoaIds,
    khoaOptions: d.khoaOptions,
    selectedNgheIds: d.selectedNgheIds,
    ngheOptions: d.ngheOptions,
    selectedKhuVucIds: d.selectedKhuVucIds,
    khuVucOptions: d.khuVucOptions,
    selectedKhoiIds: d.selectedKhoiIds,
    selectedHinhThucIds: d.selectedHinhThucIds,
    selectedBangKiemMas: d.selectedBangKiemMas,
    khoiOptionCount: d.khoiOptions.length,
    khoaOptionCount: d.khoaOptions.length,
    ngheOptionCount: d.ngheOptions.length,
    khuOptionCount: d.khuVucOptions.length,
    payload: d.payload,
    vstPayload: d.payload?.vst ?? null,
    gscPayload: d.payload?.gsc ?? null,
    nhanXetDanhGia,
    kienNghiDeXuat,
  });

  const onPrintClick = () => {
    if (!nhanXetDanhGia.trim() && !kienNghiDeXuat.trim()) {
      toast.message("Chưa nhập Phần III", {
        description: "Bấm «Nhận xét đánh giá» hoặc «Kiến nghị đề xuất» trước khi in — hoặc tiếp tục in với «Chưa có nội dung».",
      });
    }
    void handlePrint();
  };

  if (!d.initDone) {
    return <Bv103AnalyticsPageSkeleton />;
  }

  const headerActions = (
    <>
      <button
        type="button"
        onClick={() => void d.loadReport()}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <RefreshCw size={14} aria-hidden /> Cập nhật
      </button>
      <button
        type="button"
        onClick={onPrintClick}
        disabled={printing || d.loading}
        title="In báo cáo A4"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        <Printer size={14} aria-hidden /> {printing ? "Đang in…" : "In A4"}
      </button>
    </>
  );

  const filterBar = (
    <AnalyticsFilterBar
      variant="compact"
      khoaFilterLocked={d.khoaFilterLocked}
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
  );

  return (
    <Bv103AnalyticsPageFrame
      title="Báo cáo tổng hợp KSNK"
      actions={headerActions}
      filterBar={filterBar}
    >
      {d.loadError ? (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <span className="flex items-center gap-2 font-medium">
            <AlertTriangle size={18} aria-hidden /> {d.loadError}
          </span>
          <button type="button" className={bv103DesignTokens.btnPrimary} onClick={() => void d.loadReport()}>
            Thử lại
          </button>
        </div>
      ) : null}

      <div className={`space-y-8 transition-opacity ${d.loading ? "pointer-events-none opacity-50" : ""}`}>
        {d.khoaFilterLocked && d.lockedKhoaLabel ? <AnalyticsKhoaScopeBanner khoaLabel={d.lockedKhoaLabel} /> : null}
        <ReportSectionNav />
        <ReportSection id="bc-kpi" title="Chỉ số tổng hợp">
          <ComprehensiveKpiCards payload={d.payload} />
        </ReportSection>
        <ReportSection id="bc-trend" title="Xu hướng tuân thủ">
          <ComprehensiveTrend payload={d.payload} />
        </ReportSection>
        <ReportSection id="bc-vst" title="Giám sát vệ sinh tay">
          <ComprehensiveCompare
            payload={d.payload}
            selectedKhoaIds={d.selectedKhoaIds}
            khoaOptions={d.khoaOptions}
            module="vst"
          />
        </ReportSection>
        <ReportSection id="bc-gsc" title="Giám sát chung">
          <ComprehensiveCompare
            payload={d.payload}
            selectedKhoaIds={d.selectedKhoaIds}
            khoaOptions={d.khoaOptions}
            module="gsc"
          />
        </ReportSection>
        <ReportSection id="bc-gsc-bk" title="Bảng kiểm cần can thiệp">
          <ComprehensiveGscBkIntervention payload={d.payload} />
        </ReportSection>
        <ReportSection id="bc-nkbv" title="Kết quả NKBV">
          <ComprehensiveNkbvOutcome payload={d.payload} />
        </ReportSection>
        <ReportSection id="bc-chuyen-de" title="Chuyên đề GSC">
          <ComprehensiveTopicHybrid payload={d.payload} chuyenDe={d.chuyenDe} onChuyenDeChange={d.setChuyenDe} />
        </ReportSection>
        <ReportSection id="bc-phan-iii" title="Phần III — Đánh giá và kiến nghị">
          <p className="mb-3 text-xs text-slate-500">
            Nội dung in vào mục III bản báo cáo gửi Ban Giám đốc / Hội đồng KSNK.
          </p>
          <div className="flex flex-wrap gap-2">
            <ReportPrintNarrativeControls
              nhanXetDanhGia={nhanXetDanhGia}
              onNhanXetChange={setNhanXetDanhGia}
              kienNghiDeXuat={kienNghiDeXuat}
              onKienNghiChange={setKienNghiDeXuat}
            />
          </div>
        </ReportSection>
      </div>
    </Bv103AnalyticsPageFrame>
  );
}
