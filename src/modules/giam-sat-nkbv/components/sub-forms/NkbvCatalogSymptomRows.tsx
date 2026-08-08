"use client";

import React from "react";
import type { NkbvClinicalSymptomDef } from "../../lib/nkbv-clinical-symptom-catalog";
import { nkbvFormChrome as C } from "../../lib/nkbv-form-chrome";

type Props = {
  rows: NkbvClinicalSymptomDef[];
  form: Record<string, unknown>;
  onToggle: (formField: string, checked: boolean) => void;
  symptomDates: Record<string, string>;
  onSymptomDateChange: (key: string, date: string) => void;
  allowedEdit: boolean;
  iwpStart?: string;
  iwpEnd?: string;
  disabled?: boolean;
};

/** Checklist triệu chứng lấy từ SSOT catalog — checkbox + ngày ∈ cửa sổ. */
export default function NkbvCatalogSymptomRows({
  rows,
  form,
  onToggle,
  symptomDates,
  onSymptomDateChange,
  allowedEdit,
  iwpStart,
  iwpEnd,
  disabled = false,
}: Props) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const key = row.form_field!;
        const checked = form[key] === true;
        return (
          <div key={row.id} className="rounded-xl border border-slate-100 bg-white/60 p-2 space-y-1">
            <label className="flex items-start gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={checked}
                disabled={!allowedEdit || disabled}
                onChange={(e) => onToggle(key, e.target.checked)}
              />
              <span>
                {row.name_vi}
                {row.threshold_note ? (
                  <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                    {row.threshold_note}
                  </span>
                ) : null}
              </span>
            </label>
            {checked ? (
              <input
                type="date"
                value={symptomDates[key] || ""}
                disabled={!allowedEdit || disabled}
                min={iwpStart || undefined}
                max={iwpEnd || undefined}
                onChange={(e) => onSymptomDateChange(key, e.target.value)}
                className={`ml-6 ${C.controlInput} max-w-[11rem] text-xs`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
