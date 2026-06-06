"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import * as Tabs from "@radix-ui/react-tabs";
import { Plus, LayoutGrid, CalendarClock, ArrowLeft, Send, Upload } from "lucide-react";
import {
  KsnkSupervisionHero,
  KsnkSupervisionTabList,
  type SupervisionTabDef,
} from "@/components/shared/ksnk-supervision-chrome";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { useModulePermission } from "@/hooks/useModulePermission";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QlcvOperationsPanel } from "@/modules/quan-ly-cong-viec/components/QlcvOperationsPanel";
import { QlcvDinhKyPanel } from "@/modules/quan-ly-cong-viec/components/QlcvDinhKyPanel";
import { useQlcvKanban } from "@/modules/quan-ly-cong-viec/hooks/useQlcvKanban";
import { useQlcvTable } from "@/modules/quan-ly-cong-viec/hooks/useQlcvTable";
import {
  canShowDeXuatButton,
  canShowDirectCreateTask,
  canShowQlcvApproveActions,
  type QlcvUiAccessFlags,
} from "@/modules/quan-ly-cong-viec/lib/qlcv-access";
import { mergeQlcvKanbanTasks } from "@/modules/quan-ly-cong-viec/lib/qlcv-list-merge";
import { QlcvDmAdminLinks } from "@/modules/quan-ly-cong-viec/components/QlcvDmAdminLinks";
import { QlcvImportDialog } from "@/modules/quan-ly-cong-viec/components/QlcvImportDialog";
import { getTrangThaiMauSacMap } from "@/modules/quan-ly-cong-viec/actions/cong-viec-read.actions";
import type { CongViecView } from "@/modules/quan-ly-cong-viec/types";
import type { QlcvBoardFilter } from "@/modules/quan-ly-cong-viec/lib/qlcv-board-filter";

const CongViecDetail = dynamic(
  () => import("@/modules/quan-ly-cong-viec/components/CongViecDetail").then((m) => ({ default: m.CongViecDetail })),
  { ssr: false },
);

const CongViecForm = dynamic(
  () => import("@/modules/quan-ly-cong-viec/components/CongViecForm").then((m) => ({ default: m.CongViecForm })),
  { ssr: false, loading: () => <p className="py-6 text-center text-sm text-slate-500">Đang tải biểu mẫu…</p> },
);

const DeXuatForm = dynamic(
  () => import("@/modules/quan-ly-cong-viec/components/DeXuatForm").then((m) => ({ default: m.DeXuatForm })),
  { ssr: false, loading: () => <p className="text-sm text-slate-500">Đang tải…</p> },
);

