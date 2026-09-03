"use client";

import React from "react";
import { clampTransferQtyInput } from "@/lib/domain/cssd-set-reconcile";

/** Ô số chuyển hẹp — không vượt tồn hiện có; không dùng controlInput (w-full). */
export default function QtyJumpField({
  value,
  onValue,
  max,
  disabled,
  arrow,
  onJump,
}: {
  value: string;
  onValue: (raw: string) => void;
  max: number;
  disabled?: boolean;
  arrow: "→" | "←";
  onJump: (qty: number) => void;
}) {
  const cap = Math.max(0, Math.floor(max));
  const shown = clampTransferQtyInput(value, cap);
  const qty = Math.floor(Number(shown) || 0);
  const jump = () => {
    if (disabled || qty < 1 || qty > cap) return;
    onJump(qty);
  };
  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        value={shown}
        disabled={disabled || cap < 1}
        onChange={(e) => onValue(clampTransferQtyInput(e.target.value, cap))}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          jump();
        }}
        className="h-8 w-14 shrink-0 rounded-[var(--radius-control)] border border-slate-200 bg-white px-1 text-center text-[12px] tabular-nums outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/15 disabled:bg-slate-50 disabled:text-slate-400"
      />
      <button
        type="button"
        disabled={disabled || cap < 1 || qty < 1}
        onClick={jump}
        className="h-8 shrink-0 px-2 text-[11px] font-semibold text-[var(--primary)] disabled:text-slate-300"
      >
        {arrow}
      </button>
    </div>
  );
}
