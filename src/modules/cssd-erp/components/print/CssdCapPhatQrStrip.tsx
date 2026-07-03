"use client";

import React from "react";
import CssdPrintQrBlock from "./CssdPrintQrBlock";

/** Ba mã QR trên phiếu cấp phát: bộ · chu trình · mẻ tiệt khuẩn. */
export default function CssdCapPhatQrStrip({
  maQrBo,
  maCycleQr,
  maLo,
  qrBoDataUrl,
  qrCycleDataUrl,
  qrMeDataUrl,
}: {
  maQrBo: string;
  maCycleQr: string | null;
  maLo: string;
  qrBoDataUrl: string;
  qrCycleDataUrl: string | null;
  qrMeDataUrl: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 14,
        pageBreakInside: "avoid",
      }}
    >
      <CssdPrintQrBlock
        variant="compact"
        dataUrl={qrBoDataUrl}
        code={maQrBo}
        caption="Mã QR bộ dụng cụ"
      />
      {qrCycleDataUrl && maCycleQr ? (
        <CssdPrintQrBlock
          variant="compact"
          dataUrl={qrCycleDataUrl}
          code={maCycleQr}
          caption="Mã chu trình xử lý"
        />
      ) : (
        <div
          style={{
            flex: 1,
            textAlign: "center",
            border: "1px dashed #ccc",
            borderRadius: 8,
            padding: "12px 6px",
            fontSize: 10,
            color: "#666",
            minWidth: 88,
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, textTransform: "uppercase" }}>Chu trình</p>
          <p style={{ margin: "6px 0 0", fontStyle: "italic" }}>Chưa có mã</p>
        </div>
      )}
      <CssdPrintQrBlock
        variant="compact"
        dataUrl={qrMeDataUrl}
        code={maLo}
        caption="Mã mẻ tiệt khuẩn"
      />
    </div>
  );
}
