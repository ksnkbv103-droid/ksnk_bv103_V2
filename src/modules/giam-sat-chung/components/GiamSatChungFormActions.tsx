// src/modules/giam-sat-chung/components/GiamSatChungFormActions.tsx
"use client";

import React from "react";

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
        className="app-shell-focus flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-xl border border-slate-200/90 bg-slate-800 text-white shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/10 transition-colors hover:bg-slate-900"
      >
        <span className="text-lg" aria-hidden>
          🖨️
        </span>
      </button>

      <button
        type="button"
        disabled={loading || headerLoading}
        onClick={onSave}
        className="app-shell-focus flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#026f17]/20 bg-[#026f17] px-6 py-3 text-[10px] font-semibold uppercase tracking-wide text-white shadow-[var(--shadow-app-soft)] ring-1 ring-[#026f17]/20 transition-colors hover:bg-[#025a12] disabled:opacity-50"
      >
        {loading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <span className="text-2xl">💾</span> 
            <span>LƯU KẾT QUẢ</span>
          </>
        )}
      </button>
    </div>
  );
}
