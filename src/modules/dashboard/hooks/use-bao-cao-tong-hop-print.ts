import { useCallback, useState } from "react";
import { toast } from "sonner";
import { buildAnalyticsFilterPayload } from "@/lib/analytics/filter-helpers";
import { gscAnalyticsPayloadHasData } from "@/lib/analytics/gsc-analytics-data";
import { getGscStrategicAnalytics } from "@/modules/giam-sat-chung/actions/gsc-strategic-analytics.actions";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import { getBaoCaoTongHopPrintHtml } from "../lib/bao-cao-tong-hop-print";
import type { BaoCaoTongHopPayload } from "../types/bao-cao-tong-hop.types";

const MAX_CHECKLIST_TRENDS = 12;

type OptionRow = { id: string; label: string };

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

      const fromFilter = args.selectedBangKiemMas.filter((id) => id !== "VST_WHO");
      const fromData = (args.gscPayload?.dynamic_checklists ?? []).map((c) => c.ma_bk);
      const allMas = fromFilter.length > 0 ? fromFilter : fromData;
      const mas = allMas.slice(0, MAX_CHECKLIST_TRENDS);
      const truncated = Math.max(0, allMas.length - mas.length);

      const clusters: Record<string, GscStrategicPayload> = {};
      if (mas.length > 0) {
        const entries = await Promise.all(
          mas.map(async (ma) => {
            const res = await getGscStrategicAnalytics({ ...base, bang_kiem_mas: [ma] });
            return [ma, res.success ? res.data : null] as const;
          }),
        );
        for (const [ma, data] of entries) {
          if (data && gscAnalyticsPayloadHasData(data)) clusters[ma] = data;
        }
      }

      const reportNo = `BC-TH-${args.tuNgay.replaceAll("-", "")}-${args.denNgay.replaceAll("-", "")}`;
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
        gscChecklistClusters: clusters,
        gscChecklistTruncated: truncated,
        nhanXetDanhGia: args.nhanXetDanhGia,
        kienNghiDeXuat: args.kienNghiDeXuat,
      });

      const w = window.open("", "_blank");
      if (!w) {
        toast.error("Trình duyệt chặn cửa sổ in. Cho phép popup rồi thử lại.");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
      toast.success("Đã mở bản in", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tạo được bản in", { id: toastId });
    } finally {
      setPrinting(false);
    }
  }, [args]);

  return { print, printing };
}
