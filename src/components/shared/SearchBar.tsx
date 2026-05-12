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
    <div className={`relative group w-full ${className}`}>
      {/* Icon Search cố định bên trái */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#026f17] transition-colors pointer-events-none">
        <Search size={18} strokeWidth={2.5} />
      </div>

      {/* Input chính với phong cách glass-panel và bo tròn cực đại */}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 pl-12 pr-12 rounded-2xl bg-white border-2 border-slate-100 font-bold text-slate-700 placeholder:text-slate-300 focus:border-[#026f17] focus:bg-white focus:shadow-lg focus:shadow-[#026f17]/5 transition-all outline-none text-sm"
      />

      {/* Nút Xóa (X) hiển thị khi có nội dung */}
      {value && (
        <button
          onClick={() => {
            onChange("");
            if (onClear) onClear();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90"
          title="Xóa tìm kiếm"
        >
          <X size={16} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
