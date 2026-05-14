"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";
import { Plus, LayoutGrid, BarChart3, X, ArrowLeft, Send, Table2, Pencil, Trash2 } from "lucide-react";
import KsnkPageShell from "@/components/shared/KsnkPageShell";
import {
  KsnkSupervisionHero,
  KsnkSupervisionPanel,
  KsnkSupervisionTabList,
  type SupervisionTabDef,
} from "@/components/shared/ksnk-supervision-chrome";
import SearchBar from "@/components/shared/SearchBar";
import { DashboardStats } from "@/modules/quan-ly-cong-viec/components/DashboardStats";
import { getCongViecList, getCongViecListPaginated, deleteCongViec } from "@/modules/quan-ly-cong-viec/actions/cong-viec.actions";
import { getPendingDeXuat } from "@/modules/quan-ly-cong-viec/actions/dexuat.actions";
import { xacNhanDaNhanCongViec } from "@/modules/quan-ly-cong-viec/actions/cong-viec-write.actions";
import {
  isChoNghiemThuHoanThanh,
  isChoNhanViec,
  isDeXuatChoDuyet,
} from "@/modules/quan-ly-cong-viec/lib/qlcv-workflow-display";
import {
  canShowDeleteTask,
  canShowDeXuatButton,
  canShowDirectCreateTask,
  canShowEditTaskMetadata,
  type QlcvUiAccessFlags,
} from "@/modules/quan-ly-cong-viec/lib/qlcv-access";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { useModulePermission } from "@/hooks/useModulePermission";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
} from "@/components/ui/dialog";

const CongViecKanban = dynamic(() => import("@/modules/quan-ly-cong-viec/components/CongViecKanban"), {
  ssr: false,
  loading: () => <div className="min-h-[280px] animate-pulse rounded-2xl border border-slate-200/90 bg-slate-50" />,
});

const CongViecDashboardAnalytics = dynamic(
  () => import("@/modules/quan-ly-cong-viec/components/CongViecDashboardAnalytics").then((m) => ({ default: m.CongViecDashboardAnalytics })),
  { ssr: false, loading: () => <div className="h-56 animate-pulse rounded-2xl border border-slate-200/90 bg-slate-50" /> },
);

const CongViecDetail = dynamic(
  () => import("@/modules/quan-ly-cong-viec/components/CongViecDetail").then((m) => ({ default: m.CongViecDetail })),
  { ssr: false },
);

const CongViecForm = dynamic(
  () => import("@/modules/quan-ly-cong-viec/components/CongViecForm").then((m) => ({ default: m.CongViecForm })),
  { ssr: false, loading: () => <p className="py-6 text-center text-sm text-slate-500">Đang tải biểu mẫu…</p> },
);

const DinhKyRulesPanel = dynamic(
  () => import("@/modules/quan-ly-cong-viec/components/DinhKyRulesPanel").then((m) => ({ default: m.DinhKyRulesPanel })),
  { ssr: false, loading: () => <div className="h-36 animate-pulse rounded-xl bg-slate-50" /> },
);

const DeXuatApprovalList = dynamic(
  () => import("@/modules/quan-ly-cong-viec/components/DeXuatApprovalList").then((m) => ({ default: m.DeXuatApprovalList })),
  { ssr: false, loading: () => <div className="h-24 animate-pulse rounded-xl bg-amber-50/50" /> },
);

const DeXuatForm = dynamic(
  () => import("@/modules/quan-ly-cong-viec/components/DeXuatForm").then((m) => ({ default: m.DeXuatForm })),
  { ssr: false, loading: () => <p className="text-sm text-slate-500">Đang tải…</p> },
);

