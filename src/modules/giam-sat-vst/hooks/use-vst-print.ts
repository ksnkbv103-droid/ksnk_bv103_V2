"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { getVSTSessionDetail } from "../actions/vst.actions";
import { getCategoriesByType } from "../../quan-tri-he-thong/danh-muc/actions/danh-muc.actions";
import type { VSTFormPerson } from "../lib/vst-form-model";

export type VstDmRow = { id?: string; ten_danh_muc?: string; ten_khoa?: string };

export type VstPrintData = {
  session: Record<string, unknown>;
  persons: VSTFormPerson[];
  ngheNghieps: VstDmRow[];
  khoas: VstDmRow[];
  khuVucs: VstDmRow[];
  nhanSus: { id: string; ho_ten: string }[];
};

export function useVstPrint() {
  const [printingSessionId, setPrintingSessionId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<VstPrintData | null>(null);

  const onPrint = useCallback(async (sessionId: string) => {
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintingSessionId(sessionId);
    try {
      const [detailRes, nnRes, kRes, kvRes] = await Promise.all([
        getVSTSessionDetail(sessionId),
        getCategoriesByType("NGHE_NGHIEP"),
        getCategoriesByType("KHOA_PHONG"),
        getCategoriesByType("KHU_VUC_GIAM_SAT"),
      ]);

      let settled = false;
      let timer: number | null = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (timer !== null) window.clearTimeout(timer);
        window.removeEventListener("afterprint", finish);
        setPrintData(null);
        setPrintingSessionId(null);
        setIsPrinting(false);
      };

      if (!detailRes.success) {
        toast.error(String((detailRes as { error?: string }).error || "Không đọc được phiên"));
        setIsPrinting(false);
        setPrintingSessionId(null);
        return;
      }

      const obs = detailRes.observations || [];
      const personsMap: Record<string, Record<string, unknown>> = {};

      /** Giống RPC/dashboard: tách mốc theo dấu phẩy (có/không khoảng trắng). */
      const splitThoiDiem = (raw: unknown): string[] =>
        String(raw ?? "")
          .split(/\s*,\s*/g)
          .map((x) => x.trim())
          .filter(Boolean);

      obs.forEach((o: Record<string, unknown>) => {
        const byNv = String(o.nhan_vien_id ?? "").trim();
        const byName = String(o.ten_nhan_vien_ngoai ?? "").trim();
        /** Legacy/import: có thể thiếu cả hai — vẫn phải in cơ hội, gom một nhóm. */
        const personKey = byNv || byName || "__MISSING_PERSON__";
        if (!personsMap[personKey]) {
          personsMap[personKey] = {
            id_col: personKey,
            nhan_vien_id: o.nhan_vien_id,
            ten_manual: o.ten_nhan_vien_ngoai,
            is_manual: Boolean(byName),
            nghe_nghiep: o.nghe_nghiep,
            opportunities: [] as Record<string, unknown>[],
          };
        }
        (personsMap[personKey].opportunities as Record<string, unknown>[]).push({
          thoi_diems: splitThoiDiem(o.thoi_diem),
          hanh_dong: o.hanh_dong,
          dung_ky_thuat: o.dung_ky_thuat,
          du_thoi_gian: o.du_thoi_gian,
          co_deo_gang: o.co_deo_gang,
          thoi_gian_ghi_nhan: o.thoi_gian_ghi_nhan,
        });
      });

      setPrintData({
        session: detailRes.session as Record<string, unknown>,
        persons: Object.values(personsMap) as unknown as VSTFormPerson[],
        ngheNghieps: (nnRes.data || []) as VstDmRow[],
        khoas: (kRes.data || []) as VstDmRow[],
        khuVucs: (kvRes.data || []) as VstDmRow[],
        nhanSus: (detailRes as { nhanSuForPrint?: { id: string; ho_ten: string }[] }).nhanSuForPrint || [],
      });

      // Wait for React to render the print view
      await new Promise<void>((resolve) =>
        globalThis.requestAnimationFrame(() =>
          globalThis.requestAnimationFrame(() => resolve())),
      );

      window.addEventListener("afterprint", finish);
      window.print();
      timer = window.setTimeout(finish, 45_000);
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Không in được phiếu");
      setIsPrinting(false);
      setPrintData(null);
      setPrintingSessionId(null);
    }
  }, [isPrinting]);

  return {
    isPrinting,
    printingSessionId,
    printData,
    onPrint
  };
}
