// src/modules/giam-sat-chung/hooks/use-gsc-print.ts
"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { loadGscViewBundle, type GscViewBundle } from "../lib/load-gsc-view-bundle";
import { buildEntityQrCode } from "@/lib/entity-qr/entity-qr-core";
import { generateEntityQrDataUrl } from "@/lib/entity-qr/generate-entity-qr";

export type GscPrintBundle = GscViewBundle & {
  qrCode?: string;
  qrDataUrl?: string;
};

export function useGscPrint(dbTemplates: Record<string, unknown>[]) {
  const [printingBundle, setPrintingBundle] = useState<GscPrintBundle | null>(null);
  const printLocked = useRef(false);

  const buildBundle = useCallback(
    async (session: Record<string, unknown>): Promise<GscViewBundle | null> => {
      const res = await loadGscViewBundle(dbTemplates, session);
      if (!res.ok) {
        toast.error(res.error);
        return null;
      }
      return res.bundle;
    },
    [dbTemplates],
  );

  const onPrint = useCallback(
    async (session: Record<string, unknown>) => {
      if (printLocked.current) return;
      printLocked.current = true;
      const b = await buildBundle(session);
      if (!b) {
        printLocked.current = false;
        return;
      }
      const sid = String(b.session.id || session.id || "").trim();
      const qrCode = sid ? buildEntityQrCode("GSC_SESSION", sid) : "";
      let qrDataUrl = "";
      if (qrCode) {
        try {
          qrDataUrl = await generateEntityQrDataUrl(qrCode, { width: 200 });
        } catch {
          toast.error("Không tạo được mã QR trên phiếu");
        }
      }
      setPrintingBundle({ ...b, qrCode, qrDataUrl });

      let settled = false;
      const timeout = { id: undefined as number | undefined };
      const finish = () => {
        if (settled) return;
        settled = true;
        if (timeout.id !== undefined) window.clearTimeout(timeout.id);
        window.removeEventListener("afterprint", finish);
        setPrintingBundle(null);
        printLocked.current = false;
      };

      await new Promise<void>((resolve) =>
        globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(() => resolve())),
      );

      window.addEventListener("afterprint", finish);
      window.print();
      timeout.id = window.setTimeout(finish, 45_000);
    },
    [buildBundle],
  );

  return {
    printingBundle,
    onPrint,
    buildBundle
  };
}
