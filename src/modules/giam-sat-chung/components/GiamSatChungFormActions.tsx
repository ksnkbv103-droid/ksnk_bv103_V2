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
    <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-500 no-print">
      <button 
        onClick={onPrint}
        title="In phiếu A4"
        className="w-14 h-14 rounded-full bg-slate-800 text-white font-bold shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:bg-slate-900 transition-all flex items-center justify-center border-2 border-white/20 hover:scale-110 self-end"
      >
        <span className="text-xl">🖨️</span>
      </button>

      <button 
        disabled={loading || headerLoading}
        onClick={onSave}
        className="h-16 px-8 rounded-[32px] bg-[#026f17] text-white font-black uppercase tracking-widest shadow-[0_10px_40px_rgba(2,111,23,0.4)] hover:bg-[#015a12] active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/20"
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
