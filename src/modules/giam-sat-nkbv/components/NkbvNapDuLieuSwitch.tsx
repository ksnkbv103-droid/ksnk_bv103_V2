"use client";

export type NkbvNapDuLieuTab = "vi-sinh" | "mau-so";

const OPTIONS: Array<{ id: NkbvNapDuLieuTab; label: string }> = [
  { id: "vi-sinh", label: "Cổng Vi sinh LIS" },
  { id: "mau-so", label: "Nộp mẫu số" },
];

/** Chuyển nhanh giữa hai cổng nạp dữ liệu NKBV (cùng một tab «Nạp dữ liệu»). */
export function NkbvNapDuLieuSwitch({
  value,
  onChange,
}: {
  value: NkbvNapDuLieuTab;
  onChange: (next: NkbvNapDuLieuTab) => void;
}) {
  return (
    <div role="group" aria-label="Loại dữ liệu nạp" className="no-print flex flex-wrap gap-2 px-4 pt-2">
      {OPTIONS.map((o) => {
        const sel = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={sel}
            onClick={() => onChange(o.id)}
            className={`h-11 touch-manipulation rounded-[var(--radius-control)] border px-4 text-sm font-semibold transition-colors ${
              sel
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
