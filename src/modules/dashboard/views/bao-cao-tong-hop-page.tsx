"use client";

import React, { useState } from "react";
import { AlertTriangle, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useBaoCaoTongHopPrint } from "../hooks/use-bao-cao-tong-hop-print";
import { AnalyticsFilterBar } from "@/components/shared/AnalyticsFilterBar";
import { Bv103AnalyticsPageFrame, Bv103AnalyticsPageSkeleton } from "@/components/shared/Bv103AnalyticsPageFrame";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { useBaoCaoTongHopData } from "../hooks/useBaoCaoTongHopData";
import { ComprehensiveKpiCards } from "../components/comprehensive/ComprehensiveKpiCards";
import { ComprehensiveTrend } from "../components/comprehensive/ComprehensiveTrend";
import { ComprehensiveCompare } from "../components/comprehensive/ComprehensiveCompare";
import { ComprehensiveTopicHybrid } from "../components/comprehensive/ComprehensiveTopicHybrid";
import { ComprehensiveNkbvOutcome } from "../components/comprehensive/ComprehensiveNkbvOutcome";
import { ReportPrintNarrativeControls } from "../components/comprehensive/ReportPrintNarrativeControls";
import { AnalyticsKhoaScopeBanner } from "../components/AnalyticsKhoaScopeBanner";

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
      <ReportPrintNarrativeControls
        nhanXetDanhGia={nhanXetDanhGia}
        onNhanXetChange={setNhanXetDanhGia}
        kienNghiDeXuat={kienNghiDeXuat}
        onKienNghiChange={setKienNghiDeXuat}
      />
      <button type="button" onClick={() => void d.loadReport()} className={bv103DesignTokens.btnGhostDark}>
        <RefreshCw size={14} aria-hidden /> Cập nhật
      </button>
      <button
        type="button"
        onClick={onPrintClick}
        disabled={printing || d.loading}
        title="Mở bản in A4 chính thức (gồm Phần III nhận xét/kiến nghị)"
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-100 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"
      >
        <Printer size={14} aria-hidden /> {printing ? "Đang chuẩn bị in…" : "In báo cáo A4"}
      </button>
    </>
  );

  const filterBar = (
    <AnalyticsFilterBar
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
      eyebrow="Báo cáo · KSNK BV103"
      title="Báo cáo tổng hợp KSNK"
      description="Bản chính thức gửi BGĐ/HĐ KSNK — số VST/GSC từ RPC strategic (khớp tab Chuẩn GSC)."
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
        <ComprehensiveKpiCards payload={d.payload} />
        <ComprehensiveTrend payload={d.payload} />
        <ComprehensiveCompare
          payload={d.payload}
          selectedKhoaIds={d.selectedKhoaIds}
          khoaOptions={d.khoaOptions}
        />
        <ComprehensiveNkbvOutcome payload={d.payload} />
        <ComprehensiveTopicHybrid payload={d.payload} chuyenDe={d.chuyenDe} onChuyenDeChange={d.setChuyenDe} />
      </div>
    </Bv103AnalyticsPageFrame>
  );
}
