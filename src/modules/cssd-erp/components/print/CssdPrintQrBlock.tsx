"use client";

import React from "react";

/** Khối QR in phiếu CSSD — mã bộ / chu trình / mẻ. */
export default function CssdPrintQrBlock({
  dataUrl,
  code,
  maLo,
  caption,
  variant = "center",
}: {
  dataUrl: string;
  /** Nội dung mã in dưới QR (ưu tiên `code`, fallback `maLo`). */
  code?: string;
  maLo?: string;
  caption?: string;
  variant?: "center" | "compact";
}) {
  const displayCode = String(code || maLo || "").trim();
  const hint = caption || "Quét truy vết";
  if (variant === "compact") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          pageBreakInside: "avoid",
          flexShrink: 0,
        }}
      >
        <img
          src={dataUrl}
          alt={`QR ${displayCode}`}
          style={{ width: 76, height: 76, display: "block" }}
        />
        <p
          style={{
            fontFamily: "monospace",
            fontWeight: 800,
            fontSize: 11,
            margin: "4px 0 0",
            letterSpacing: "0.04em",
            lineHeight: 1.2,
          }}
        >
          {displayCode}
        </p>
        <p style={{ fontSize: 9, fontStyle: "italic", margin: "2px 0 0", color: "#444", maxWidth: 88 }}>
          {hint}
        </p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", marginBottom: 16, pageBreakInside: "avoid" }}>
      <img src={dataUrl} alt={`QR ${displayCode}`} style={{ width: 112, height: 112, margin: "0 auto" }} />
      <p
        style={{
          fontFamily: "monospace",
          fontWeight: 800,
          fontSize: 15,
          margin: "8px 0 2px",
          letterSpacing: "0.05em",
        }}
      >
        {displayCode}
      </p>
      <p style={{ fontSize: 11, fontStyle: "italic", margin: 0, color: "#333" }}>
        {hint}
      </p>
    </div>
  );
}
