// src/components/shared/ServerPaginationBar.tsx
"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
};

const btnBase =
  "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-[var(--primary)]/30 hover:bg-[var(--primary-light)] hover:text-[var(--primary)] disabled:pointer-events-none disabled:opacity-30";

export default function ServerPaginationBar({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  loading = false,
}: Props) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-2 py-3 sm:flex-row">
      {/* Thông tin */}
      <p className="text-[11px] font-semibold text-slate-500 tabular-nums">
        {totalCount === 0 ? (
          "Không có dữ liệu"
        ) : (
          <>
            Hiển thị{" "}
            <span className="font-bold text-slate-800">
              {from}–{to}
            </span>{" "}
            / <span className="font-bold text-slate-800">{totalCount.toLocaleString("vi-VN")}</span> bản ghi
          </>
        )}
      </p>

      {/* Điều hướng */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(1)}
            className={btnBase}
            title="Trang đầu"
            aria-label="Trang đầu"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            className={btnBase}
            title="Trang trước"
            aria-label="Trang trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="flex h-9 min-w-[4.5rem] items-center justify-center rounded-xl bg-[var(--primary-light)] px-3 text-[11px] font-bold text-[var(--primary)] tabular-nums ring-1 ring-[var(--primary)]/10">
            {page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            className={btnBase}
            title="Trang sau"
            aria-label="Trang sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(totalPages)}
            className={btnBase}
            title="Trang cuối"
            aria-label="Trang cuối"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
