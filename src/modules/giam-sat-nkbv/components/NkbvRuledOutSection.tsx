"use client";

import React from "react";
import {
  NKBV_RULED_OUT_REASONS,
  toggleRuledOutReason,
  type NkbvRuledOutFields,
  type NkbvRuledOutSyndrome,
} from "../lib/nkbv-ruled-out";
import NkbvFormSection from "./NkbvFormSection";

type NkbvRuledOutSectionProps = {
  syndrome: NkbvRuledOutSyndrome;
  reasons: string[] | undefined;
  note?: string;
  allowedEdit: boolean;
  compact?: boolean;
  onChange: (next: NkbvRuledOutFields) => void;
};

/** Khối L3 Ruled-out — tick IP, không tự điền từ xét nghiệm. */
export default function NkbvRuledOutSection({
  syndrome,
  reasons,
  note,
  allowedEdit,
  compact = false,
  onChange,
}: NkbvRuledOutSectionProps) {
  const rows = NKBV_RULED_OUT_REASONS[syndrome];
  const selected = reasons || [];

  const emit = (nextReasons: string[], nextNote = note || "") => {
    onChange({
      ruled_out: nextReasons.length > 0,
      ruled_out_reasons: nextReasons.length ? nextReasons : undefined,
      ruled_out_note: nextNote.trim() || undefined,
    });
  };

  const checks = (
    <div className={compact ? "flex flex-wrap gap-x-3 gap-y-1" : "space-y-1.5"}>
      {rows.map((row) => (
        <label key={row.id} className="flex items-start gap-1.5 text-[11px] text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={selected.includes(row.id)}
            disabled={!allowedEdit}
            onChange={(e) => emit(toggleRuledOutReason(selected, row.id, e.target.checked))}
          />
          <span>{row.label}</span>
        </label>
      ))}
    </div>
  );

  if (compact) {
    return (
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-2">
        <p className="mb-1 text-[11px] font-semibold text-amber-950">
          Loại trừ (Ruled-out) — tick thì không tính NKBV
        </p>
        {checks}
      </div>
    );
  }

  return (
    <NkbvFormSection
      title="Loại trừ (Ruled-out) — Phần V"
      hint="Chỉ tick khi KSNK loại trừ có chủ đích. Không tự điền từ xét nghiệm. Ca loại trừ không vào tử số."
    >
      {checks}
      <textarea
        value={note || ""}
        disabled={!allowedEdit}
        rows={2}
        placeholder="Ghi chú giải trình (không bắt buộc)"
        onChange={(e) => emit(selected, e.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-700 disabled:opacity-60"
      />
    </NkbvFormSection>
  );
}
