import { useCallback } from "react";
import type { ComplianceDashboardPayload } from "../compliance-dashboard.types";
import { getDashboardPrintHtml } from "../lib/dashboard-print-template";
import type { VstDashboardPayload } from "@/modules/giam-sat-vst/actions/vst-dashboard.types";

type OptionRow = { id: string; label: string };

export function useDashboardExportReport(args: {
  tuNgay: string;
  denNgay: string;
  selectedKhoaIds: string[];
  khoaOptions: OptionRow[];
  selectedNgheIds: string[];
  ngheOptions: OptionRow[];
  selectedKhuVucIds: string[];
  khuVucOptions: OptionRow[];
  selectedBangKiemMas: string[];
  vstPayload: VstDashboardPayload | null;
  compliancePayloads: Record<string, ComplianceDashboardPayload>;
  bkLabelMap: Map<string, string>;
  nhanXetDanhGia: string;
  kienNghiDeXuat: string;
}) {
  const {
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
  } = args;

  return useCallback(() => {
    const reportNo = `BC-KSNK-${tuNgay.replaceAll("-", "")}-${denNgay.replaceAll("-", "")}`;
    const html = getDashboardPrintHtml({
      reportNo,
      issueDate: new Date().toLocaleDateString("vi-VN"),
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
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }, [
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
  ]);
}
