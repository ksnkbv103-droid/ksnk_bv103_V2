// src/components/shared/AdvancedDataTable.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import SearchBar from "./SearchBar";
import ServerPaginationBar from "./ServerPaginationBar";
import DataTableBody from "./DataTableBody";
import { useDataTable } from "@/hooks/useDataTable";
import { useMinWidth } from "@/hooks/use-min-width";

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
  /**
   * `inline` (mặc định): thanh tìm trong khối bảng.
   * `header`: từ breakpoint lg, portal ô tìm lên `#bv103-header-toolbar-slot` trong Header (một bảng / trang);
   * dưới lg vẫn hiển thị inline để không chật mobile.
   */
  searchPlacement?: "inline" | "header";
  /**
   * Ô tìm giãn theo chiều ngang vùng bảng (mặc định true — lịch sử phiên, danh sách rộng).
   * Chỉ đặt `false` khi cần giới hạn chiều rộng trong layout chật (ví dụ panel phụ).
   */
  searchStretchToContainer?: boolean;
}

export default function AdvancedDataTable<T extends { id: string | number }>({
  columns, data,
  searchPlaceholder = "Tìm kiếm trong bảng...",
  onRowClick, bulkActions,
  emptyMessage = "Không có dữ liệu hiển thị",
  loading = false, enableMultiSelect = false, hideSearch = false,
  onDeleteSelected, onSearch, onSort, searchValue, rowClassName, serverPagination, tableClassName,
  searchPlacement = "inline",
  searchStretchToContainer = true,
}: AdvancedDataTableProps<T>) {
  const headerPortal = searchPlacement === "header";
  const isLgUp = useMinWidth(1024, false, headerPortal);
  const [headerSlotEl, setHeaderSlotEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!headerPortal) {
      setHeaderSlotEl(null);
      return;
    }
    setHeaderSlotEl(document.getElementById("bv103-header-toolbar-slot"));
  }, [headerPortal]);
  const searchableKeys = useMemo(() => columns.map(col => col.accessorKey as keyof T), [columns]);

  const {
    processedData: internalProcessedData,
    selectedItems, selectedIds, searchTerm, sortConfig,
    handleSearch: internalHandleSearch,
    handleSort: internalHandleSort,
    toggleSelectRow, toggleSelectAll,
  } = useDataTable(data, searchableKeys, {
    searchDebounceMs: onSearch || onSort ? 0 : 220,
    skipFiltering: Boolean(onSearch),
  });

  const displayData = (onSearch || onSort) ? data : internalProcessedData;
  const onSearchAction = onSearch || internalHandleSearch;
  const onSortAction = (key: keyof T) => { if (onSort) onSort(String(key)); else internalHandleSort(key); };
  const finalSearchTerm = searchValue !== undefined ? searchValue : searchTerm;

  const useHeaderSearchPortal = searchPlacement === "header" && !hideSearch && isLgUp && Boolean(headerSlotEl);
  const showInlineSearch = !hideSearch && (searchPlacement === "inline" || (searchPlacement === "header" && !isLgUp));

  const searchBarNode = !hideSearch ? (
    <SearchBar
      value={finalSearchTerm}
      onChange={onSearchAction}
      placeholder={searchPlaceholder}
      className={
        useHeaderSearchPortal
          ? "min-w-0 w-full max-w-none"
          : searchStretchToContainer
            ? "min-w-0 w-full max-w-none grow basis-full sm:basis-0 sm:flex-1"
            : "min-w-0 w-full max-w-none flex-1 basis-0 sm:max-w-2xl"
      }
    />
  ) : null;

  const toolbarRowNeeded =
    showInlineSearch || (selectedIds.size > 0 && (enableMultiSelect || bulkActions));

  return (
    <div className="w-full min-w-0 space-y-3 animate-in fade-in duration-500">
      {useHeaderSearchPortal && headerSlotEl && searchBarNode
        ? createPortal(searchBarNode, headerSlotEl)
        : null}

      {toolbarRowNeeded && (
        <div
          className={`flex w-full min-w-0 flex-wrap items-center gap-2 no-print transition-all duration-300 ${
            !showInlineSearch && selectedIds.size > 0 ? "justify-end" : ""
          }`}
        >
          {showInlineSearch ? searchBarNode : null}

          {selectedIds.size > 0 && (enableMultiSelect || bulkActions) && (
            <div
              className={`flex flex-wrap items-center gap-2 rounded-lg border border-[#026f17]/15 bg-[#026f17]/5 p-1 animate-in slide-in-from-top-2 ${
                showInlineSearch ? "ml-auto" : ""
              }`}
            >
              <span className="whitespace-nowrap px-3 text-[10px] font-semibold uppercase tracking-wide text-[#026f17]">
                Đã chọn {selectedIds.size} mục
              </span>
              {enableMultiSelect && onDeleteSelected && (
                <button
                  type="button"
                  onClick={() => onDeleteSelected(selectedItems)}
                  className="bv103-control-h inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-600 hover:text-white"
                >
                  <Trash2 size={14} aria-hidden /> Xóa
                </button>
              )}
              {bulkActions && bulkActions(selectedItems)}
            </div>
          )}
        </div>
      )}

      {/* Bảng dữ liệu chính */}
      <div className="overflow-hidden rounded-[var(--radius-table)] bg-white ring-1 ring-slate-200/90">
        <div className="custom-scrollbar max-h-[min(520px,62dvh)] overflow-auto overscroll-contain">
          <table className={tableClassName ?? "w-full min-w-[640px] border-collapse text-left"}>
            <thead className="sticky top-0 z-20 bg-slate-50/95 shadow-[0_1px_0_rgb(226_232_240/0.95)]">
              <tr className="border-b border-slate-200/90">
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
            <tbody className="divide-y divide-slate-50 bg-white">
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
