"use client";

import React, { useMemo, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { LayoutGrid, Table2 } from "lucide-react";
import { KsnkSupervisionPanel, KsnkSupervisionTabList, type SupervisionTabDef } from "@/components/shared/ksnk-supervision-chrome";
import SearchBar from "@/components/shared/SearchBar";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";
import { QlcvGateStats } from "./QlcvGateStats";
import { buildQlcvCommandTableColumns } from "./qlcv-table-columns";
import { deleteCongViec } from "../actions/cong-viec.actions";
import { isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import {
  formatBoardFilterHint,
  getKanbanFocusColumnForFilter,
  matchesQlcvBoardFilter,
  type QlcvBoardFilter,
} from "../lib/qlcv-board-filter";
import type { CongViecView } from "../types";
import type { UseQlcvKanbanReturn } from "../hooks/useQlcvKanban";
import type { UseQlcvTableReturn } from "../hooks/useQlcvTable";
import type { QlcvUiAccessFlags } from "../lib/qlcv-access";
import { QlcvConfirmDialog } from "./dialogs/QlcvConfirmDialog";

const CongViecKanban = dynamic(() => import("./CongViecKanban"), {
  ssr: false,
  loading: () => <div className="min-h-[240px] animate-pulse rounded-2xl border border-slate-200/90 bg-slate-50" />,
});

type ViewMode = "BANG" | "KANBAN";

export type QlcvOperationsPanelProps = {
  kanban: UseQlcvKanbanReturn;
  table: UseQlcvTableReturn;
  mergedTasks: CongViecView[];
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  qlcvUi: QlcvUiAccessFlags;
  canApprove: boolean;
  actorStaffId: string | null;
  onSelectTask: (id: string) => void;
  onApproveFromKanban: (row: CongViecView) => void;
  mauSacByMa?: Record<string, string | null | undefined>;
  onEditTask: (row: CongViecView) => void;
  onRefreshAll: () => Promise<void>;
  onBoardFilter: (f: QlcvBoardFilter) => void;
  routerRefresh: () => void;
};

export function QlcvOperationsPanel({
  kanban,
  table,
  mergedTasks,
  viewMode,
  onViewModeChange,
  qlcvUi,
  canApprove,
  actorStaffId,
  onSelectTask,
  onApproveFromKanban,
  onEditTask,
  onRefreshAll,
  onBoardFilter,
  mauSacByMa,
}: QlcvOperationsPanelProps) {
  const [deleteTarget, setDeleteTarget] = useState<CongViecView | null>(null);

  const deleteDialogCopy = useMemo(() => {
    if (!deleteTarget) return { title: "", description: "" };
    if (deleteTarget.trang_thai === "HOAN_THANH") {
      return {
        title: "Xóa công việc đã hoàn thành?",
        description: "Thao tác này xóa vĩnh viễn phiếu và không thể hoàn tác.",
      };
    }
    if (deleteTarget.trang_thai === "DA_HUY") {
      return {
        title: "Xóa phiếu đã hủy?",
        description: "Thao tác này xóa vĩnh viễn phiếu và không thể hoàn tác.",
      };
    }
    return {
      title: "Xóa công việc này?",
      description: "Phiếu sẽ bị xóa khỏi bảng điều hành KSNK.",
    };
  }, [deleteTarget]);

  const kanbanTasks = useMemo(() => {
    const term = kanban.kanbanSearchDebounced;
    return mergedTasks.filter((t) => {
      if (!term) return true;
      return (
        t.tieu_de?.toLowerCase().includes(term) ||
        t.nguoi_phu_trach_ten?.toLowerCase().includes(term) ||
        String(t.nguoi_tao_ten || "")
          .toLowerCase()
          .includes(term)
      );
    });
  }, [mergedTasks, kanban.kanbanSearchDebounced]);

  const filteredKanbanTasks = useMemo(() => {
    if (kanban.boardFilter == null) return kanbanTasks;
    return kanbanTasks.filter((t) =>
      matchesQlcvBoardFilter(t as unknown as Record<string, unknown>, kanban.boardFilter, {
        actorStaffId,
      }),
    );
  }, [kanbanTasks, kanban.boardFilter, actorStaffId]);

  const kanbanFocusColumn = useMemo(
    () => getKanbanFocusColumnForFilter(kanban.boardFilter, canApprove),
    [kanban.boardFilter, canApprove],
  );

  const viewTabs = useMemo(
    (): SupervisionTabDef[] => [
      { id: "BANG", label: "Bảng điều hành", icon: Table2 },
      { id: "KANBAN", label: "Kanban", icon: LayoutGrid },
    ],
    [],
  );

  useEffect(() => {
    if (viewMode !== "BANG") return;
    void table.loadTablePage();
  }, [viewMode, table.loadTablePage, kanban.boardFilter]);

  const handleDelete = useCallback(async (row: CongViecView) => {
    setDeleteTarget(row);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteCongViec(deleteTarget.id);
      toast.success("Đã xóa công việc.");
      setDeleteTarget(null);
      await onRefreshAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không xóa được.");
    }
  }, [deleteTarget, onRefreshAll]);

  const columns = useMemo(
    () => buildQlcvCommandTableColumns({ qlcvUi, mauSacByMa, onEdit: onEditTask, onDelete: handleDelete }),
    [qlcvUi, mauSacByMa, onEditTask, handleDelete],
  );

  return (
    <KsnkSupervisionPanel className={UI.sectionGap}>
      <p className="text-xs leading-relaxed text-slate-600">
        Bảng điều hành: một dòng = một phiếu — rõ <strong>việc</strong>, <strong>người giao</strong>,{" "}
        <strong>phụ trách</strong>, <strong>cổng trách nhiệm</strong>, <strong>tiến độ</strong> và{" "}
        <strong>hạn</strong>. Bấm dòng để xem kết quả / nhật ký thực hiện.
      </p>

      {kanban.boardFilter ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 text-xs text-slate-700">
          <span>
            Lọc: <strong>{formatBoardFilterHint(kanban.boardFilter)}</strong>
            {table.usingClientSlice ? (
              <span className="ml-2 text-slate-500">(áp dụng trên danh sách điều hành)</span>
            ) : null}
          </span>
          <button
            type="button"
            className="bv103-control-h rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-500 hover:bg-slate-100 touch-manipulation"
            onClick={() => onBoardFilter("TOTAL")}
          >
            Bỏ lọc
          </button>
        </div>
      ) : null}

      <QlcvGateStats
        tasks={mergedTasks}
        activeFilter={kanban.boardFilter}
        onFilterChange={onBoardFilter}
        showAllGatePills={canApprove}
        actorStaffId={actorStaffId}
      />

      <div className={`min-w-0 ${UI.shell} space-y-3 p-3 sm:p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <KsnkSupervisionTabList
            tabs={viewTabs}
            activeId={viewMode}
            onChange={(id) => onViewModeChange(id as ViewMode)}
            ariaLabel="Bảng hoặc Kanban"
          />
        </div>

        <SearchBar
          value={viewMode === "KANBAN" ? kanban.searchTerm : table.tableSearchInput}
          onChange={(v) => {
            if (viewMode === "KANBAN") kanban.setSearchTerm(v);
            else table.handleTableSearch(v);
          }}
          placeholder={
            viewMode === "KANBAN"
              ? "Tìm tên việc, người phụ trách…"
              : "Tìm tiêu đề, người giao, phụ trách…"
          }
        />

        {viewMode === "KANBAN" ? (
          <CongViecKanban
            tasks={filteredKanbanTasks}
            showProposalColumn={canApprove}
            focusColumnId={kanbanFocusColumn}
            focusNonce={kanban.kanbanFocusNonce}
            onTaskClick={(task) => {
              if (canApprove && isDeXuatChoDuyet(task)) {
                onApproveFromKanban(task);
                return;
              }
              onSelectTask(task.id);
            }}
          />
        ) : (
          <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-100/90 bg-white">
            <AdvancedDataTable
              columns={columns}
              data={table.tableRows}
              loading={table.tableLoading || kanban.loading}
              onRowClick={(item) => onSelectTask(item.id)}
              hideSearch
              tableClassName="w-full min-w-0 table-fixed border-collapse text-sm"
              searchValue={table.tableSearchInput}
              onSearch={table.handleTableSearch}
              onSort={table.handleTableSort}
              serverPagination={{
                page: table.tablePage,
                totalPages: table.tableTotalPages,
                totalCount: table.tableTotal,
                pageSize: table.tablePageSize,
                onPageChange: table.setTablePage,
              }}
            />
          </div>
        )}
      </div>

      <QlcvConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={deleteDialogCopy.title}
        description={deleteDialogCopy.description}
        confirmLabel="Xóa"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </KsnkSupervisionPanel>
  );
}
