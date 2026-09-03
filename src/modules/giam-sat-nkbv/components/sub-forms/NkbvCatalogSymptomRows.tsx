"use client";

import React from "react";
import type { NkbvClinicalSymptomDef } from "../../lib/nkbv-clinical-symptom-catalog";
import { nkbvFormChrome as C } from "../../lib/nkbv-form-chrome";
import { useNkbvSymptomReview } from "./NkbvSymptomReviewContext";

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

function SymptomRow({
  row,
  form,
  onToggle,
  symptomDates,
  onSymptomDateChange,
  allowedEdit,
  iwpStart,
  iwpEnd,
  disabled,
}: {
  row: NkbvClinicalSymptomDef;
  form: Record<string, unknown>;
  onToggle: (formField: string, checked: boolean) => void;
  symptomDates: Record<string, string>;
  onSymptomDateChange: (key: string, date: string) => void;
  allowedEdit: boolean;
  iwpStart?: string;
  iwpEnd?: string;
  disabled: boolean;
}) {
  const key = row.form_field!;
  const date = symptomDates[key] || "";
  const present = form[key] === true || Boolean(date);
  const { entry, onChange: onReview } = useNkbvSymptomReview(key);
  const canEdit = allowedEdit && !disabled;

  const setDate = (next: string) => {
    onSymptomDateChange(key, next);
    onToggle(key, Boolean(next));
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-white/60 p-2 space-y-2">
      <p className="text-xs font-semibold text-slate-800">
        {row.name_vi}
        {row.threshold_note ? (
          <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
            {row.threshold_note}
          </span>
        ) : null}
      </p>
      <label className="block space-y-0.5">
        <span className="text-[11px] font-medium text-slate-500">Ngày mốc (lưới bệnh án)</span>
        <input
          type="date"
          value={date}
          disabled={!canEdit}
          min={iwpStart || undefined}
          max={iwpEnd || undefined}
          onChange={(e) => setDate(e.target.value)}
          className={`${C.controlInput} max-w-[11rem] text-xs`}
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block space-y-0.5">
          <span className="text-[11px] font-medium text-slate-500">Xác nhận (KSNK)</span>
          <select
            className={`${C.controlInput} w-full text-xs`}
            disabled={!canEdit}
            value={entry.confirmed}
            onChange={(e) => {
              const confirmed = e.target.value as "chua" | "dung" | "sai";
              onReview({ confirmed });
              if (confirmed === "sai") {
                setDate("");
              } else if (confirmed === "dung" && !date && present) {
                onToggle(key, true);
              }
            }}
          >
            <option value="chua">Chưa xác nhận</option>
            <option value="dung">Đúng — dùng để chẩn đoán</option>
            <option value="sai">Sai — bỏ khỏi lưới</option>
          </select>
        </label>
        <label className="block space-y-0.5">
          <span className="text-[11px] font-medium text-slate-500">Ghi chú KSNK</span>
          <input
            type="text"
            className={`${C.controlInput} w-full text-xs`}
            disabled={!canEdit}
            value={entry.note}
            placeholder="Ý kiến khoa / lý do sửa…"
            onChange={(e) => onReview({ note: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}

/** Triệu chứng = mốc ngày; KSNK ghi nhận xác nhận + ghi chú. Đổi ngày → đồng bộ lưới. */
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
      {rows.map((row) => (
        <SymptomRow
          key={row.id}
          row={row}
          form={form}
          onToggle={onToggle}
          symptomDates={symptomDates}
          onSymptomDateChange={onSymptomDateChange}
          allowedEdit={allowedEdit}
          iwpStart={iwpStart}
          iwpEnd={iwpEnd}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
