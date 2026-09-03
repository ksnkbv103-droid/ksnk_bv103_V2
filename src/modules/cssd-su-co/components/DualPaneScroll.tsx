"use client";

import React from "react";
import type { MoveSideKind } from "@/lib/domain/cssd-set-reconcile";

/** Hai sổ ngang — cùng cao, viền như bảng danh mục. */
export default function DualPaneScroll({
  toolbar,
  className = "",
  children,
}: {
  toolbar?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex h-[min(62dvh,36rem)] min-h-[18rem] flex-col overflow-hidden rounded-[var(--radius-table)] bg-white ring-1 ring-slate-200/90 ${className}`.trim()}
    >
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
