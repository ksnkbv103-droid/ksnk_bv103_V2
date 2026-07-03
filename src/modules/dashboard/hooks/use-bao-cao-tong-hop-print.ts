import { useCallback, useState } from "react";
import { toast } from "sonner";
import { buildAnalyticsFilterPayload } from "@/lib/analytics/filter-helpers";
import { resolveChecklistOverview, resolveTopInterventionChecklists } from "@/lib/analytics/gsc-checklist-intervention";
import { getGscChecklistDetail } from "@/modules/giam-sat-chung/actions/gsc-checklist-detail.actions";
import type { GscChecklistDetailPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import { buildBaoCaoReportNo } from "../lib/bao-cao-tong-hop-core";
import { getBaoCaoTongHopPrintHtml } from "../lib/bao-cao-tong-hop-print";
import type { BaoCaoTongHopPayload } from "../types/bao-cao-tong-hop.types";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";

const MAX_CHECKLIST_DETAILS = 5;

type OptionRow = { id: string; label: string; khoi_id?: string };

export function useBaoCaoTongHopPrint(args: {
  tuNgay: string;
  denNgay: string;
  selectedKhoaIds: string[];
  khoaOptions: OptionRow[];
  selectedNgheIds: string[];
  ngheOptions: OptionRow[];
  selectedKhuVucIds: string[];
  khuVucOptions: OptionRow[];
  selectedKhoiIds: string[];
  selectedHinhThucIds: string[];
  selectedBangKiemMas: string[];
  khoiOptionCount: number;
  khoaOptionCount: number;
  ngheOptionCount: number;
  khuOptionCount: number;
  payload: BaoCaoTongHopPayload | null;
  vstPayload: VstStrategicPayload | null;
  gscPayload: GscStrategicPayload | null;
  nhanXetDanhGia: string;
  kienNghiDeXuat: string;
}) {
  const [printing, setPrinting] = useState(false);

  const print = useCallback(async () => {
    setPrinting(true);
    const toastId = toast.loading("Đang chuẩn bị bản in…");
    try {
      const base = buildAnalyticsFilterPayload({
        tuNgay: args.tuNgay,
        denNgay: args.denNgay,
        selectedKhoiIds: args.selectedKhoiIds,
        selectedKhoaIds: args.selectedKhoaIds,
        selectedNgheIds: args.selectedNgheIds,
        selectedKhuVucIds: args.selectedKhuVucIds,
        selectedHinhThucIds: args.selectedHinhThucIds,
        selectedBangKiemMas: args.selectedBangKiemMas,
        khoiOptionCount: args.khoiOptionCount,
        khoaOptionCount: args.khoaOptionCount,
        ngheOptionCount: args.ngheOptionCount,
        khuOptionCount: args.khuOptionCount,
      });

      const topList = resolveTopInterventionChecklists(args.gscPayload, MAX_CHECKLIST_DETAILS);
      const topMas = topList.map((r) => r.ma_bk);
      const truncated = Math.max(0, resolveChecklistOverview(args.gscPayload).length - topMas.length);

      const details: Record<string, GscChecklistDetailPayload> = {};
      if (topMas.length > 0) {
        const entries = await Promise.all(
          topMas.map(async (ma) => {
            const res = await getGscChecklistDetail({ ...base, ma_bk: ma });
            return [ma, res.success ? res.data : null] as const;
          }),
        );
        for (const [ma, data] of entries) {
          if (data) details[ma] = data;
        }
      }

      const reportNo = buildBaoCaoReportNo(args.tuNgay, args.denNgay);
      const html = getBaoCaoTongHopPrintHtml({
        reportNo,
        tuNgay: args.tuNgay,
        denNgay: args.denNgay,
        selectedKhoaIds: args.selectedKhoaIds,
        khoaOptions: args.khoaOptions,
        selectedNgheIds: args.selectedNgheIds,
        ngheOptions: args.ngheOptions,
        selectedKhuVucIds: args.selectedKhuVucIds,
        khuVucOptions: args.khuVucOptions,
        payload: args.payload,
        vstPayload: args.vstPayload,
        gscPayload: args.gscPayload,
        gscChecklistDetails: details,
        gscChecklistTruncated: truncated,
        nhanXetDanhGia: args.nhanXetDanhGia,
        kienNghiDeXuat: args.kienNghiDeXuat,
      });

      const w = window.open("", "_blank");
      if (!w) {
        toast.error("Trình duyệt chặn cửa sổ in. Cho phép popup rồi thử lại.");
        return;
      }
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
      toast.success("Đã mở bản in A4", { id: toastId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không in được báo cáo", { id: toastId });
    } finally {
      setPrinting(false);
    }
  }, [args]);

  return { print, printing };
}
