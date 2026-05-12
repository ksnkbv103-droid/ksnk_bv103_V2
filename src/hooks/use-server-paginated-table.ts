// src/hooks/use-server-paginated-table.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FACT_LIST_DEFAULT_PAGE_SIZE } from "@/lib/validations/fact-list-pagination";

/**
 * Tham số phân trang gửi đến Server Action.
 */
export type ServerPaginationParams = {
  page: number;
  pageSize: number;
  search: string;
  sortKey: string;
  sortDir: "asc" | "desc";
};

/**
 * Kết quả trả về từ Server Action phân trang.
 */
export type ServerPaginatedResult<T> = {
  success: boolean;
  data?: T[];
  totalCount?: number;
  error?: string;
};

type FetchAction<T> = (params: ServerPaginationParams) => Promise<ServerPaginatedResult<T>>;

type Options<T> = {
  /** Server Action nhận params phân trang, trả về { data, totalCount }. */
  fetchAction: FetchAction<T>;
  /** Số bản ghi mỗi trang (mặc định 20). */
  defaultPageSize?: number;
  /** Thời gian chờ sau khi gõ xong mới gọi API (ms, mặc định 300). */
  debounceMs?: number;
  /** Key sắp xếp mặc định. */
  defaultSortKey?: string;
  /** Hướng sắp xếp mặc định. */
  defaultSortDir?: "asc" | "desc";
};

/**
 * Hook trung tâm cho Server-side Pagination.
 *
 * Thay thế `useDataTable` ở các bảng lịch sử lớn (GSC, VST).
 * Mọi thao tác tìm kiếm/sắp xếp/chuyển trang đều gọi Server Action,
 * client chỉ nhận đúng 1 trang dữ liệu (~20 bản ghi).
 */
export function useServerPaginatedTable<T extends { id: string | number }>(opts: Options<T>) {
  const {
    fetchAction,
    defaultPageSize = FACT_LIST_DEFAULT_PAGE_SIZE,
    debounceMs = 300,
    defaultSortKey = "created_at",
    defaultSortDir = "desc",
  } = opts;

  // --- State ---
  const [data, setData] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(defaultPageSize);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);
  const [loading, setLoading] = useState(true);

  // --- Refs cho debounce & abort ---
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchId = useRef(0); // tránh race condition

  // --- Core fetch ---
  const fetchData = useCallback(
    async (params: ServerPaginationParams) => {
      const id = ++fetchId.current;
      setLoading(true);

      try {
        const res = await fetchAction(params);
        // Bỏ qua nếu có request mới hơn
        if (id !== fetchId.current) return;

        if (res.success) {
          setData((res.data || []) as T[]);
          setTotalCount(res.totalCount ?? 0);
        }
      } catch {
        if (id !== fetchId.current) return;
      } finally {
        if (id === fetchId.current) setLoading(false);
      }
    },
    [fetchAction],
  );

  // --- Effect: gọi fetch khi state thay đổi ---
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      void fetchData({ page, pageSize, search: searchTerm, sortKey, sortDir });
    }, debounceMs);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [page, pageSize, searchTerm, sortKey, sortDir, fetchData, debounceMs]);

  // --- Handlers ---
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(1); // Reset về trang 1 khi tìm kiếm mới
  }, []);

  const handleSort = useCallback(
    (key: string) => {
      if (key === sortKey) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
      setPage(1);
    },
    [sortKey],
  );

  const refresh = useCallback(() => {
    void fetchData({ page, pageSize, search: searchTerm, sortKey, sortDir });
  }, [fetchData, page, pageSize, searchTerm, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    // Data
    data,
    totalCount,
    totalPages,

    // Pagination state
    page,
    setPage,
    pageSize,

    // Search & Sort
    searchTerm,
    handleSearch,
    sortKey,
    sortDir,
    handleSort,

    // UI
    loading,
    refresh,
  };
}