export default function QuanLyCongViecPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("CONG_VIEC");
  /** Kanban vs bảng (chỉ trong tab Danh sách công việc) */
  const [congSubTab, setCongSubTab] = useState<"KANBAN" | "BANG">("KANBAN");
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  /** Đề xuất (is_active=false) gộp vào Kanban cho người có quyền phê duyệt — cùng bảng fact_cong_viec. */
  const [pendingKanbanExtras, setPendingKanbanExtras] = useState<any[]>([]);
  const [kanbanApproveRow, setKanbanApproveRow] = useState<any | null>(null);

  /** Tab Bảng: phân trang server */
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize] = useState(20);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableSearchInput, setTableSearchInput] = useState("");
  const [tableSearchDebounced, setTableSearchDebounced] = useState("");
  const [tableSortKey, setTableSortKey] = useState("created_at");
  const [tableSortDir, setTableSortDir] = useState<"asc" | "desc">("desc");

  const [searchTerm, setSearchTerm] = useState("");
  const [kanbanSearchDebounced, setKanbanSearchDebounced] = useState("");

  useEffect(() => {
    const tid = window.setTimeout(() => setKanbanSearchDebounced(searchTerm.trim().toLowerCase()), 220);
    return () => window.clearTimeout(tid);
  }, [searchTerm]);

  useEffect(() => {
    if (activeTab === "PHE_DUYET") setActiveTab("CONG_VIEC");
  }, [activeTab]);

  useEffect(() => {
    const tid = setTimeout(() => setTableSearchDebounced(tableSearchInput.trim()), 300);
    return () => clearTimeout(tid);
  }, [tableSearchInput]);

  const { isAdmin, allowed, userData } = useModulePermission("CONG_VIEC");

  const qlcvUi: QlcvUiAccessFlags = useMemo(
    () => ({
      isRBACAdmin: isAdmin,
      hasDelete: allowed.delete,
      hasEdit: allowed.edit,
      hasCreate: allowed.create,
      actorStaffId: userData?.id ?? null,
    }),
    [isAdmin, allowed.delete, allowed.edit, allowed.create, userData?.id]
  );

  // Kiểm tra quyền phê duyệt (Admin hoặc có quyền APPROVE)
  const canApprove = isAdmin || allowed.edit; // Giả định edit/manage là có quyền duyệt hoặc thêm logic APPROVE cụ thể

  const pullTasks = useCallback(async () => {
    const data = await getCongViecList();
    setTasks(data || []);
    if (canApprove) {
      try {
        const p = await getPendingDeXuat();
        setPendingKanbanExtras(p);
      } catch {
        setPendingKanbanExtras([]);
      }
    } else {
      setPendingKanbanExtras([]);
    }
  }, [canApprove]);

  const fetchTasksInitial = useCallback(async () => {
    setLoading(true);
    try {
      await pullTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pullTasks]);

  const refreshTasks = useCallback(async () => {
    try {
      await pullTasks();
    } catch (err) {
      console.error(err);
    }
  }, [pullTasks]);

  /** Sau lưu / báo cáo: đóng chi tiết & modal, về tab Danh sách công việc + làm mới. */
  const navigateQlcvMain = useCallback(() => {
    setSelectedTaskId(null);
    setIsAdding(false);
    setEditingTask(null);
    setActiveTab("CONG_VIEC");
    setCongSubTab("KANBAN");
    void refreshTasks();
    router.refresh();
  }, [refreshTasks, router]);

  const loadTablePage = useCallback(async () => {
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
      setTableRows(r.rows || []);
      setTableTotal(r.totalCount);
    } catch (err) {
      console.error(err);
      toast.error("Không tải được bảng công việc.");
    } finally {
      setTableLoading(false);
    }
  }, [tablePage, tablePageSize, tableSearchDebounced, tableSortKey, tableSortDir, canApprove]);

  useEffect(() => {
    void fetchTasksInitial();
  }, [fetchTasksInitial]);

  useEffect(() => {
    if (congSubTab !== "BANG") return;
    void loadTablePage();
  }, [congSubTab, loadTablePage]);

  const internalTasks = tasks;

  const internalTableTasks = useMemo(() => tableRows, [tableRows]);

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

  const kanbanTasks = useMemo(() => {
    const activeIds = new Set(internalTasks.map((t: any) => t.id));
    const extras = pendingKanbanExtras.filter((p: any) => !activeIds.has(p.id));
    const merged = [...extras, ...internalTasks];
    return merged.filter((t) => {
      if (!kanbanSearchDebounced) return true;
      const term = kanbanSearchDebounced;
      return (
        t.tieu_de?.toLowerCase().includes(term) ||
        t.nguoi_phu_trach_ten?.toLowerCase().includes(term) ||
        String(t.nguoi_tao_ten || "")
          .toLowerCase()
          .includes(term)
      );
    });
  }, [internalTasks, pendingKanbanExtras, kanbanSearchDebounced]);

  const qlcvMainTabs = useMemo(
    (): SupervisionTabDef[] => [
      { id: "CONG_VIEC", label: "Danh sách công việc", icon: LayoutGrid },
      { id: "THONG_KE", label: "Thống kê & báo cáo", icon: BarChart3 },
    ],
    [],
  );

  const congSubTabsDef = useMemo(
    (): SupervisionTabDef[] => [
      { id: "KANBAN", label: "Kanban", icon: LayoutGrid },
      { id: "BANG", label: "Bảng", icon: Table2 },
    ],
    [],
  );

  const columns = useMemo(() => {
    return [
      {
        header: "Nhiệm vụ",
        accessorKey: "tieu_de",
        headerClassName: "min-w-[12rem] w-[30%]",
        cellClassName: "min-w-0 align-top",
        cell: (row: any) => (
          <div className="flex flex-col gap-1 py-1 text-left">
            <span className="font-bold text-slate-800">{row.tieu_de}</span>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{row.loai_cong_viec}</span>
          </div>
        ),
        sortable: true,
      },
      {
        header: "Ưu tiên",
        accessorKey: "muc_do_uu_tien",
        headerClassName: "w-28 whitespace-nowrap",
        cellClassName: "align-middle",
        cell: (row: any) => {
          const priorityColors: Record<string, string> = {
            CAO: "text-red-600 bg-red-50 border-red-100",
            TRUNG_BINH: "text-amber-600 bg-amber-50 border-amber-100",
            THAP: "text-slate-500 bg-slate-50 border-slate-100",
          };
          const color = priorityColors[row.muc_do_uu_tien] || priorityColors["TRUNG_BINH"];
          return (
            <span className={`rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${color}`}>
              {row.muc_do_uu_tien || "TRUNG_BINH"}
            </span>
          );
        },
        sortable: true,
      },
      {
        header: "Phụ trách",
        accessorKey: "nguoi_phu_trach_ten",
        headerClassName: "w-[14%] min-w-[7rem]",
        cellClassName: "min-w-0 align-middle",
        cell: (row: any) => <span className="text-sm font-semibold text-slate-600">{row.nguoi_phu_trach_ten || "---"}</span>,
        sortable: true,
      },
      {
        header: "Tiến độ",
        accessorKey: "phan_tram_hoan_thanh",
        headerClassName: "w-32 whitespace-nowrap",
        cellClassName: "align-middle",
        cell: (row: any) => (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-[#026f17] w-8">{row.phan_tram_hoan_thanh || 0}%</span>
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#026f17]" style={{ width: `${row.phan_tram_hoan_thanh || 0}%` }} />
            </div>
          </div>
        ),
        sortable: true,
      },
      {
        header: "Hạn chót",
        accessorKey: "han_hoan_thanh",
        headerClassName: "w-28 whitespace-nowrap",
        cellClassName: "whitespace-nowrap align-middle",
        cell: (row: any) => (
          <span className="text-[11px] font-black text-slate-500">
            {row.han_hoan_thanh ? new Date(row.han_hoan_thanh).toLocaleDateString("vi-VN") : "---"}
          </span>
        ),
        sortable: true,
      },
      {
        header: "Trạng thái",
        accessorKey: "trang_thai",
        headerClassName: "min-w-[10rem] w-[18%]",
        cellClassName: "min-w-0 align-middle",
        cell: (row: any) => {
          let styleKey = row.trang_thai;
          let label = row.trang_thai?.replace(/_/g, " ") || "";
          if (isDeXuatChoDuyet(row)) {
            styleKey = "DE_XUAT_CHO_DUYET";
            label = "Đề xuất chờ duyệt";
          } else if (isChoNhanViec(row)) {
            styleKey = "CHO_NHAN_VIEC";
            label = "Chờ nhận việc";
          } else if (isChoNghiemThuHoanThanh(row)) {
            styleKey = "CHO_XAC_NHAN_HOAN_THANH";
            label = "Chờ nghiệm thu";
          }
          const styles: Record<string, string> = {
            DE_XUAT_CHO_DUYET: "bg-violet-50 text-violet-700",
            CHO_NHAN_VIEC: "bg-sky-50 text-sky-700",
            CHO_XAC_NHAN_HOAN_THANH: "bg-orange-50 text-orange-700",
            CHUA_BAT_DAU: "bg-slate-100 text-slate-500",
            DANG_THUC_HIEN: "bg-amber-50 text-amber-600",
            HOAN_THANH: "bg-emerald-50 text-emerald-600",
            QUA_HAN: "bg-red-50 text-red-600",
            DA_HUY: "bg-slate-100 text-slate-400 line-through",
          };
          return (
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${styles[styleKey] || styles["CHUA_BAT_DAU"]}`}
            >
              {label}
            </span>
          );
        },
        sortable: true,
      },
      {
        header: "Thao tác",
        accessorKey: "id",
        headerClassName: "w-[11rem] text-right",
        cellClassName: "align-middle text-right",
        cell: (row: any) => (
          <div className="flex flex-wrap items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {canShowEditTaskMetadata(row, qlcvUi) ? (
              <button
                type="button"
                title="Sửa"
                className="bv103-control-h inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                onClick={() => setEditingTask(row)}
              >
                <Pencil size={13} aria-hidden /> Sửa
              </button>
            ) : null}
            {canShowDeleteTask(row, qlcvUi) ? (
              <button
                type="button"
                title="Xóa"
                className="bv103-control-h inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50/90 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 hover:bg-red-100"
                onClick={async () => {
                  const msg =
                    row.trang_thai === "HOAN_THANH"
                      ? "Xóa vĩnh viễn công việc đã hoàn thành?"
                      : "Xóa công việc này?";
                  if (!confirm(msg)) return;
                  try {
                    await deleteCongViec(row.id);
                    toast.success("Đã xóa công việc.");
                    await refreshTasks();
                    if (congSubTab === "BANG") await loadTablePage();
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : "Không xóa được.");
                  }
                }}
              >
                <Trash2 size={14} aria-hidden /> Xóa
              </button>
            ) : null}
          </div>
        ),
      },
    ];
  }, [qlcvUi, refreshTasks, loadTablePage, congSubTab]);

  return (
    <KsnkPageShell>
      <div className="relative space-y-6 px-3 pb-12 pt-1 sm:px-0">
        {selectedTaskId && (
          <div className="fixed inset-0 z-[300] flex justify-end animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setSelectedTaskId(null)} />
            <div className="relative h-full w-full max-w-7xl overflow-y-auto border-l border-slate-200/90 bg-slate-50 p-6 shadow-2xl animate-in slide-in-from-right duration-500 sm:rounded-l-2xl sm:p-8">
              <button
                type="button"
                onClick={() => setSelectedTaskId(null)}
                className="app-shell-focus mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft size={16} aria-hidden /> Quay lại danh sách
              </button>
              <CongViecDetail
                id={selectedTaskId}
                onClose={() => setSelectedTaskId(null)}
                onRefreshList={() => {
                  void refreshTasks();
                  router.refresh();
                }}
              />
            </div>
          </div>
        )}

        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <KsnkSupervisionHero
            eyebrow="Khoa Kiểm soát nhiễm khuẩn · Quản lý vận hành"
            title={
              <>
                Quản lý <span className="text-[var(--primary)]">công việc</span>
              </>
            }
            trailing={
              <KsnkSupervisionTabList
                tabs={qlcvMainTabs}
                activeId={activeTab}
                onChange={setActiveTab}
                ariaLabel="Chế độ quản lý công việc"
              />
            }
            actions={
              <div className="flex flex-wrap items-center justify-end gap-2">
                {canShowDeXuatButton(qlcvUi) ? (
                  <Dialog modal={false} open={isSuggesting} onOpenChange={setIsSuggesting}>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="bv103-control-h inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
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
                          setActiveTab("CONG_VIEC");
                          void refreshTasks();
                          router.refresh();
                        }}
                        onCancel={() => setIsSuggesting(false)}
                      />
                    </DialogContent>
                  </Dialog>
                ) : null}

                {canShowDirectCreateTask(qlcvUi) ? (
                  <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="bv103-control-h inline-flex items-center gap-2 rounded-xl bg-[#026f17] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#025a12]"
                  >
                    <Plus size={15} aria-hidden /> Tạo công việc
                  </button>
                ) : null}
              </div>
            }
          />

          <div className="no-print rounded-2xl border border-slate-200/90 bg-white/80 p-4 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] sm:p-5">
            <DashboardStats tasks={internalTasks} />
          </div>

        {isAdding && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-300">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-8 shadow-2xl">
              <button 
                onClick={() => setIsAdding(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white text-slate-400 hover:text-red-500 transition-colors shadow-sm"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tight">Thêm nhiệm vụ mới</h2>
              <CongViecForm 
                onSuccess={() => {
                  void navigateQlcvMain();
                  if (congSubTab === "BANG") void loadTablePage();
                }} 
                onCancel={() => setIsAdding(false)} 
              />
            </div>
          </div>
        )}

        {editingTask && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-300">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-8 shadow-2xl">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white text-slate-400 hover:text-red-500 transition-colors shadow-sm"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tight">Chỉnh sửa nhiệm vụ</h2>
              <CongViecForm
                initialData={editingTask}
                onSuccess={() => {
                  void navigateQlcvMain();
                  if (congSubTab === "BANG") void loadTablePage();
                }}
                onCancel={() => setEditingTask(null)}
              />
            </div>
          </div>
        )}

        <Dialog modal={false} open={!!kanbanApproveRow} onOpenChange={(o) => !o && setKanbanApproveRow(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200/90 bg-slate-50 p-6 shadow-xl">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">
                Phê duyệt từ Kanban
              </DialogTitle>
            </DialogHeader>
            {kanbanApproveRow ? (
              <CongViecForm
                initialData={kanbanApproveRow}
                onSuccess={() => {
                  setKanbanApproveRow(null);
                  void refreshTasks();
                  if (congSubTab === "BANG") void loadTablePage();
                  router.refresh();
                }}
                onCancel={() => setKanbanApproveRow(null)}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <Tabs.Content value="CONG_VIEC" className="outline-none">
          <KsnkSupervisionPanel className="space-y-5">
              {canApprove ? (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-sm ring-1 ring-amber-900/[0.06] sm:p-5">
                  <p className="mb-3 text-xs font-semibold text-amber-950">
                    Đề xuất chờ phê duyệt — chọn tổ, người phụ trách và hạn khi bấm «Xem xét & Giao việc». Các đề xuất cũng hiện trên Kanban / Bảng.
                  </p>
                  <DeXuatApprovalList
                    onApproved={() => {
                      void refreshTasks();
                      if (congSubTab === "BANG") void loadTablePage();
                      router.refresh();
                    }}
                  />
                </div>
              ) : null}

              <div className="min-w-0 w-full rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm sm:p-4">
                <SearchBar
                  key={congSubTab}
                  value={congSubTab === "KANBAN" ? searchTerm : tableSearchInput}
                  onChange={(v) => {
                    if (congSubTab === "KANBAN") setSearchTerm(v);
                    else {
                      setTablePage(1);
                      setTableSearchInput(v);
                    }
                  }}
                  placeholder={
                    congSubTab === "KANBAN"
                      ? "Tìm tên việc, người phụ trách…"
                      : "Tìm trong bảng (tiêu đề, phụ trách, trạng thái…)"
                  }
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <KsnkSupervisionTabList
                  tabs={congSubTabsDef}
                  activeId={congSubTab}
                  onChange={(id) => setCongSubTab(id as "KANBAN" | "BANG")}
                  ariaLabel="Kanban hoặc bảng"
                />
              </div>

              {congSubTab === "KANBAN" ? (
                <CongViecKanban
                  tasks={kanbanTasks}
                  showProposalColumn={canApprove}
                  actorStaffId={userData?.id ?? null}
                  onNhanNhiemVu={async (taskId) => {
                    try {
                      await xacNhanDaNhanCongViec(taskId);
                      toast.success("Đã xác nhận nhận nhiệm vụ!");
                      await refreshTasks();
                      router.refresh();
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Không thể xác nhận nhận việc.");
                    }
                  }}
                  onTaskClick={(task) => {
                    if (canApprove && isDeXuatChoDuyet(task)) {
                      setKanbanApproveRow(task);
                      return;
                    }
                    setSelectedTaskId(task.id);
                  }}
                />
              ) : (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-2 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] sm:p-3">
                  <AdvancedDataTable
                    columns={columns}
                    data={internalTableTasks}
                    loading={tableLoading}
                    onRowClick={(item) => setSelectedTaskId(item.id)}
                    hideSearch
                    searchPlaceholder="Tìm trong bảng (tiêu đề, phụ trách, trạng thái...)"
                    tableClassName="w-full min-w-0 table-fixed border-collapse text-sm"
                    searchValue={tableSearchInput}
                    onSearch={handleTableSearch}
                    onSort={handleTableSort}
                    serverPagination={{
                      page: tablePage,
                      totalPages: tableTotalPages,
                      totalCount: tableTotal,
                      pageSize: tablePageSize,
                      onPageChange: setTablePage,
                    }}
                  />
                </div>
              )}
          </KsnkSupervisionPanel>
        </Tabs.Content>

        <Tabs.Content value="THONG_KE" className="outline-none">
          <KsnkSupervisionPanel className="space-y-6">
            <CongViecDashboardAnalytics tasks={internalTasks} />
            <DinhKyRulesPanel />
          </KsnkSupervisionPanel>
        </Tabs.Content>
      </Tabs.Root>
      </div>
    </KsnkPageShell>
  );
}
