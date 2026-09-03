"use client";

import React from "react";
import { LoaiDungCuPageContent } from "./LoaiDungCuPage";

type Props = {
  onClose: () => void;
};

/** Sheet phụ ADMIN — không phải tab ngang hàng với Bộ. */
export function DungCuLoaiSheet({ onClose }: Props) {
  return (
    <section className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-slate-600">Loại dụng cụ</p>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
        >
          Đóng
        </button>
      </div>
      <LoaiDungCuPageContent />
    </section>
  );
}
