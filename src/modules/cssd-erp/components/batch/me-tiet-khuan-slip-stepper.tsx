"use client";

import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { MeSlipStep } from "../../lib/me-tiet-khuan-slip-ux";

const STEPS: { n: MeSlipStep; label: string }[] = [
  { n: 1, label: "Máy" },
  { n: 2, label: "Chương trình" },
  { n: 3, label: "Quét bộ" },
  { n: 4, label: "Bắt đầu" },
  { n: 5, label: "Kết thúc" },
  { n: 6, label: "Nhả" },
];

export function MeTietKhuanSlipStepper({ current }: { current: MeSlipStep }) {
  return (
    <ol className="flex gap-1 overflow-x-auto rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50 p-2" aria-label="Các bước phiếu mẻ">
      {STEPS.map((step) => {
        const state = step.n < current ? "done" : step.n === current ? "current" : "todo";
        return (
          <li
            key={step.n}
            aria-current={state === "current" ? "step" : undefined}
            className={`flex min-w-[6.5rem] flex-1 items-center gap-2 rounded-xl border px-2 py-2 ${
              state === "current"
                ? "border-emerald-600 bg-white shadow-sm"
                : state === "done"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-transparent bg-transparent"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                state === "current"
                  ? "bg-emerald-700 text-white"
                  : state === "done"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {state === "done" ? <Check size={14} aria-hidden /> : step.n}
            </span>
            <span className={`text-xs font-semibold ${state === "todo" ? "text-slate-400" : "text-slate-800"}`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function MeTietKhuanConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent className="flex max-h-[min(90dvh,640px)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-5 pr-14">
          <DialogTitle className="text-base font-semibold text-slate-900">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-600">{body}</DialogDescription>
        </div>
        <div className="flex gap-2 border-t border-slate-100 p-4">
          <button type="button" onClick={onCancel} className="h-11 flex-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-11 flex-1 rounded-xl text-xs font-semibold text-white ${danger ? "bg-red-600" : "bg-emerald-700"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
