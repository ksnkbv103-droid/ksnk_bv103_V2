// src/components/shared/SearchBar.tsx
"use client";

import React from "react";
import { Search, X } from "lucide-react";

/**
 * Component Tìm kiếm chung (SearchBar)
 * Thiết kế touch-first, tối ưu cho iPad và điện thoại
 */
interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  className?: string;
}

export default function SearchBar({
  placeholder = "Tìm kiếm...",
  value,
  onChange,
  onClear,
  className = ""
}: SearchBarProps) {
  return (
    <div className={`relative group w-full min-w-0 ${className}`}>
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#026f17]">
        <Search size={16} strokeWidth={2.25} aria-hidden />
      </div>

      <input
        type="search"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bv103-control-h w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm font-medium text-slate-800 shadow-sm outline-none transition-[box-shadow,border-color] placeholder:text-slate-400 focus:border-[#026f17]/40 focus:ring-2 focus:ring-[#026f17]/15"
      />

      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            onClear?.();
          }}
          className="bv103-control-h absolute right-1 top-1/2 flex w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          title="Xóa tìm kiếm"
        >
          <X size={15} strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
