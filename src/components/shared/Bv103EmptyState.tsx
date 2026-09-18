"use client";

import React from "react";
import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";

type Props = {
  title: string;
  action?: React.ReactNode;
};

/** Trạng thái trống — 1 câu + nút (page-chrome-contract). */
export function Bv103EmptyState({ title, action }: Props) {
  return (
    <div className="rounded-[var(--radius-shell)] border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
      <p className={UI.emptyTitle}>{title}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
