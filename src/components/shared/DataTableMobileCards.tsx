"use client";

import React from "react";
import type { Column } from "./AdvancedDataTable";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  emptyMessage: string;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  enableMultiSelect?: boolean;
  selectedIds?: Set<string | number>;
  toggleSelectRow?: (id: string | number) => void;
};

function getRowKey<T extends { id?: string | number }>(item: T, index: number): string | number {
  if (item.id !== undefined && item.id !== "") return item.id;
  const rec = item as Record<string, unknown>;
  const maKey = Object.keys(rec).find((k) => k.startsWith("ma_"));
  if (maKey) {
    const v = rec[maKey];
    if (v !== undefined && v !== null && v !== "") return v as string | number;
  }
  return `row-${index}`;
}

function splitColumns<T>(columns: Column<T>[]) {
  const fieldCols: Column<T>[] = [];
  const actionCols: Column<T>[] = [];
  for (const col of columns) {
    const header = String(col.header ?? "").trim();
    if (!header) actionCols.push(col);
    else fieldCols.push(col);
  }
  return { fieldCols, actionCols };
}

function cellValue<T>(col: Column<T>, item: T) {
  if (col.cell) return col.cell(item);
  return String((item as Record<string, unknown>)[String(col.accessorKey)] ?? "");
}

export default function DataTableMobileCards<T extends { id?: string | number }>({
  columns,
  data,
  loading,
  emptyMessage,
  onRowClick,
  rowClassName,
  enableMultiSelect = false,
  selectedIds,
  toggleSelectRow,
}: Props<T>) {
  const { fieldCols, actionCols } = splitColumns(columns);

  if (loading && data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 p-12 text-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
        <p className="text-xs font-medium text-slate-500">Đang tải dữ liệu…</p>
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="p-10 text-center text-sm font-medium text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {data.map((item, idx) => {
        const rowKey = getRowKey(item, idx);
        const isSelected = selectedIds?.has(rowKey);
        const customClass = rowClassName ? rowClassName(item) : "";
        const interactive = Boolean(onRowClick);

        return (
          <li key={String(rowKey)}>
            <div
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              onClick={() => onRowClick?.(item)}
              onKeyDown={
                interactive
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick?.(item);
                      }
                    }
                  : undefined
              }
              className={`space-y-2 px-3 py-3 transition-colors touch-manipulation ${
                interactive ? "cursor-pointer active:bg-slate-50" : ""
              } ${isSelected ? L.rowSelected : ""} ${customClass}`}
            >
              {enableMultiSelect && toggleSelectRow ? (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()} role="presentation">
                  <input
                    type="checkbox"
                    className="h-5 w-5 cursor-pointer rounded-md border border-slate-300 text-[var(--primary)] accent-[var(--primary)]"
                    checked={Boolean(isSelected)}
                    onChange={() => toggleSelectRow(rowKey)}
                  />
                  <span className={T.labelBlock}>Chọn dòng</span>
                </div>
              ) : null}

              {fieldCols.map((col, colIdx) => (
                <div key={`m-${String(rowKey)}-${colIdx}`} className="min-w-0">
                  <p className={`${T.labelBlock} mb-0.5`}>{col.header}</p>
                  <div className={`text-sm text-slate-800 ${col.cellClassName ?? ""}`}>{cellValue(col, item)}</div>
                </div>
              ))}

              {actionCols.length > 0 ? (
                <div
                  className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-2.5"
                  onClick={(e) => e.stopPropagation()}
                  role="presentation"
                >
                  {actionCols.map((col, colIdx) => (
                    <React.Fragment key={`a-${String(rowKey)}-${colIdx}`}>{cellValue(col, item)}</React.Fragment>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
