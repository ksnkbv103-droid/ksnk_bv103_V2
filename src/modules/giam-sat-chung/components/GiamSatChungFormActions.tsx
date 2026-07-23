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
    <div className={`${C.fabStack} z-50 animate-in slide-in-from-bottom-4 duration-300`}>
      <button
        type="button"
        onClick={onPrint}
        title="In phiếu A4"
        className="app-shell-focus flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-[var(--radius-control)] border border-slate-200/90 bg-slate-800 text-white shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/10 transition-[colors,transform] touch-manipulation hover:bg-slate-900 active:scale-[0.98]"
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
