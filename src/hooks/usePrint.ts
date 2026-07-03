"use client";

import { useState, useCallback } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";

type MinimalLabelInput = {
  /** Mã bộ SSOT — QR và chữ in cùng một mã (vd. B01.SET.01). */
  qrCode: string;
  tenBo: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMinimalThermalLabelHtml(opts: {
  qrDataUrl: string;
  qrCode: string;
  displayCode: string;
  tenBo: string;
  kindLabel?: string;
}): string {
  const code = escapeHtml(opts.displayCode);
  const name = escapeHtml(opts.tenBo);
  const kind = opts.kindLabel ? `<p class="kind">${escapeHtml(opts.kindLabel)}</p>` : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <title>${escapeHtml(opts.qrCode)}</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      * { box-sizing: border-box; }
      body {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        width: 72mm;
        margin: 0 auto;
        padding: 5mm 2mm 4mm;
        text-align: center;
        color: #000;
      }
      .wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0;
      }
      .qr img {
        width: 50mm;
        height: 50mm;
        display: block;
        margin: 0 auto;
      }
      .kind {
        margin: 0 0 2mm;
        font-size: 8pt;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #333;
      }
      .code {
        margin: 3mm 0 2mm;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 13pt;
        font-weight: 900;
        letter-spacing: 0.04em;
        line-height: 1.2;
        word-break: break-all;
      }
      .name {
        margin: 0;
        max-width: 68mm;
        font-size: 11pt;
        font-weight: 700;
        line-height: 1.3;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="qr"><img src="${opts.qrDataUrl}" alt="QR" /></div>
      ${kind}
      <p class="code">${code}</p>
      <p class="name">${name}</p>
    </div>
    <script>
      window.onload = () => {
        setTimeout(() => { window.print(); window.close(); }, 300);
      };
    </script>
  </body>
</html>`;
}

async function openMinimalLabelPrint(
  input: MinimalLabelInput,
  kindLabel?: string,
): Promise<void> {
  const qrCode = String(input.qrCode || "").trim();
  const tenBo = String(input.tenBo || "").trim() || "Bộ dụng cụ CSSD";
  const displayCode = qrCode;

  const qrDataUrl = await QRCode.toDataURL(qrCode, {
    margin: 1,
    width: 320,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const printWindow = window.open("", "_blank", "width=420,height=520");
  if (!printWindow) throw new Error("Vui lòng cho phép mở popup để in");

  printWindow.document.write(
    buildMinimalThermalLabelHtml({ qrDataUrl, qrCode, displayCode, tenBo, kindLabel }),
  );
  printWindow.document.close();
}

/** In nhãn nhiệt — tem định danh bộ (danh mục / SUB mới). */
export function usePrint() {
  const [isPrinting, setIsPrinting] = useState(false);

  const printBoLabel = useCallback(async (input: MinimalLabelInput) => {
    setIsPrinting(true);
    const toastId = toast.loading("Đang chuẩn bị nhãn bộ...");
    try {
      await openMinimalLabelPrint(input);
      toast.success("Đã mở lệnh in nhãn bộ dụng cụ", { id: toastId });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error("Lỗi in: " + msg, { id: toastId });
      throw error;
    } finally {
      setIsPrinting(false);
    }
  }, []);

  const printCycleLabel = useCallback(async (input: Pick<MinimalLabelInput, "qrCode" | "tenBo">) => {
    setIsPrinting(true);
    const toastId = toast.loading("Đang chuẩn bị tem chu trình...");
    try {
      await openMinimalLabelPrint(
        { qrCode: input.qrCode, tenBo: input.tenBo },
        "Niêm phong · Chu trình",
      );
      toast.success("Đã mở lệnh in tem chu trình", { id: toastId });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error("Lỗi in: " + msg, { id: toastId });
      throw error;
    } finally {
      setIsPrinting(false);
    }
  }, []);

  const printMachineLabel = useCallback(async (input: Pick<MinimalLabelInput, "qrCode" | "tenBo">) => {
    setIsPrinting(true);
    const toastId = toast.loading("Đang chuẩn bị nhãn máy...");
    try {
      await openMinimalLabelPrint(
        { qrCode: input.qrCode, tenBo: input.tenBo },
        "Máy · Thiết bị CSSD",
      );
      toast.success("Đã mở lệnh in nhãn máy", { id: toastId });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error("Lỗi in: " + msg, { id: toastId });
      throw error;
    } finally {
      setIsPrinting(false);
    }
  }, []);

  return { isPrinting, printBoLabel, printCycleLabel, printMachineLabel };
}
