"use client";

import React from "react";
import {
  SUPERVISION_SOURCE_LENS_LABEL,
  type SupervisionSourceLens,
} from "@/lib/analytics/supervision-source-lens";

type Props = {
  value: SupervisionSourceLens;
  onChange: (lens: SupervisionSourceLens) => void;
  disabled?: boolean;
  className?: string;
};

/** Toggle Chuyên trách | Tự giám sát — một nguồn trên fold chính. */
export function SupervisionSourceLensToggle({ value, onChange, disabled, className }: Props) {
  return (
    <div
      className={`inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 ${className ?? ""}`}
      role="group"
      aria-label="Nguồn giám sát"
    >
      {(["ksnk", "tgs"] as const).map((lens) => {
        const active = value === lens;
        return (
          <button
            key={lens}
            type="button"
            disabled={disabled}
            onClick={() => onChange(lens)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white"
            } ${disabled ? "opacity-50" : ""}`}
            aria-pressed={active}
          >
            {SUPERVISION_SOURCE_LENS_LABEL[lens]}
          </button>
        );
      })}
    </div>
  );
}
