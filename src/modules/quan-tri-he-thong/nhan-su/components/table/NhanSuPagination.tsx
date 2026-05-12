"use client";

import React from "react";

interface NhanSuPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
}

/**
 * NhanSuPagination - Phân trang cho bảng Nhân sự
 */
export default function NhanSuPagination({ page, totalPages, total, loading, onPrevPage, onNextPage }: NhanSuPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-between items-center pt-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
        Trang {page} / {totalPages} — {total} nhân sự
      </p>
      <div className="flex gap-2">
        <button
          disabled={page === 1 || loading}
          onClick={onPrevPage}
          className="w-12 h-12 rounded-full border-2 border-slate-100 flex items-center justify-center font-black text-[#026f17] hover:border-[#026f17] transition-all"
        >
          ←
        </button>
        <button
          disabled={page === totalPages || loading}
          onClick={onNextPage}
          className="w-12 h-12 rounded-full border-2 border-slate-100 flex items-center justify-center font-black text-[#026f17] hover:border-[#026f17] transition-all"
        >
          →
        </button>
      </div>
    </div>
  );
}
