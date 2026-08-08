"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { getVSTSessionDetail } from "../actions/vst-read.actions";
import { markVSTSessionsSeen } from "../actions/vst-write-seen.actions";
import { buildVstViewDataFromDetail } from "../lib/vst-session-view-data";
import { getCategoriesByType } from "@/lib/master-data/categories-by-type";
import { getCategoriesByTypeCached } from "@/lib/client-cache/danh-muc-cache";
import type { VSTFormPerson } from "../lib/vst-form-model";
import { buildEntityQrCode } from "@/lib/entity-qr/entity-qr-core";
import { generateEntityQrDataUrl } from "@/lib/entity-qr/generate-entity-qr";

export type VstDmRow = { id?: string; ten_danh_muc?: string; ten_khoa?: string };

export type VstPrintData = {
  session: Record<string, unknown>;
  persons: VSTFormPerson[];
  ngheNghieps: VstDmRow[];
  khoas: VstDmRow[];
  khuVucs: VstDmRow[];
  nhanSus: { id: string; ho_ten: string }[];
  qrCode?: string;
  qrDataUrl?: string;
};

/**
 * Đóng phiên in an toàn trên mobile: `afterprint` thường không chạy (Safari iOS),
 * nên thêm `matchMedia('print')` + timeout dự phòng để gỡ `printData` / `isPrinting`.
 */
function attachPrintSessionFinish(onFinish: () => void): () => void {
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    onFinish();
  };

  const onAfterPrint = () => once();
  window.addEventListener("afterprint", onAfterPrint);

  const mq = typeof window.matchMedia === "function" ? window.matchMedia("print") : null;
  const onPrintMq = () => {
    if (mq && !mq.matches) once();
  };
  if (mq) {
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onPrintMq);
    } else {
      mq.addListener(onPrintMq);
    }
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const looksMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  const fallbackMs = looksMobile ? 25_000 : 45_000;
  const timer = window.setTimeout(once, fallbackMs);

  return () => {
    window.removeEventListener("afterprint", onAfterPrint);
    if (mq) {
      if (typeof mq.removeEventListener === "function") {
        mq.removeEventListener("change", onPrintMq);
      } else {
        mq.removeListener(onPrintMq);
      }
    }
    window.clearTimeout(timer);
  };
}

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
        getCategoriesByTypeCached("NGHE_NGHIEP", getCategoriesByType),
        getCategoriesByTypeCached("KHOA_PHONG", getCategoriesByType),
        getCategoriesByTypeCached("KHU_VUC_GIAM_SAT", getCategoriesByType),
      ]);

      let settled = false;
      let detachPrintFinish: (() => void) | null = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        detachPrintFinish?.();
        detachPrintFinish = null;
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

      void markVSTSessionsSeen([sessionId]);

      const base = buildVstViewDataFromDetail(
        {
          session: detailRes.session as Record<string, unknown>,
          observations: (detailRes.observations || []) as Array<Record<string, unknown>>,
          nhanSuForPrint: detailRes.nhanSuForPrint,
        },
        {
          ngheNghieps: (nnRes.data || []) as VstDmRow[],
          khoas: (kRes.data || []) as VstDmRow[],
          khuVucs: (kvRes.data || []) as VstDmRow[],
        },
      );
      const qrCode = buildEntityQrCode("VST_SESSION", sessionId);
      let qrDataUrl = "";
      try {
        qrDataUrl = await generateEntityQrDataUrl(qrCode, { width: 200 });
      } catch {
        toast.error("Không tạo được mã QR trên phiếu");
      }
      setPrintData({ ...base, qrCode, qrDataUrl });

      // Wait for React to render the print view
      await new Promise<void>((resolve) =>
        globalThis.requestAnimationFrame(() =>
          globalThis.requestAnimationFrame(() => resolve())),
      );

      detachPrintFinish = attachPrintSessionFinish(finish);
      window.print();
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