export default function QuanLyCongViecPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("DIEN_HANH");
  const [viewMode, setViewMode] = useState<"BANG" | "KANBAN">("BANG");
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<CongViecView | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [mauSacByMa, setMauSacByMa] = useState<Record<string, string>>({});

  const { isAdmin, allowed, userData } = useModulePermission("CONG_VIEC");
  const qlcvUi: QlcvUiAccessFlags = useMemo(
    () => ({
      isRBACAdmin: isAdmin,
      hasDelete: allowed.delete,
      hasEdit: allowed.edit,
      hasCreate: allowed.create,
      hasApprove: allowed.approve,
      actorStaffId: userData?.id ?? null,
    }),
    [isAdmin, allowed.delete, allowed.edit, allowed.create, allowed.approve, userData?.id],
  );

  const canApprove = canShowQlcvApproveActions(qlcvUi);
  const canManageDinhKy = isAdmin || allowed.edit;

  const kanban = useQlcvKanban({ canApprove });

  const mergedTasks = useMemo(
    () => mergeQlcvKanbanTasks(kanban.tasks, kanban.pendingKanbanExtras),
    [kanban.tasks, kanban.pendingKanbanExtras],
  );

  const closeTaskDetail = useCallback(() => {
    setSelectedTaskId(null);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("id");
    const qs = next.toString();
    router.replace(qs ? `/quan-ly-cong-viec?${qs}` : "/quan-ly-cong-viec", { scroll: false });
  }, [router, searchParams]);

  const table = useQlcvTable({
    canApprove,
    boardFilter: kanban.boardFilter,
    mergedTasks,
  });

  useEffect(() => {
    void kanban.fetchTasksInitial();
  }, [kanban.fetchTasksInitial]);

  useEffect(() => {
    void getTrangThaiMauSacMap()
      .then(setMauSacByMa)
      .catch(() => setMauSacByMa({}));
  }, []);

  useEffect(() => {
    const openId = searchParams.get("id")?.trim();
    if (openId) setSelectedTaskId(openId);
  }, [searchParams]);

  const refreshAll = useCallback(async () => {
    await kanban.refreshTasks();
    if (viewMode === "BANG") await table.loadTablePage();
  }, [kanban, table, viewMode]);

  const navigateQlcvMain = useCallback(() => {
    closeTaskDetail();
    setIsAdding(false);
    setEditingTask(null);
    kanban.setBoardFilter(null);
    setActiveTab("DIEN_HANH");
    setViewMode("BANG");
    void refreshAll();
    router.refresh();
  }, [kanban, refreshAll, router, closeTaskDetail]);

  const handleBoardFilter = useCallback(
    (f: QlcvBoardFilter) => {
      setActiveTab("DIEN_HANH");
      setViewMode("BANG");
      closeTaskDetail();
      const next = f === "TOTAL" ? null : f;
      kanban.setBoardFilter(next);
      table.setTablePage(1);
      kanban.setKanbanFocusNonce((n) => n + 1);
    },
    [kanban, table, closeTaskDetail],
  );

  const mainTabs = useMemo((): SupervisionTabDef[] => {
    const tabs: SupervisionTabDef[] = [{ id: "DIEN_HANH", label: "Điều hành", icon: LayoutGrid }];
    if (canManageDinhKy) {
      tabs.push({ id: "DINH_KY", label: "Việc định kỳ", icon: CalendarClock });
    }
    return tabs;
  }, [canManageDinhKy]);

  return (
    <div className="relative space-y-6 px-3 pb-12 pt-1 sm:px-0">
      {selectedTaskId ? (
        <div className="fixed inset-0 z-[300] flex justify-end animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-slate-900/50 bv103-panel-backdrop-in"
            onClick={closeTaskDetail}
          />
          <div className="relative h-full w-full max-w-7xl overflow-y-auto border-l border-slate-200/90 bg-slate-50 p-6 shadow-2xl animate-in slide-in-from-right duration-500 sm:rounded-l-2xl sm:p-8">
            <button
              type="button"
              onClick={closeTaskDetail}
              className="app-shell-focus mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft size={16} aria-hidden /> Quay lại danh sách
            </button>
            <CongViecDetail
              key={selectedTaskId}
              id={selectedTaskId}
              onClose={closeTaskDetail}
              onRefreshList={() => {
                void refreshAll();
                router.refresh();
              }}
            />
          </div>
        </div>
      ) : null}

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <KsnkSupervisionHero
          eyebrow="KSNK · Điều hành nội bộ"
          title={
            <>
              Quản lý <span className="text-[var(--primary)]">công việc</span>
            </>
          }
          description="Một phiếu — một trách nhiệm: giao việc, tick checklist báo tiến độ, nghiệm thu. Việc định kỳ sinh tự động từ mẫu (chu kỳ + checklist từng dòng mô tả)."
          trailing={
            <KsnkSupervisionTabList
              tabs={mainTabs}
              activeId={activeTab}
              onChange={setActiveTab}
              ariaLabel="Quản lý công việc"
            />
          }
        />

        <div
          className={`no-print flex flex-col gap-2 ${bv103LayoutChrome.panelSurface} p-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:p-3.5`}
        >
          {canShowDeXuatButton(qlcvUi) ? (
            <Dialog modal={false} open={isSuggesting} onOpenChange={setIsSuggesting}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="bv103-control-h inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 sm:w-auto"
                >
                  <Send size={15} aria-hidden /> Đề xuất việc mới
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-xl rounded-2xl border border-slate-200/90 bg-slate-50 p-6 shadow-xl sm:p-8">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">
                    Gửi đề xuất công việc
                  </DialogTitle>
                </DialogHeader>
                <DeXuatForm
                  onSuccess={() => {
                    setIsSuggesting(false);
                    void refreshAll();
                    router.refresh();
                  }}
                  onCancel={() => setIsSuggesting(false)}
                />
              </DialogContent>
            </Dialog>
          ) : null}

          {allowed.import ? (
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="bv103-control-h inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 sm:w-auto"
            >
              <Upload size={15} aria-hidden /> Import Excel
            </button>
          ) : null}

          {canShowDirectCreateTask(qlcvUi) ? (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="bv103-control-h inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#026f17] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#025a12] sm:w-auto"
            >
              <Plus size={15} aria-hidden /> Tạo công việc
            </button>
          ) : null}
        </div>

        <Dialog modal={false} open={isAdding} onOpenChange={setIsAdding}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-2xl border border-slate-200/90 bg-slate-50 p-6 shadow-xl sm:p-8">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">Tạo công việc</DialogTitle>
            </DialogHeader>
            <CongViecForm onSuccess={() => void navigateQlcvMain()} onCancel={() => setIsAdding(false)} />
          </DialogContent>
        </Dialog>

        <Dialog modal={false} open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-2xl border border-slate-200/90 bg-slate-50 p-6 shadow-xl sm:p-8">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">Chỉnh sửa công việc</DialogTitle>
            </DialogHeader>
            {editingTask ? (
              <CongViecForm
                initialData={editingTask}
                onSuccess={() => void navigateQlcvMain()}
                onCancel={() => setEditingTask(null)}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog modal={false} open={!!kanban.kanbanApproveRow} onOpenChange={(o) => !o && kanban.setKanbanApproveRow(null)}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-2xl border border-slate-200/90 bg-slate-50 p-6 shadow-xl">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">Phê duyệt đề xuất</DialogTitle>
            </DialogHeader>
            {kanban.kanbanApproveRow ? (
              <CongViecForm
                initialData={kanban.kanbanApproveRow}
                onSuccess={() => {
                  kanban.setKanbanApproveRow(null);
                  void refreshAll();
                  router.refresh();
                }}
                onCancel={() => kanban.setKanbanApproveRow(null)}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <Tabs.Content value="DIEN_HANH" className="outline-none space-y-4">
          {isAdmin || allowed.edit ? <QlcvDmAdminLinks className="no-print" /> : null}
          <QlcvOperationsPanel
            kanban={kanban}
            table={table}
            mergedTasks={mergedTasks}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            qlcvUi={qlcvUi}
            canApprove={canApprove}
            actorStaffId={userData?.id ?? null}
            onSelectTask={setSelectedTaskId}
            onApproveFromKanban={kanban.setKanbanApproveRow}
            onEditTask={setEditingTask}
            onRefreshAll={refreshAll}
            onBoardFilter={handleBoardFilter}
            routerRefresh={() => router.refresh()}
            mauSacByMa={mauSacByMa}
          />
          <QlcvImportDialog
            isOpen={importOpen}
            onClose={() => setImportOpen(false)}
            onImported={() => {
              void refreshAll();
              router.refresh();
            }}
          />
        </Tabs.Content>

        {canManageDinhKy ? (
          <Tabs.Content value="DINH_KY" className="outline-none">
            <QlcvDinhKyPanel />
          </Tabs.Content>
        ) : null}
      </Tabs.Root>
    </div>
  );
}
