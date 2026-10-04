"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { getCongViecListForBoard } from "../actions/cong-viec.actions";
import { getPendingDeXuat, getMyPendingDeXuat } from "../actions/dexuat.actions";
import type { CongViecView } from "../types";
import type { QlcvBoardFilter } from "../lib/qlcv-board-filter";

interface UseQlcvKanbanOptions {
  canApprove: boolean;
  actorStaffId?: string | null;
}

export interface UseQlcvKanbanReturn {
  tasks: CongViecView[];
  pendingKanbanExtras: CongViecView[];
  kanbanApproveRow: CongViecView | null;
  setKanbanApproveRow: (row: CongViecView | null) => void;
  boardFilter: QlcvBoardFilter | null;
  setBoardFilter: (f: QlcvBoardFilter | null) => void;
  kanbanFocusNonce: number;
  setKanbanFocusNonce: React.Dispatch<React.SetStateAction<number>>;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  kanbanSearchDebounced: string;
  loading: boolean;
  refreshTasks: () => Promise<void>;
  fetchTasksInitial: () => Promise<void>;
}

/**
 * Hook quản lý state Kanban QLCV:
 * - Task list (getCongViecListForBoard)
 * - Đề xuất chờ duyệt (pendingKanbanExtras)
 * - Board filter, search debounce, focus nonce
 */
export function useQlcvKanban({ canApprove, actorStaffId = null }: UseQlcvKanbanOptions): UseQlcvKanbanReturn {
  const [tasks, setTasks] = useState<CongViecView[]>([]);
  const [pendingKanbanExtras, setPendingKanbanExtras] = useState<CongViecView[]>([]);
  const [kanbanApproveRow, setKanbanApproveRow] = useState<CongViecView | null>(null);
  const [boardFilter, setBoardFilter] = useState<QlcvBoardFilter | null>("MY_TASKS");
  const [kanbanFocusNonce, setKanbanFocusNonce] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [kanbanSearchDebounced, setKanbanSearchDebounced] = useState("");
  const [loading, setLoading] = useState(true);

  // Debounce search
  useEffect(() => {
    const tid = window.setTimeout(() => setKanbanSearchDebounced(searchTerm.trim().toLowerCase()), 220);
    return () => window.clearTimeout(tid);
  }, [searchTerm]);

  const pullTasks = useCallback(async () => {
    // Chờ actor khi lens MY_TASKS — tránh dump full board trước khi biết user.
    if (boardFilter === "MY_TASKS" && !actorStaffId) return;

    // Parallel list + pending đề xuất — lỗi đề xuất không nuốt thành «không có chờ duyệt».
    const pendingPromise: Promise<CongViecView[]> = canApprove
      ? getPendingDeXuat().then((p) => p as CongViecView[])
      : getMyPendingDeXuat().then((p) => p as CongViecView[]);

    const [data, pending] = await Promise.all([
      getCongViecListForBoard({ boardFilter, actorStaffId }),
      pendingPromise,
    ]);
    setTasks((data || []) as unknown as CongViecView[]);
    setPendingKanbanExtras(pending);
  }, [actorStaffId, boardFilter, canApprove]);

  const fetchTasksInitial = useCallback(async () => {
    if (boardFilter === "MY_TASKS" && !actorStaffId) return;
    setLoading(true);
    try {
      await pullTasks();
    } catch (err) {
      console.error("Lỗi tải kanban:", err);
      toast.error(err instanceof Error ? err.message : "Không tải được bảng công việc.");
    } finally {
      setLoading(false);
    }
  }, [actorStaffId, boardFilter, pullTasks]);

  useEffect(() => {
    void fetchTasksInitial();
  }, [fetchTasksInitial]);

  const refreshTasks = useCallback(async () => {
    try {
      await pullTasks();
    } catch (err) {
      console.error("Lỗi làm mới kanban:", err);
      toast.error(err instanceof Error ? err.message : "Không làm mới được bảng công việc.");
    }
  }, [pullTasks]);

  return {
    tasks,
    pendingKanbanExtras,
    kanbanApproveRow,
    setKanbanApproveRow,
    boardFilter,
    setBoardFilter,
    kanbanFocusNonce,
    setKanbanFocusNonce,
    searchTerm,
    setSearchTerm,
    kanbanSearchDebounced,
    loading,
    refreshTasks,
    fetchTasksInitial,
  };
}
