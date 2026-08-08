"use client";

import type { TraLoi } from "@/lib/dao-tao/types";
import { cn } from "@/lib/utils";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

type Option = {
  id: string;
  noiDung: string;
  displayIndex?: number;
  tfDung?: boolean | null;
};

type Props = {
  loai: string;
  stem: string;
  options: Option[];
  value: TraLoi | null;
  onChange: (v: TraLoi) => void;
  disabled?: boolean;
  showResult?: boolean;
  dung?: boolean | null;
  giaiThich?: string | null;
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const optionBtn = (active: boolean, disabled?: boolean) =>
  cn(
    "flex w-full items-start gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 text-left transition",
    active
      ? "border-[var(--primary)]/45 bg-[var(--primary)]/[0.04] ring-1 ring-[var(--primary)]/15"
      : "border-slate-200 bg-white hover:border-slate-300",
    disabled && "cursor-default opacity-90",
  );

export function DaoTaoQuestionCard({
  loai,
  stem,
  options,
  value,
  onChange,
  disabled,
  showResult,
  dung,
  giaiThich,
}: Props) {
  const ordered = [...(options ?? [])].sort(
    (a, b) => (a.displayIndex ?? 0) - (b.displayIndex ?? 0),
  );

  return (
    <div className="rounded-[var(--radius-shell)] border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.02] sm:p-5">
      <p className="mb-4 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-800">
        {stem}
      </p>

      {loai === "single" && (
        <div className="grid gap-2">
          {ordered.map((o, i) => {
            const checked = value?.kind === "single" && value.optionId === o.id;
            return (
              <button
                key={o.id}
                type="button"
                disabled={disabled}
                className={optionBtn(!!checked, disabled)}
                onClick={() => onChange({ kind: "single", optionId: o.id })}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                  {LETTERS[i] ?? i + 1}
                </span>
                <span className="text-sm text-slate-700">{o.noiDung}</span>
              </button>
            );
          })}
        </div>
      )}

      {loai === "multi" && (
        <div className="grid gap-2">
          <p className={T.labelBlock}>Chọn tất cả đáp án đúng</p>
          {ordered.map((o, i) => {
            const selected =
              value?.kind === "multi" ? value.optionIds.includes(o.id) : false;
            return (
              <button
                key={o.id}
                type="button"
                disabled={disabled}
                className={optionBtn(selected, disabled)}
                onClick={() => {
                  const prev = value?.kind === "multi" ? value.optionIds : [];
                  const next = selected
                    ? prev.filter((id) => id !== o.id)
                    : [...prev, o.id];
                  onChange({ kind: "multi", optionIds: next });
                }}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px]",
                    selected
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-slate-300 bg-white text-slate-500",
                  )}
                >
                  {selected ? "✓" : LETTERS[i]}
                </span>
                <span className="text-sm text-slate-700">{o.noiDung}</span>
              </button>
            );
          })}
        </div>
      )}

      {loai === "true_false_cluster" && (
        <div className="grid gap-3">
          {ordered.map((o, i) => {
            const cur =
              value?.kind === "true_false_cluster" ? value.byOptionId[o.id] : null;
            return (
              <div
                key={o.id}
                className="rounded-[var(--radius-control)] border border-slate-200 bg-slate-50/50 p-3"
              >
                <p className="mb-2 text-sm text-slate-700">
                  <span className="mr-1.5 font-semibold text-slate-500">{LETTERS[i]}.</span>
                  {o.noiDung}
                </p>
                <div className="flex gap-2">
                  {(
                    [
                      [true, "Đúng"],
                      [false, "Sai"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={label}
                      type="button"
                      disabled={disabled}
                      className={cn(
                        "min-h-9 flex-1 rounded-[var(--radius-control)] border text-sm font-semibold transition",
                        cur === val
                          ? val
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : "border-rose-300 bg-rose-50 text-rose-800"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                      )}
                      onClick={() => {
                        const base =
                          value?.kind === "true_false_cluster"
                            ? { ...value.byOptionId }
                            : {};
                        onChange({
                          kind: "true_false_cluster",
                          byOptionId: { ...base, [o.id]: val },
                        });
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loai === "order" && (
        <OrderEditor
          options={ordered}
          value={
            value?.kind === "order" ? value.orderedOptionIds : ordered.map((o) => o.id)
          }
          disabled={disabled}
          onChange={(ids) => onChange({ kind: "order", orderedOptionIds: ids })}
        />
      )}

      {showResult && (
        <div
          className={cn(
            "mt-4 rounded-[var(--radius-control)] px-3 py-2.5 text-sm",
            dung ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900",
          )}
        >
          <p className="font-semibold">{dung ? "Đúng" : "Chưa đúng"}</p>
          {giaiThich ? (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed opacity-90">
              {giaiThich}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function OrderEditor({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Option[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const byId = new Map(options.map((o) => [o.id, o]));
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...value];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  return (
    <div className="grid gap-2">
      <p className={T.labelBlock}>
        Sắp xếp thứ tự đúng bằng nút ↑ ↓. Hệ thống chấm theo nội dung bước, không theo nhãn A/B/C/D.
      </p>
      {value.map((id, idx) => {
        const o = byId.get(id);
        if (!o) return null;
        return (
          <div
            key={id}
            className="flex items-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-2.5 py-2"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
              {idx + 1}
            </span>
            <span className="flex-1 text-sm text-slate-700">{o.noiDung}</span>
            <button
              type="button"
              className={cn(T.btnSecondary, "h-8 px-2")}
              disabled={disabled || idx === 0}
              onClick={() => move(idx, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className={cn(T.btnSecondary, "h-8 px-2")}
              disabled={disabled || idx === value.length - 1}
              onClick={() => move(idx, 1)}
            >
              ↓
            </button>
          </div>
        );
      })}
    </div>
  );
}
