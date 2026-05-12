"use client";

import React from "react";
import { ArrowLeft, Layers, Plus } from "lucide-react";

type Props = {
  title: string;
  sourceTable: string;
  registryKey: string;
  onBack: () => void;
  onCreate: () => void;
  /** Khi false: chỉ xem danh sách (quyền DANH_MUC không có CREATE). */
  canCreate?: boolean;
};

export default function GenericDmMasterHeader({ title, sourceTable, registryKey, onBack, onCreate, canCreate = true }: Props) {
  return (
    <header className="flex flex-col gap-4 rounded-[32px] border border-slate-100 border-l-4 border-l-[#026f17] bg-white p-6 shadow-sm sm:flex-row sm:justify-between">
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={onBack}
          className="mt-1 p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 touch-manipulation"
          aria-label="Quay lại"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black text-[#026f17] uppercase tracking-tight flex items-center gap-2">
            <Layers size={22} /> {title}
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Bảng {sourceTable} · loại registry {registryKey}
          </p>
        </div>
      </div>
      {canCreate ? (
        <button
          type="button"
          onClick={onCreate}
          className="flex h-12 items-center gap-2 rounded-xl bg-[#026f17] px-6 font-black uppercase text-[10px] text-[#FFD700] shadow-lg touch-manipulation"
        >
          <Plus size={18} /> Thêm mới
        </button>
      ) : (
        <p className="max-w-xs text-right text-[10px] font-bold uppercase leading-relaxed text-slate-400">
          Chỉ xem — cần quyền tạo/sửa danh mục (DANH_MUC) để thêm hoặc sửa dòng.
        </p>
      )}
    </header>
  );
}
