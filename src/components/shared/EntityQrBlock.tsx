"use client";

import React from "react";

type Variant = "center" | "compact" | "screen";

/**
 * Khối QR dùng chung — in phiếu A4, tem, hoặc hiện trên UI.
 * Parent truyền sẵn dataUrl (sinh trước khi window.print).
 */
export default function EntityQrBlock({
  dataUrl,
  code,
  caption = "Quét để mở lại phiếu",
  variant = "center",
}: {
  dataUrl: string;
  code: string;
  caption?: string;
  variant?: Variant;
}) {
  const displayCode = String(code || "").trim();
  if (!dataUrl || !displayCode) return null;

  if (variant === "screen") {
    return (
      <div className="inline-flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={`QR ${displayCode}`} className="h-28 w-28" />
        <p className="max-w-[10rem] break-all text-center font-mono text-[11px] font-bold tracking-wide text-slate-800">
          {displayCode}
        </p>
        <p className="bv103-type-note">{caption}</p>
      </div>
    );
  }

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          alt={`QR ${displayCode}`}
          style={{ width: 76, height: 76, display: "block" }}
        />
        <p
          style={{
            fontFamily: "monospace",
            fontWeight: 800,
            fontSize: 10,
            margin: "4px 0 0",
            letterSpacing: "0.03em",
            lineHeight: 1.2,
            maxWidth: 96,
            wordBreak: "break-all",
          }}
        >
          {displayCode}
        </p>
        <p style={{ fontSize: 9, fontStyle: "italic", margin: "2px 0 0", color: "#444", maxWidth: 96 }}>
          {caption}
        </p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", marginBottom: 12, pageBreakInside: "avoid" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={`QR ${displayCode}`}
        style={{ width: 112, height: 112, margin: "0 auto", display: "block" }}
      />
      <p
        style={{
          fontFamily: "monospace",
          fontWeight: 800,
          fontSize: 12,
          margin: "8px 0 2px",
          letterSpacing: "0.04em",
          wordBreak: "break-all",
        }}
      >
        {displayCode}
      </p>
      <p style={{ fontSize: 11, fontStyle: "italic", margin: 0, color: "#333" }}>{caption}</p>
    </div>
  );
}
