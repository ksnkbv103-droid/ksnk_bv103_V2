"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { getCongViecListPaginated } from "../actions/cong-viec-list.actions";
import { matchesQlcvBoardFilter, type QlcvBoardFilter } from "../lib/qlcv-board-filter";
import type { CongViecView } from "../types";

interface UseQlcvTableOptions {
  canApprove: boolean;
  boardFilter: QlcvBoardFilter | null;
  actorStaffId: string | null;
  /** Danh sách gộp (việc active + đề xuất) — dùng khi lọc cổng / thẻ. */
  mergedTasks: CongViecView[];
}

function sortRows(rows: CongViecView[], sortKey: string, sortDir: "asc" | "desc"): CongViecView[] {
  const dir = sortDir === "asc" ? 1 : -1;
  const copy = [...rows];
  copy.sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[sortKey];
    const bv = (b as unknown as Record<string, unknown>)[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv), "vi") * dir;
  });
  return copy;
}

export interface UseQlcvTableReturn {
  tableRows: CongViecView[];
  tableTotal: number;
  tablePage: number;
  setTablePage: (p: number) => void;
  tablePageSize: number;
  tableLoading: boolean;
  tableSearchInput: string;
  setTableSearchInput: (s: string) => void;
  tableSortKey: string;
  tableSortDir: "asc" | "desc";
  handleTableSearch: (term: string) => void;
  handleTableSort: (key: string) => void;
  loadTablePage: () => Promise<void>;
  tableTotalPages: number;
  /** true = đang lọc client trên mergedTasks (không phân trang server). */
  usingClientSlice: boolean;
}

/**
 * Bảng điều hành QLCV:
 * - Không lọc cổng → phân trang server.
 * - Có lọc cổng → lọc + phân trang trên mergedTasks (cùng nguồn Kanban).
 */
export function useQlcvTable({
  canApprove,
  boardFilter,
  actorStaffId,
  mergedTasks,
}: UseQlcvTableOptions): UseQlcvTableReturn {
  const [tableRows, setTableRows] = useState<CongViecView[]>([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [tablePage, setTablePage] = useState(1);
  const tablePageSize = 20;
  const [tableLoading, setTableLoading] = useState(false);
  const [tableSearchInput, setTableSearchInput] = useState("");
  const [tableSearchDebounced, setTableSearchDebounced] = useState("");
  const [tableSortKey, setTableSortKey] = useState("created_at");
  const [tableSortDir, setTableSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const tid = setTimeout(() => setTableSearchDebounced(tableSearchInput.trim()), 300);
    return () => clearTimeout(tid);
  }, [tableSearchInput]);

  useEffect(() => {
    setTablePage(1);
  }, [boardFilter]);

  // Có từ khóa: tìm trên toàn bệnh viện qua server, không bó trong lens (lens chỉ là danh sách đã tải).
  const usingClientSlice = boardFilter != null && boardFilter !== "TOTAL" && tableSearchDebounced === "";

  const clientFiltered = useMemo(() => {
    if (!usingClientSlice) return [];
    return mergedTasks.filter((t) => {
      return matchesQlcvBoardFilter(t as unknown as Record<string, unknown>, boardFilter, { actorStaffId });
    });
  }, [usingClientSlice, mergedTasks, boardFilter, actorStaffId]);

  const reqSeqRef = useRef(0);

  const applyClientPage = useCallback(() => {
    const sorted = sortRows(clientFiltered, tableSortKey, tableSortDir);
    const total = sorted.length;
    const maxPage = Math.max(1, Math.ceil(total / tablePageSize));
    const safePage = Math.min(tablePage, maxPage);
    if (safePage !== tablePage) {
      setTablePage(safePage);
    }
    const start = (safePage - 1) * tablePageSize;
    setTableRows(sorted.slice(start, start + tablePageSize));
    setTableTotal(total);
    setTableLoading(false);
  }, [clientFiltered, tableSortKey, tableSortDir, tablePage, tablePageSize]);

  const loadTablePage = useCallback(async () => {
    if (usingClientSlice) {
      setTableLoading(true);
      applyClientPage();
      return;
    }

    const seq = ++reqSeqRef.current;
    setTableLoading(true);
    try {
      const r = await getCongViecListPaginated({
        page: tablePage,
        pageSize: tablePageSize,
        search: tableSearchDebounced || undefined,
        sortKey: tableSortKey,
        sortDir: tableSortDir,
        includePendingProposals: canApprove,
      });
      if (seq !== reqSeqRef.current) return;
      setTableRows((r.rows || []) as CongViecView[]);
      setTableTotal(r.totalCount);
    } catch (err) {
      if (seq !== reqSeqRef.current) return;
      console.error("Lỗi tải bảng:", err);
      toast.error("Không tải được bảng công việc.");
    } finally {
      if (seq === reqSeqRef.current) setTableLoading(false);
    }
  }, [
    usingClientSlice,
    applyClientPage,
    tablePage,
    tablePageSize,
    tableSearchDebounced,
    tableSortKey,
    tableSortDir,
    canApprove,
  ]);

  useEffect(() => {
    if (usingClientSlice) {
      setTableLoading(true);
      applyClientPage();
    }
  }, [usingClientSlice, applyClientPage]);

  const handleTableSearch = useCallback((term: string) => {
    setTablePage(1);
    setTableSearchInput(term);
  }, []);

  const handleTableSort = useCallback(
    (key: string) => {
      setTablePage(1);
      if (key === tableSortKey) {
        setTableSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setTableSortKey(key);
        setTableSortDir("asc");
      }
    },
    [tableSortKey],
  );

  const tableTotalPages = Math.max(1, Math.ceil(tableTotal / tablePageSize) || 1);

  return {
    tableRows,
    tableTotal,
    tablePage,
    setTablePage,
    tablePageSize,
    tableLoading,
    tableSearchInput,
    setTableSearchInput,
    tableSortKey,
    tableSortDir,
    handleTableSearch,
    handleTableSort,
    loadTablePage,
    tableTotalPages,
    usingClientSlice,
  };
}
