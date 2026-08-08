"use client";

import React from "react";
import { useEntityQrImage } from "@/hooks/useEntityQr";

/** QR nhỏ cùng dòng mã — danh sách / bảng. */
export default function InlineEntityQrThumb({
  code,
  size = 36,
  className = "",
}: {
  code: string;
  size?: number;
  className?: string;
}) {
  const value = String(code || "").trim();
  const dataUrl = useEntityQrImage(value || null, Math.max(80, size * 2));
  if (!value || !dataUrl) {
    return (
      <span
        className={`inline-block shrink-0 rounded border border-dashed border-slate-200 bg-slate-50 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`QR ${value}`}
      width={size}
      height={size}
      className={`shrink-0 rounded border border-slate-100 bg-white ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
