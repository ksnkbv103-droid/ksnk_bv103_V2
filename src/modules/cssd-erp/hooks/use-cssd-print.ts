"use client";

import { useState, useCallback } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  fetchCssdBatchPrintData,
  fetchCssdBatchPrintDataByMaLo,
  fetchCssdCapPhatPrintData,
  fetchCssdCapPhatPrintDataByQr,
} from "../actions/cssd-print.actions";
import type { CssdBatchPrintData, CssdCapPhatPrintData } from "../types/cssd-print.types";

export type CssdCapPhatPrintQrs = {
  qrBoDataUrl: string;
  qrCycleDataUrl: string | null;
  qrMeDataUrl: string;
};

export type CssdPrintState =
  | { kind: "batch"; data: CssdBatchPrintData; qrDataUrl: string }
  | { kind: "capPhat"; data: CssdCapPhatPrintData; qrs: CssdCapPhatPrintQrs }
  | null;

function attachPrintFinish(onFinish: () => void): () => void {
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
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onPrintMq);
    else mq.addListener(onPrintMq);
  }
  const timer = window.setTimeout(once, 45_000);
  return () => {
    window.removeEventListener("afterprint", onAfterPrint);
    if (mq) {
      if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", onPrintMq);
      else mq.removeListener(onPrintMq);
    }
    window.clearTimeout(timer);
  };
}

async function qrForCode(code: string): Promise<string> {
  return QRCode.toDataURL(code, { margin: 1, width: 280, color: { dark: "#000000", light: "#ffffff" } });
}

async function buildCapPhatPrintQrs(data: CssdCapPhatPrintData): Promise<CssdCapPhatPrintQrs> {
  const maCycle = String(data.maCycleQr || "").trim();
  const [qrBoDataUrl, qrCycleDataUrl, qrMeDataUrl] = await Promise.all([
    qrForCode(data.maQrBo),
    maCycle ? qrForCode(maCycle) : Promise.resolve(null),
    qrForCode(data.maLo),
  ]);
  return { qrBoDataUrl, qrCycleDataUrl, qrMeDataUrl };
}

export function useCssdPrint() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printState, setPrintState] = useState<CssdPrintState>(null);

  const runPrint = useCallback(async (state: NonNullable<CssdPrintState>) => {
    setPrintState(state);
    await new Promise<void>((resolve) =>
      globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(() => resolve())),
    );
    let detach: (() => void) | null = null;
    const finish = () => {
      detach?.();
      detach = null;
      setPrintState(null);
      setIsPrinting(false);
    };
    detach = attachPrintFinish(finish);
    window.print();
  }, []);

  const onPrintBatch = useCallback(
    async (opts: { batchId?: string; maLo?: string }) => {
      if (isPrinting) return;
      setIsPrinting(true);
      try {
        const res = opts.batchId
          ? await fetchCssdBatchPrintData(opts.batchId)
          : await fetchCssdBatchPrintDataByMaLo(String(opts.maLo || ""));
        if (!res.success) {
          toast.error(res.error || "Không tải phiếu mẻ.");
          setIsPrinting(false);
          return;
        }
        const qrDataUrl = await qrForCode(res.data.maLo);
        await runPrint({ kind: "batch", data: res.data, qrDataUrl });
        toast.success("Đã mở lệnh in phiếu mẻ tiệt khuẩn.");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Lỗi in phiếu mẻ.");
        setIsPrinting(false);
        setPrintState(null);
      }
    },
    [isPrinting, runPrint],
  );

  const onPrintCapPhat = useCallback(
    async (opts: { quyTrinhId?: string; qr?: string; nguoiCapPhat?: string }) => {
      if (isPrinting) return;
      setIsPrinting(true);
      try {
        const res = opts.quyTrinhId
          ? await fetchCssdCapPhatPrintData(opts.quyTrinhId)
          : await fetchCssdCapPhatPrintDataByQr(String(opts.qr || ""));
        if (!res.success) {
          toast.error(res.error || "Không tải phiếu cấp phát.");
          setIsPrinting(false);
          return;
        }
        const data = {
          ...res.data,
          nguoiCapPhat: opts.nguoiCapPhat?.trim() || res.data.nguoiCapPhat,
        };
        const qrs = await buildCapPhatPrintQrs(data);
        await runPrint({ kind: "capPhat", data, qrs });
        toast.success("Đã mở lệnh in phiếu cấp phát.");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Lỗi in phiếu cấp phát.");
        setIsPrinting(false);
        setPrintState(null);
      }
    },
    [isPrinting, runPrint],
  );

  return { isPrinting, printState, onPrintBatch, onPrintCapPhat };
}
