"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildLocationQrCode } from "@/lib/entity-qr/entity-qr-core";
import { generateEntityQrDataUrl } from "@/lib/entity-qr/generate-entity-qr";
import EntityQrBlock from "@/components/shared/EntityQrBlock";
import { buildPrintFileTitle, sanitizePrintFileSegment } from "@/lib/print/print-file-title";

type Props = {
  kind: "LOC_KHOA" | "LOC_KHU";
  ma: string;
  ten?: string;
  className?: string;
};

/**
 * In tem QR vị trí (khoa / khu vực) — dán giường-phòng / khu giám sát.
 * Quét → mở form GSC với mã vị trí.
 * Phải dùng `#print-area` để khớp CSS in toàn cục (chỉ hiện vùng này).
 */
export default function LocationQrPrintButton({ kind, ma, ten, className }: Props) {
  const [busy, setBusy] = useState(false);
  const [print, setPrint] = useState<{ code: string; dataUrl: string } | null>(null);
  const fileTitleRef = useRef("");

  useEffect(() => {
    if (!print) return;
    const saved = document.title;
    const onBefore = () => {
      document.title = fileTitleRef.current || saved;
    };
    const onAfter = () => {
      document.title = saved;
    };
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
      document.title = saved;
    };
  }, [print]);

  const onPrint = async () => {
    const code = buildLocationQrCode(kind, ma);
    if (!code) {
      toast.error("Thiếu mã để in QR vị trí");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await generateEntityQrDataUrl(code, { width: 320 });
      fileTitleRef.current = buildPrintFileTitle({
        loai: "TEMLOC",
        ma: sanitizePrintFileSegment(code),
      });
      setPrint({ code, dataUrl });
      await new Promise<void>((r) =>
        globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(() => r())),
      );
      window.print();
    } catch {
      toast.error("Không tạo được tem QR");
    } finally {
      setBusy(false);
      window.setTimeout(() => setPrint(null), 800);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void onPrint()}
        disabled={busy || !ma}
        className={
          className ||
          "text-[11px] font-semibold text-[var(--primary)] hover:underline disabled:opacity-50"
        }
        aria-label="In tem QR vị trí"
        title="In tem QR vị trí"
      >
        {busy ? <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" /> : null}
        In
      </button>
      {print ? (
        <div id="print-area" className="print-area hidden print:block">
          <div className="print-a4-page" style={{ textAlign: "center", padding: "12mm 8mm", fontFamily: "'Times New Roman', Times, serif", color: "#000" }}>
            <p style={{ fontWeight: 800, fontSize: 14, margin: "0 0 4px", textTransform: "uppercase" }}>
              BỆNH VIỆN QUÂN Y 103
            </p>
            <p style={{ fontSize: 12, margin: "0 0 12px", fontWeight: 700 }}>
              {kind === "LOC_KHOA" ? "TEM VỊ TRÍ KHOA / PHÒNG" : "TEM VỊ TRÍ KHU VỰC GIÁM SÁT"}
            </p>
            {ten ? (
              <p style={{ fontWeight: 700, fontSize: 16, margin: "0 0 12px", textTransform: "uppercase" }}>{ten}</p>
            ) : null}
            <EntityQrBlock
              dataUrl={print.dataUrl}
              code={print.code}
              caption="Quét để mở giám sát tại vị trí"
              variant="center"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
