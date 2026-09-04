// src/components/shared/DataTableBody.tsx
"use client";

import React from "react";
import type { Column } from "./AdvancedDataTable";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";
import { getByPath } from "@/lib/get-by-path";

interface DataTableBodyProps<T> {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  emptyMessage: string;
  enableMultiSelect: boolean;
  selectedIds: Set<string | number>;
  onRowClick?: (item: T) => void;
  toggleSelectRow: (id: string | number) => void;
  rowClassName?: (item: T) => string;
  /** Opt-in CSS content-visibility windowing-lite (see AdvancedDataTable). */
  contentVisibilityRows?: boolean;
}

/**
 * DataTableBody - Thành phần thân bảng dữ liệu nâng cao
 * Hỗ trợ render dòng dữ liệu, trạng thái loading và bảng trống với key duy nhất.
 */
export default function DataTableBody<T extends { id?: string | number }>({
  columns, 
  data, 
  loading, 
  emptyMessage, 
  enableMultiSelect, 
  selectedIds, 
  onRowClick, 
  toggleSelectRow, 
  rowClassName,
  contentVisibilityRows = false,
}: DataTableBodyProps<T>) {
  
  // Hàm tìm key an toàn: Ưu tiên id, sau đó là bất kỳ thuộc tính nào bắt đầu bằng 'ma_', cuối cùng là index
  const getRowKey = (item: T, index: number): string | number => {
    if (item.id !== undefined && item.id !== "") return item.id;
    const rec = item as Record<string, unknown>;
    const maKey = Object.keys(rec).find((k) => k.startsWith("ma_"));
    if (maKey) {
      const v = rec[maKey];
      if (v !== undefined && v !== null && v !== "") return v as string | number;
    }
    return `row-${index}`;
  };

  // Zero Placeholder / Không loading chồng:
  // Chỉ hiển thị dòng loading khi bảng đang thực sự trống dữ liệu.
  // Nếu đã có dữ liệu (trang cũ), giữ nguyên hiển thị để tránh nhảy giao diện.
  if (loading && data.length === 0) {
    return (
      <tr key="loading-row">
        <td colSpan={columns.length + (enableMultiSelect ? 1 : 0)} className="px-4 py-10 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
            <p className="text-xs font-medium text-slate-500">Đang tải dữ liệu…</p>
          </div>
        </td>
      </tr>
    );
  }

  // Trạng thái không có dữ liệu
  if (data.length === 0) {
    return (
      <tr key="empty-row">
        <td colSpan={columns.length + (enableMultiSelect ? 1 : 0)} className="px-4 py-8 text-center text-sm font-medium text-slate-500">
          {emptyMessage}
        </td>
      </tr>
    );
  }

  const cvLarge = contentVisibilityRows ? data.length > 0 : data.length > 72;

  return (
    <>
      {data.map((item: T, idx: number) => {
        const rowKey = getRowKey(item, idx);
        const isSelected = selectedIds.has(rowKey);
        const customClass = rowClassName ? rowClassName(item) : "";

        return (
          <tr 
            key={rowKey}
            onClick={() => onRowClick?.(item)}
            style={
              cvLarge
                ? { contentVisibility: "auto", containIntrinsicSize: "auto 48px" }
                : undefined
            }
            className={`${L.row} ${onRowClick ? "cursor-pointer" : ""} ${isSelected ? L.rowSelected : ""} ${customClass}`}
          >
            {/* Cột chọn nhiều */}
            {enableMultiSelect && (
              <td className={`${L.td} text-center no-print`} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border border-slate-300 text-[var(--primary)] accent-[var(--primary)]"
                  checked={isSelected}
                  onChange={() => toggleSelectRow(rowKey)}
                />
              </td>
            )}

            {/* Các cột dữ liệu */}
            {columns.map((col, colIdx) => (
              <td key={`cell-${rowKey}-${colIdx}-${String(col.accessorKey)}`} className={`${L.td} text-sm text-slate-800 ${col.cellClassName ?? ""}`}>
                {col.cell ? col.cell(item) : String(
                  getByPath(item, String(col.accessorKey)) ?? "",
                )}
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}
