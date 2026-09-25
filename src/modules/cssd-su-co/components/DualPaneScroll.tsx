"use client";

import React from "react";
import type { MoveSideKind } from "@/lib/domain/cssd-set-reconcile";

/** Hai sổ ngang — cùng cao, viền như bảng danh mục. Mobile: thấp hơn để stack đọc được. */
export default function DualPaneScroll({
  toolbar,
  paneLabel,
  className = "",
  children,
}: {
  toolbar?: React.ReactNode;
  /** Nhãn sticky (vd. Nguồn / Đích) — hữu ích khi hai pane xếp dọc dưới lg. */
  paneLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex h-[min(42dvh,22rem)] min-h-[12rem] flex-col overflow-hidden rounded-[var(--radius-table)] bg-white ring-1 ring-slate-200/90 md:h-[min(52dvh,30rem)] md:min-h-[16rem] lg:h-[min(62dvh,36rem)] lg:min-h-[18rem] ${className}`.trim()}
    >
      {paneLabel ? (
        <div className="sticky top-0 z-[1] shrink-0 border-b border-slate-200 bg-slate-100/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
          {paneLabel}
        </div>
      ) : null}
      {toolbar ? (
        <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 px-2.5 py-1.5">{toolbar}</div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-y-contain">{children}</div>
    </div>
  );
}

export function MovePaneToolbar({
  kind,
  onKind,
  extra,
}: {
  kind: MoveSideKind;
  onKind: (kind: MoveSideKind) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex shrink-0">
        {(["kho", "bo"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onKind(k)}
            className={`h-8 px-2.5 text-[11px] font-semibold ${
              kind === k
                ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {k === "kho" ? "Kho" : "Bộ"}
          </button>
        ))}
      </div>
      <div className="min-w-0 flex-1">{extra}</div>
    </div>
  );
}
