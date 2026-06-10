// src/modules/giam-sat-chung/components/GiamSatChungFormActions.tsx
"use client";

import React from "react";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

interface GiamSatChungFormActionsProps {
  loading: boolean;
  headerLoading: boolean;
  onPrint: () => void;
  onSave: () => void;
}

export default function GiamSatChungFormActions({ loading, headerLoading, onPrint, onSave }: GiamSatChungFormActionsProps) {
  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3 animate-in slide-in-from-bottom-8 duration-500 no-print">
      <button
        type="button"
        onClick={onPrint}
        title="In phiếu A4"
        className="app-shell-focus flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-[var(--radius-control)] border border-slate-200/90 bg-slate-800 text-white shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/10 transition-colors hover:bg-slate-900"
      >
        <span className="text-lg" aria-hidden>
          🖨️
        </span>
      </button>

      <button
        type="button"
        disabled={loading || headerLoading}
        onClick={onSave}
        className={`app-shell-focus ${C.btnPrimary} min-h-12 px-6 py-3 uppercase tracking-wide ring-1 ring-[var(--primary)]/20`}
      >
        {loading ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <span className="text-2xl">💾</span>
            <span>Lưu kết quả</span>
          </>
        )}
      </button>
    </div>
  );
}
