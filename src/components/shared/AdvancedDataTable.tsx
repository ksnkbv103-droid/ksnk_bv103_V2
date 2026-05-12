// src/components/shared/AdvancedDataTable.tsx
"use client";

import React, { useMemo } from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import SearchBar from "./SearchBar";
import ServerPaginationBar from "./ServerPaginationBar";
import DataTableBody from "./DataTableBody";
import { useDataTable } from "@/hooks/useDataTable";

/**
 * Định nghĩa cột cho bảng
 */
export interface Column<T> {
  header: string;
  accessorKey: keyof T | string; // key trong data hoặc string path
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  /** className cho &lt;th&gt; (ví dụ độ rộng cột) */
  headerClassName?: string;
  /** className cho &lt;td&gt; */
  cellClassName?: string;
}

/**
 * Props cho AdvancedDataTable
 */
/** Cấu hình phân trang từ Server. Khi prop này được truyền, bảng chuyển sang chế độ Server Pagination. */
export type ServerPaginationConfig = {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

interface AdvancedDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  onRowClick?: (item: T) => void;
  bulkActions?: (selectedItems: T[]) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  enableMultiSelect?: boolean;
  hideSearch?: boolean;
  onDeleteSelected?: (items: T[]) => void;
  onSearch?: (term: string) => void;
  onSort?: (key: string) => void;
  searchValue?: string;
  rowClassName?: (item: T) => string;
  /** Khi được cung cấp, bảng dùng Server-side Pagination thay vì client-side useDataTable. */
  serverPagination?: ServerPaginationConfig;
  /** Gắn thêm class cho &lt;table&gt; (ví dụ `table-fixed` để khớp độ rộng cột). */
  tableClassName?: string;
}

export default function AdvancedDataTable<T extends { id: string | number }>({
  columns, data,
  searchPlaceholder = "Tìm kiếm trong bảng...",
  onRowClick, bulkActions,
  emptyMessage = "Không có dữ liệu hiển thị",
  loading = false, enableMultiSelect = false, hideSearch = false,
  onDeleteSelected, onSearch, onSort, searchValue, rowClassName, serverPagination, tableClassName
}: AdvancedDataTableProps<T>) {
  const searchableKeys = useMemo(() => columns.map(col => col.accessorKey as keyof T), [columns]);

  const {
    processedData: internalProcessedData,
    selectedItems, selectedIds, searchTerm, sortConfig,
    handleSearch: internalHandleSearch,
    handleSort: internalHandleSort,
    toggleSelectRow, toggleSelectAll,
  } = useDataTable(data, searchableKeys);

  const displayData = (onSearch || onSort) ? data : internalProcessedData;
  const onSearchAction = onSearch || internalHandleSearch;
  const onSortAction = (key: keyof T) => { if (onSort) onSort(String(key)); else internalHandleSort(key); };
  const finalSearchTerm = searchValue !== undefined ? searchValue : searchTerm;

  return (
    <div className="space-y-4 w-full animate-in fade-in duration-500">
      {/* Thanh công cụ */}
      {(!hideSearch || (selectedIds.size > 0 && (enableMultiSelect || bulkActions))) && (
        <div className="flex flex-col md:flex-row items-center gap-4 no-print transition-all duration-300">
          {!hideSearch && (
            <SearchBar value={finalSearchTerm} onChange={onSearchAction} placeholder={searchPlaceholder} className="flex-1" />
          )}
          
          {selectedIds.size > 0 && (enableMultiSelect || bulkActions) && (
            <div className="flex items-center gap-2 p-1.5 bg-[#026f17]/5 border border-[#026f17]/10 rounded-2xl animate-in slide-in-from-top-2">
              <span className="text-[10px] font-black text-[#026f17] uppercase px-4 whitespace-nowrap">Đã chọn {selectedIds.size} mục</span>
              {enableMultiSelect && onDeleteSelected && (
                <button
                  type="button"
                  onClick={() => onDeleteSelected(selectedItems)}
                  className="flex h-9 items-center gap-2 rounded-xl bg-red-50 px-4 text-[10px] font-black uppercase tracking-widest text-red-700 transition-all hover:bg-red-500 hover:text-white"
                >
                  <Trash2 size={13} aria-hidden /> Xóa
                </button>
              )}
              {bulkActions && bulkActions(selectedItems)}
            </div>
          )}
        </div>
      )}

      {/* Bảng dữ liệu chính */}
      <div className="overflow-hidden rounded-[var(--radius-table)] bg-white ring-1 ring-slate-200/90">
        <div className="overflow-x-auto">
          <table className={tableClassName ?? "w-full border-collapse text-left"}>
            <thead>
              <tr className="border-b border-slate-200/90 bg-slate-50/95">
                {enableMultiSelect && (
                  <th className="p-4 w-12 text-center no-print">
                    <input type="checkbox" className="w-5 h-5 rounded-lg border-2 border-slate-200 text-[#026f17] focus:ring-[#026f17] transition-all cursor-pointer"
                      checked={data.length > 0 && selectedIds.size === data.length} onChange={toggleSelectAll} />
                  </th>
                )}
                {columns.map((col, idx) => (
                  <th key={`head-${idx}-${String(col.accessorKey)}`}
                    className={`p-3.5 md:p-4 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition-colors ${col.sortable ? "cursor-pointer select-none hover:bg-slate-100/70 hover:text-[var(--primary)]" : ""} ${col.headerClassName ?? ""}`}
                    onClick={() => col.sortable && onSortAction(col.accessorKey as keyof T)}>
                    <div className="flex items-center gap-2">
                      {col.header}
                      {col.sortable && (
                        <div className="flex flex-col opacity-30">
                          <ChevronUp size={10} className={sortConfig?.key === col.accessorKey && sortConfig.direction === 'asc' ? 'text-[#026f17] opacity-100' : ''} />
                          <ChevronDown size={10} className={sortConfig?.key === col.accessorKey && sortConfig.direction === 'desc' ? 'text-[#026f17] opacity-100' : ''} />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <DataTableBody
                columns={columns}
                data={displayData}
                loading={loading}
                emptyMessage={emptyMessage}
                enableMultiSelect={enableMultiSelect}
                selectedIds={selectedIds}
                onRowClick={onRowClick}
                toggleSelectRow={toggleSelectRow}
                rowClassName={rowClassName}
              />
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer */}
      {displayData.length > 0 && (
        serverPagination ? (
          <div className="no-print">
            <ServerPaginationBar
              page={serverPagination.page}
              totalPages={serverPagination.totalPages}
              totalCount={serverPagination.totalCount}
              pageSize={serverPagination.pageSize}
              onPageChange={serverPagination.onPageChange}
              loading={loading}
            />
          </div>
        ) : (
          <div className="px-6 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest no-print">
            <p>Hiển thị {displayData.length} / {data.length} dòng dữ liệu</p>
            <p>Bệnh viện Quân y 103 • {new Date().getFullYear()}</p>
          </div>
        )
      )}
    </div>
  );
}
