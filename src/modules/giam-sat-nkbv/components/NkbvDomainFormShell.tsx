"use client";

import React from "react";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";

export type NkbvDomainFormShellProps = {
  title: string;
  /** Nhãn ngắn loại phiếu — không dùng mã tài liệu nội bộ trên UI */
  subtypeLabel?: string;
  /** Yếu tố xác định khung thời gian + hướng dẫn ngắn */
  indexFactorHint: string;
  windowLabel?: string;
  windowStart?: string | null;
  windowEnd?: string | null;
  windowExtra?: string;
  classificationBadge?: string | null;
  children: React.ReactNode;
  /** Ẩn banner — dùng trong NkbvDiagnosticCaseForm (hàng đã có mốc). */
  embedded?: boolean;
  /** @deprecated dùng subtypeLabel */
  chapterHint?: string;
  /** @deprecated dùng indexFactorHint */
  triggerHint?: string;
};

/** Envelope phiếu — banner loại + cửa sổ thời gian (IWP / Event Period / Surveillance). */
export default function NkbvDomainFormShell({
  title,
  subtypeLabel,
  indexFactorHint,
  chapterHint,
  triggerHint,
  windowLabel,
  windowStart,
  windowEnd,
  windowExtra,
  classificationBadge,
  embedded = false,
  children,
}: NkbvDomainFormShellProps) {
  const subtype = subtypeLabel ?? chapterHint;
  const factorHint = indexFactorHint || triggerHint || "";

  return (
    <div className={`${C.sectionGap} space-y-4`}>
      {!embedded ? (
        <div className="rounded-[var(--radius-shell)] border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-3 space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className={C.panelTitle}>{title}</h3>
            {subtype ? (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {subtype}
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-slate-600">
            <span className="font-semibold text-slate-700">Yếu tố xác định khung: </span>
            {factorHint}
          </p>
          {(windowLabel || windowStart) && (
            <p className="text-[11px] font-medium text-sky-900">
              <span className="font-semibold">{windowLabel || "Cửa sổ"}:</span>{" "}
              {windowStart && windowEnd
                ? `${windowStart} → ${windowEnd}`
                : "Chưa tính được — bổ sung ngày sự kiện / triệu chứng"}
              {windowExtra ? ` · ${windowExtra}` : ""}
            </p>
          )}
          {classificationBadge ? (
            <p className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
              Phân loại: {classificationBadge}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
