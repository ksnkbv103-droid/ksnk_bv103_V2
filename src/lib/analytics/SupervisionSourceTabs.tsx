"use client";

import React from "react";
import {
  SUPERVISION_SOURCE_LENS_LABEL,
} from "@/lib/analytics/supervision-source-lens";
import type { SupervisionSourceView } from "@/lib/analytics/supervision-source-tabs";

type Props = {
  value: SupervisionSourceView;
  onChange: (view: SupervisionSourceView) => void;
  disabled?: boolean;
};

const TABS: { id: SupervisionSourceView; label: string }[] = [
  { id: "ksnk", label: SUPERVISION_SOURCE_LENS_LABEL.ksnk },
  { id: "tgs", label: SUPERVISION_SOURCE_LENS_LABEL.tgs },
  { id: "sosanh", label: "So sánh" },
];

/** Tab cố định thay nút chuyển nguồn: Chuyên trách · Tự giám sát · So sánh. */
export function SupervisionSourceTabs({ value, onChange, disabled }: Props) {
  return (
    <div role="tablist" aria-label="Nguồn giám sát" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {TABS.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(t.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white"
            } ${disabled ? "opacity-50" : ""}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
