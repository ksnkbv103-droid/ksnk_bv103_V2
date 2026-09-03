// src/components/shared/AdvancedDataTable.tsx
"use client";

import React, { useMemo } from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import SearchBar from "./SearchBar";
import QrScanInput from "./QrScanInput";
import ServerPaginationBar from "./ServerPaginationBar";
import DataTableBody from "./DataTableBody";
import DataTableMobileCards from "./DataTableMobileCards";
import { useDataTable } from "@/hooks/useDataTable";
import { useMinWidth } from "@/hooks/use-min-width";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";

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
  /**
   * Class bổ sung cho &lt;table&gt; — luôn gộp với base `w-full min-w-[640px] border-collapse text-left`
   * (ví dụ chỉ cần `"table-fixed"`; không thay thế mất `w-full`).
   */
  tableClassName?: string;
  /**
   * `inline` (mặc định): thanh tìm trong khối bảng — **SSOT Ops** (FLT-SEARCH-01).
   * `header` — **deprecated** (không consumer); bị ép về `inline`.
   */
  searchPlacement?: "inline" | "header";
  /**
   * Ô tìm giãn theo chiều ngang vùng bảng (mặc định true — lịch sử phiên, danh sách rộng).
   * Chỉ đặt `false` khi cần giới hạn chiều rộng trong layout chật (ví dụ panel phụ).
   */
  searchStretchToContainer?: boolean;
  /** Hiện ô quét QR cạnh thanh tìm (camera + Enter). */
  enableQrScan?: boolean;
  /**
   * Khi quét QR: ưu tiên callback này.
   * Không truyền → đưa mã vào ô tìm (`onSearch` / filter nội bộ).
   */
  onQrScan?: (code: string) => void;
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
  enableQrScan = false,
  onQrScan,
}: AdvancedDataTableProps<T>) {
  /** FLT-SEARCH-01: `searchPlacement="header"` deprecated — luôn inline. */
  void searchPlacement;
  const isSmUp = useMinWidth(640, false);
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

  const showInlineSearch = !hideSearch;
  const applyQrCode = (code: string) => {
    const c = String(code || "").trim();
    if (!c) return;
    if (onQrScan) {
      onQrScan(c);
      return;
    }
    onSearchAction(c);
  };

  const searchBarNode = !hideSearch ? (
    <div
      className={
        searchStretchToContainer
          ? "flex min-w-0 w-full max-w-none grow basis-full items-center gap-1.5 sm:basis-0 sm:flex-1"
          : "flex min-w-0 w-full max-w-none flex-1 basis-0 items-center gap-1.5 sm:max-w-2xl"
      }
    >
      {enableQrScan ? (
        <QrScanInput
          value={String(finalSearchTerm ?? "")}
          onChange={onSearchAction}
          placeholder={searchPlaceholder}
          cameraTitle="Tìm hoặc quét QR"
          onEnter={applyQrCode}
          onCameraScan={applyQrCode}
          className="min-w-0 w-full flex-1"
          inputClassName="bv103-control-h w-full touch-manipulation rounded-[var(--radius-control)] border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/15"
        />
      ) : (
        <SearchBar
          value={finalSearchTerm}
          onChange={onSearchAction}
          placeholder={searchPlaceholder}
          className="min-w-0 w-full flex-1"
        />
      )}
    </div>
  ) : null;

  const toolbarRowNeeded =
    showInlineSearch || (selectedIds.size > 0 && (enableMultiSelect || bulkActions));

  const bulkBar =
    selectedIds.size > 0 && (enableMultiSelect || bulkActions) ? (
      <div className="flex flex-wrap items-center gap-1.5 no-print">
        <span className={`whitespace-nowrap ${T.labelBlock} text-[var(--primary)]`}>
          Đã chọn {selectedIds.size}
        </span>
        {enableMultiSelect && onDeleteSelected ? (
          <button
            type="button"
            onClick={() => onDeleteSelected(selectedItems)}
            className="bv103-control-h inline-flex items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            <Trash2 size={14} aria-hidden /> Xóa
          </button>
        ) : null}
        {bulkActions ? bulkActions(selectedItems) : null}
      </div>
    ) : null;

  return (
    <div className="w-full min-w-0 animate-in fade-in duration-500">
      <div className={L.frame}>
        {toolbarRowNeeded ? (
          <div
            className={`flex w-full min-w-0 flex-wrap items-center gap-[var(--bv103-space-2)] border-b border-slate-200 bg-slate-50/80 px-[var(--bv103-space-3)] py-[var(--bv103-space-2)] no-print ${
              !showInlineSearch && bulkBar ? "justify-end" : ""
            }`}
          >
            {showInlineSearch ? searchBarNode : null}
            {bulkBar ? <div className={showInlineSearch ? "ml-auto" : ""}>{bulkBar}</div> : null}
          </div>
        ) : null}

        {!isSmUp ? (
          <DataTableMobileCards
            columns={columns}
            data={displayData}
            loading={loading}
            emptyMessage={emptyMessage}
            enableMultiSelect={enableMultiSelect}
            selectedIds={selectedIds}
            toggleSelectRow={toggleSelectRow}
            onRowClick={onRowClick}
            rowClassName={rowClassName}
          />
        ) : (
          <div className="custom-scrollbar bv103-scroll-x overflow-x-auto">
            <table
              className={["w-full min-w-[640px] border-collapse text-left", tableClassName]
                .filter(Boolean)
                .join(" ")}
            >
              <thead className={L.theadRow}>
                <tr>
                  {enableMultiSelect && (
                    <th className={`${L.th} w-12 text-center no-print`}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[var(--primary)] accent-[var(--primary)]"
                        checked={data.length > 0 && selectedIds.size === data.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  {columns.map((col, idx) => (
                    <th
                      key={`head-${idx}-${String(col.accessorKey)}`}
                      className={`${L.th} ${T.tableHeader} ${col.sortable ? "cursor-pointer select-none hover:bg-slate-100/70 hover:text-slate-700" : ""} ${col.headerClassName ?? ""}`}
                      onClick={() => col.sortable && onSortAction(col.accessorKey as keyof T)}
                    >
                      <div className="flex items-center gap-1.5">
                        {col.header}
                        {col.sortable && (
                          <div className="flex flex-col opacity-30">
                            <ChevronUp
                              size={10}
                              className={
                                sortConfig?.key === col.accessorKey && sortConfig.direction === "asc"
                                  ? "text-[var(--primary)] opacity-100"
                                  : ""
                              }
                            />
                            <ChevronDown
                              size={10}
                              className={
                                sortConfig?.key === col.accessorKey && sortConfig.direction === "desc"
                                  ? "text-[var(--primary)] opacity-100"
                                  : ""
                              }
                            />
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={L.tbody}>
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
        )}

        {displayData.length > 0 && !serverPagination ? (
          <p className={`border-t border-slate-100 px-2.5 py-1 no-print ${T.metaMono}`}>
            {displayData.length} / {data.length} dòng
          </p>
        ) : null}
      </div>

      {displayData.length > 0 && serverPagination ? (
        <div className="no-print mt-1.5">
          <ServerPaginationBar
            page={serverPagination.page}
            totalPages={serverPagination.totalPages}
            totalCount={serverPagination.totalCount}
            pageSize={serverPagination.pageSize}
            onPageChange={serverPagination.onPageChange}
            loading={loading}
          />
        </div>
      ) : null}
    </div>
  );
}
