"use client";

import React from "react";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";

export type NkbvFormSectionProps = {
  title: string;
  hint?: string;
  children: React.ReactNode;
};

/** Khối section chuẩn trên phiếu lâm sàng NKBV. */
export default function NkbvFormSection({ title, hint, children }: NkbvFormSectionProps) {
  return (
    <div className="space-y-3 rounded-[var(--radius-shell)] border border-slate-100 bg-slate-50/75 p-4">
      <div>
        <span className={`${C.blockSection} text-slate-600`}>{title}</span>
        {hint ? <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
