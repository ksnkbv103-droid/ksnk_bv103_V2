// src/modules/giam-sat-chung/hooks/use-gsc-print.ts
"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { loadGscViewBundle, type GscViewBundle } from "../lib/load-gsc-view-bundle";

export function useGscPrint(dbTemplates: Record<string, unknown>[]) {
  const [printingBundle, setPrintingBundle] = useState<GscViewBundle | null>(null);
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
      setPrintingBundle(b);

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
