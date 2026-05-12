"use client";

import React from "react";
import { Save } from "lucide-react";

type Props = {
  isSaving: boolean;
  onSave: () => void;
};

export function RBACMatrixSaveBar({ isSaving, onSave }: Props) {
  return (
    <div className="fixed bottom-10 left-0 right-0 flex justify-center z-50 px-6">
      <div className="premium-card glass-panel px-8 py-4 flex items-center gap-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border-white/20 backdrop-blur-2xl rounded-full">
        <div className="hidden md:flex flex-col">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hệ thống Phân quyền Động</span>
          <span className="text-[10px] font-bold text-slate-600">Thay đổi sẽ có hiệu lực ngay khi lưu</span>
        </div>
        <div className="hidden md:block w-px h-8 bg-slate-200" />
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={isSaving}
          className="flex items-center gap-3 px-8 py-3 bg-[#026f17] hover:bg-[#015a12] text-white rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? "Đang lưu..." : "Lưu thay đổi ma trận"}
        </button>
      </div>
    </div>
  );
}
