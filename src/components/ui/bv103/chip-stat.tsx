import * as React from "react";
import { cn } from "@/lib/utils";

/** Nhãn trạng thái dạng pill. Màu theo ý nghĩa: ok = xanh, warn = vàng, danger = đỏ, neutral = xám. */
const tones = {
  neutral: "bg-slate-100 text-slate-700",
  ok: "bg-green-50 text-green-800",
  warn: "bg-amber-50 text-amber-900",
  danger: "bg-red-50 text-red-800",
} as const;

export function Bv103Chip({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Ô số liệu KPI: nhãn trên, số lớn dưới, ghi chú phụ tùy chọn. Không viền, không nền riêng. */
export function Bv103StatTile({
  label,
  value,
  note,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="bv103-type-label">{label}</div>
      <div className="bv103-type-kpi mt-1">{value}</div>
      {note ? <div className="bv103-type-label mt-0.5">{note}</div> : null}
    </div>
  );
}
