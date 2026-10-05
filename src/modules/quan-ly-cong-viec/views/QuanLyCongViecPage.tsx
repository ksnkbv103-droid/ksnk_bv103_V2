"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import * as Tabs from "@radix-ui/react-tabs";
import { Plus, LayoutGrid, CalendarClock, ListChecks, Send, Upload, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import {
  KsnkSupervisionHero,
  KsnkSupervisionTabList,
  type SupervisionTabDef,
} from "@/components/shared/ksnk-supervision-chrome";
import { useModulePermission } from "@/hooks/useModulePermission";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { OpsDetailSheet } from "@/components/shared/OpsDetailSheet";
import {
  QlcvDinhKySummaryBar,
  type QlcvLoaiFilter,
} from "@/modules/quan-ly-cong-viec/components/QlcvDinhKySummaryBar";
import { useQlcvKanban } from "@/modules/quan-ly-cong-viec/hooks/useQlcvKanban";
import { useQlcvTable } from "@/modules/quan-ly-cong-viec/hooks/useQlcvTable";
import {
  canShowDeXuatButton,
  canShowDirectCreateTask,
  canShowQlcvApproveActions,
  type QlcvUiAccessFlags,
} from "@/modules/quan-ly-cong-viec/lib/qlcv-access";
import { mergeQlcvKanbanTasks } from "@/modules/quan-ly-cong-viec/lib/qlcv-list-merge";
import { isDeXuatChoDuyet } from "@/modules/quan-ly-cong-viec/lib/qlcv-workflow-display";
import { QlcvImportDialog } from "@/modules/quan-ly-cong-viec/components/QlcvImportDialog";
import { QLCV_TRANG_THAI_MAU_SAC } from "@/modules/quan-ly-cong-viec/lib/qlcv-labels";
import { listDinhKyMau } from "@/modules/quan-ly-cong-viec/actions/dinh-ky.actions";
import { filterMauDueInPeriod } from "@/modules/quan-ly-cong-viec/lib/qlcv-dinh-ky-period-match";
import {
  resolveQlcvPeriodRange,
  type QlcvPeriodKind,
} from "@/modules/quan-ly-cong-viec/lib/qlcv-period-range";
import { qlcvDateVnFromInstant } from "@/modules/quan-ly-cong-viec/lib/qlcv-today-vn";
import type { CongViecView } from "@/modules/quan-ly-cong-viec/types";
import type { QlcvBoardFilter } from "@/modules/quan-ly-cong-viec/lib/qlcv-board-filter";
import { buildQlcvAnalyticsPrefill } from "@/lib/analytics/qlcv-analytics-deep-link";
import { parseQlcvNguonFromSearchParams } from "@/lib/analytics/qlcv-source-deep-link";

const panelFallback = (
  <p className="py-8 text-center text-sm text-slate-500">Đang tải…</p>
);

/** Lazy per active tab — keep shell/toolbar light (Perf P1). */
const QlcvOperationsPanel = dynamic(
  () =>
    import("@/modules/quan-ly-cong-viec/components/QlcvOperationsPanel").then((m) => ({
      default: m.QlcvOperationsPanel,
    })),
  { ssr: false, loading: () => panelFallback },
);

const NhiemVuPanel = dynamic(
  () =>
    import("@/modules/quan-ly-cong-viec/components/NhiemVuPanel").then((m) => ({
      default: m.NhiemVuPanel,
    })),
  { ssr: false, loading: () => panelFallback },
);

const QlcvDinhKyPanel = dynamic(
  () =>
    import("@/modules/quan-ly-cong-viec/components/QlcvDinhKyPanel").then((m) => ({
      default: m.QlcvDinhKyPanel,
    })),
  { ssr: false, loading: () => panelFallback },
);

const QlcvBaoCaoPanel = dynamic(
  () =>
    import("@/modules/quan-ly-cong-viec/components/QlcvBaoCaoPanel").then((m) => ({
      default: m.QlcvBaoCaoPanel,
    })),
  { ssr: false, loading: () => panelFallback },
);

const QlcvPeriodPlanPrintView = dynamic(
  () =>
    import("@/modules/quan-ly-cong-viec/components/print/QlcvPeriodPlanPrintView").then((m) => ({
      default: m.QlcvPeriodPlanPrintView,
    })),
  { ssr: false },
);

const QlcvPeriodExecPrintView = dynamic(
  () =>
    import("@/modules/quan-ly-cong-viec/components/print/QlcvPeriodExecPrintView").then((m) => ({
      default: m.QlcvPeriodExecPrintView,
    })),
  { ssr: false },
);

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

const DeXuatApproveForm = dynamic(
  () => import("@/modules/quan-ly-cong-viec/components/DeXuatApproveForm").then((m) => ({ default: m.DeXuatApproveForm })),
  { ssr: false, loading: () => <p className="text-sm text-slate-500">Đang tải…</p> },
);

export default function QuanLyCongViecPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("DIEN_HANH");
  const [viewMode, setViewMode] = useState<"BANG" | "KANBAN">("BANG");
  const [isAdding, setIsAdding] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<Partial<CongViecView> | undefined>(undefined);
  const [createStayTab, setCreateStayTab] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<CongViecView | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const mauSacByMa = QLCV_TRANG_THAI_MAU_SAC;
  const [loaiFilter, setLoaiFilter] = useState<QlcvLoaiFilter>("ALL");
  const [periodKind, setPeriodKind] = useState<QlcvPeriodKind>("MONTH");
  const [filterBoardByPeriod, setFilterBoardByPeriod] = useState(false);
  const [highlightMauId, setHighlightMauId] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<"plan" | "exec" | null>(null);
  const [printPlanMaus, setPrintPlanMaus] = useState<
    import("@/modules/quan-ly-cong-viec/lib/qlcv-dinh-ky-period-match").DinhKyMauForPeriod[]
  >([]);
  const [printPeriodSnapshot, setPrintPeriodSnapshot] = useState(() => resolveQlcvPeriodRange("MONTH"));
  const [gateCountsRefreshKey, setGateCountsRefreshKey] = useState(0);

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

  const kanban = useQlcvKanban({ canApprove, actorStaffId: userData?.id ?? null });

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
    actorStaffId: userData?.id ?? null,
    mergedTasks,
  });

  useEffect(() => {
    const openId = searchParams.get("id")?.trim();
    if (openId) setSelectedTaskId(openId);
  }, [searchParams]);

  useEffect(() => {
    const tab = searchParams.get("tab")?.trim().toUpperCase();
    if (tab === "DINH_KY" && canManageDinhKy) setActiveTab("DINH_KY");
    else if (tab === "NHIEM_VU" && canManageDinhKy) setActiveTab("NHIEM_VU");
    else if (tab === "BAO_CAO" && canManageDinhKy) setActiveTab("BAO_CAO");
    else if (tab === "DIEN_HANH") setActiveTab("DIEN_HANH");
    else if (tab === "PHAN_CONG_TUAN" || tab === "TUAN" || tab === "CHUONG_TRINH" || tab === "KE_HOACH_NAM") {
      setActiveTab("DIEN_HANH");
    }
    const mau = searchParams.get("mau")?.trim();
    if (mau) {
      setHighlightMauId(mau);
      if (canManageDinhKy) setActiveTab("DINH_KY");
    }
    const loai = searchParams.get("loai")?.trim().toUpperCase();
    if (loai === "DINH_KY") setLoaiFilter("DINH_KY");
    else if (loai === "DOT_XUAT") setLoaiFilter("DOT_XUAT");
  }, [searchParams, canManageDinhKy]);

  useEffect(() => {
    const from = searchParams.get("from");
    if (!from || !["analytics", "CSSD_SU_CO", "GIAM_SAT", "NKBV"].includes(from)) return;
    if (searchParams.get("create") === "1") {
      setCreateStayTab("DIEN_HANH");
      setIsAdding(true);
    }
  }, [searchParams]);

  const periodRange = useMemo(() => resolveQlcvPeriodRange(periodKind), [periodKind]);

  const execPrintTasks = useMemo(() => {
    return mergedTasks.filter((t) => {
      const han = qlcvDateVnFromInstant(t.han_hoan_thanh);
      if (han && han >= periodRange.startIso && han <= periodRange.endIso) return true;
      const created = qlcvDateVnFromInstant(t.created_at);
      if (!han && created && created >= periodRange.startIso && created <= periodRange.endIso) return true;
      return false;
    });
  }, [mergedTasks, periodRange.startIso, periodRange.endIso]);

  const runPrintAfterPaint = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(() => window.print(), 50);
      });
    });
  }, []);

  const runPrintPlan = useCallback(async (kind: QlcvPeriodKind) => {
    setPeriodKind(kind);
    try {
      const rows = await listDinhKyMau();
      const range = resolveQlcvPeriodRange(kind);
      const active = rows
        .filter((r) => r.is_active)
        .map((r) => ({
          id: r.id,
          tieu_de: r.tieu_de,
          mo_ta: r.mo_ta,
          ma_chu_ky: r.ma_chu_ky,
          ngay_bat_dau: r.ngay_bat_dau,
          is_active: r.is_active,
          muc_do_uu_tien: r.muc_do_uu_tien,
          vi_tri_thuc_hien: r.vi_tri_thuc_hien,
        }));
      // Ưu tiên mẫu đến hạn trong kỳ; nếu không có vẫn in toàn bộ mẫu active (phổ biến)
      const due = filterMauDueInPeriod(active, range);
      setPrintPeriodSnapshot(range);
      setPrintPlanMaus(due.length > 0 ? due : active);
      setPrintMode("plan");
      runPrintAfterPaint();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải mẫu để in.");
    }
  }, [runPrintAfterPaint]);

  const runPrintExec = useCallback(() => {
    if (execPrintTasks.length === 0) {
      toast.message("Không có phiếu trong kỳ đã chọn — vẫn mở bản in (có ghi chú trống).");
    }
    setPrintPeriodSnapshot(periodRange);
    setPrintMode("exec");
    runPrintAfterPaint();
  }, [execPrintTasks.length, periodRange, runPrintAfterPaint]);

  useEffect(() => {
    const onAfter = () => setPrintMode(null);
    window.addEventListener("afterprint", onAfter);
    return () => window.removeEventListener("afterprint", onAfter);
  }, []);

  const analyticsGapHint = useMemo(() => {
    const from = searchParams.get("from");
    if (!from || !["analytics", "CSSD_SU_CO", "GIAM_SAT", "NKBV"].includes(from)) return null;
    const topic = searchParams.get("topic")?.trim();
    const gap = searchParams.get("gap")?.trim();
    const khoa = searchParams.get("khoa")?.trim();
    const bk = searchParams.get("bk")?.trim();
    const parts =
      from === "analytics"
        ? ["Mở từ thống kê / báo cáo — tạo việc theo dõi."]
        : ["Mở từ module nguồn — tạo việc KSNK. Hạn do người tạo nhập."];
    if (topic) parts.push(`Tiêu đề gợi ý: ${topic}.`);
    if (gap) parts.push(gap);
    if (khoa) parts.push(`Khoa: ${khoa}.`);
    if (bk) parts.push(`BK thiếu: ${bk}.`);
    return parts.join(" ");
  }, [searchParams]);

  const analyticsCreatePrefill = useMemo(() => {
    const from = searchParams.get("from");
    if (!from || !["analytics", "CSSD_SU_CO", "GIAM_SAT", "NKBV"].includes(from)) return undefined;
    const nguon = parseQlcvNguonFromSearchParams(searchParams);
    const giaRaw = searchParams.get("gia_tri_luc_tao");
    const giaTri =
      giaRaw != null && giaRaw !== "" && Number.isFinite(Number(giaRaw)) ? Number(giaRaw) : null;
    const p = buildQlcvAnalyticsPrefill({
      topic: searchParams.get("topic"),
      gap: searchParams.get("gap"),
      khoa: searchParams.get("khoa"),
      bk: searchParams.get("bk"),
      chiSo: searchParams.get("chi_so"),
      kyDoLai: searchParams.get("ky_do_lai"),
      giaTriLucTao: giaTri,
    });
    const khoaIdRaw = searchParams.get("khoa_id")?.trim() || "";
    const khoaId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(khoaIdRaw)
        ? khoaIdRaw
        : null;
    return {
      tieu_de: p.tieu_de,
      mo_ta: p.mo_ta,
      loai_cong_viec: "DOT_XUAT" as const,
      muc_do_uu_tien: "CAO" as const,
      analytics_meta:
        from === "analytics"
          ? {
              ...p.analytics_meta,
              khoa_id: khoaId,
            }
          : undefined,
      // QLCV-12 / N-QLCV-4 tạm: hạn KHÔNG tự điền từ nguồn (analytics giữ gợi ý ky_do_lai nếu có).
      han_hoan_thanh:
        from === "analytics" ? searchParams.get("ky_do_lai")?.trim() || undefined : undefined,
      nguon_lien_ket: nguon,
    };
  }, [searchParams]);

  const refreshAll = useCallback(async () => {
    await kanban.refreshTasks();
    if (viewMode === "BANG") await table.loadTablePage();
    setGateCountsRefreshKey((n) => n + 1);
  }, [kanban, table, viewMode]);

  const navigateQlcvMain = useCallback(() => {
    closeTaskDetail();
    setIsAdding(false);
    setCreatePrefill(undefined);
    setEditingTask(null);
    kanban.setBoardFilter(null);
    if (createStayTab) {
      setActiveTab(createStayTab);
      setCreateStayTab(null);
    } else {
      setActiveTab("DIEN_HANH");
    }
    setViewMode("BANG");
    void refreshAll();
    router.refresh();
  }, [kanban, refreshAll, router, closeTaskDetail, createStayTab]);

  const openCreateCongViec = useCallback(
    (prefill?: Partial<CongViecView>, stayTab?: string) => {
      setCreatePrefill(prefill);
      setCreateStayTab(stayTab ?? activeTab);
      setIsAdding(true);
    },
    [activeTab],
  );

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
    const tabs: SupervisionTabDef[] = [
      { id: "DIEN_HANH", label: "Điều hành", mobileLabel: "Điều hành", icon: LayoutGrid },
    ];
    // Same gate as the former buried «Kế hoạch năm» link (edit/admin).
    if (canManageDinhKy) {
      tabs.push({ id: "NHIEM_VU", label: "Nhiệm vụ", mobileLabel: "Nhiệm vụ", icon: ListChecks });
      tabs.push({ id: "DINH_KY", label: "Danh mục định kỳ", mobileLabel: "Định kỳ", icon: CalendarClock });
      tabs.push({ id: "BAO_CAO", label: "Báo cáo", mobileLabel: "Báo cáo", icon: BarChart3 });
    }
    return tabs;
  }, [canManageDinhKy]);

  return (
    <div className="relative bv103-stack-page px-3 pb-12 pt-1 sm:px-0">
      <div className={printMode ? "no-print bv103-stack-page" : "bv103-stack-page"}>
      {analyticsGapHint ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-900">
          {analyticsGapHint}
        </div>
      ) : null}
      {/* Ops detail sheet: primary view/edit; confirm dialogs stay nested from CongViecDetail */}
      <OpsDetailSheet
        open={Boolean(selectedTaskId)}
        onOpenChange={(open) => {
          if (!open) closeTaskDetail();
        }}
        title="Chi tiết công việc"
        description="Xem thông tin và thao tác trên phiếu đã chọn"
        footer={
          <button
            type="button"
            onClick={closeTaskDetail}
            className="bv103-control-h inline-flex items-center justify-center rounded-[var(--radius-control)] border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Đóng
          </button>
        }
      >
        {selectedTaskId ? (
          <CongViecDetail
            key={selectedTaskId}
            id={selectedTaskId}
            onClose={closeTaskDetail}
            onRefreshList={() => {
              void refreshAll();
              router.refresh();
            }}
          />
        ) : null}
      </OpsDetailSheet>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full bv103-stack-page">
        <KsnkSupervisionHero
          title="Quản lý công việc"
          trailing={
            <KsnkSupervisionTabList
              tabs={mainTabs}
              activeId={activeTab}
              onChange={setActiveTab}
              ariaLabel="Quản lý công việc"
            />
          }
          actions={
            <>
              {canShowDeXuatButton(qlcvUi) ? (
                <Dialog open={isSuggesting} onOpenChange={setIsSuggesting}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="bv103-control-h inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      <Send size={15} aria-hidden /> Đề xuất việc mới
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl rounded-[var(--radius-shell)] border border-slate-200/90 bg-slate-50 p-6 shadow-[var(--shadow-app-soft)] sm:p-8">
                    <DialogHeader className="mb-4">
                      <DialogTitle className="bv103-type-title tracking-tight text-slate-900">
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
              {canShowDirectCreateTask(qlcvUi) ? (
                <button
                  type="button"
                  onClick={() => openCreateCongViec(undefined, activeTab)}
                  className="bv103-control-h inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--primary)] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[var(--primary-hover)]"
                >
                  <Plus size={15} aria-hidden /> Tạo công việc
                </button>
              ) : null}
            </>
          }
        />

        <Dialog
          open={isAdding}
          onOpenChange={(o) => {
            setIsAdding(o);
            if (!o) {
              setCreatePrefill(undefined);
              setCreateStayTab(null);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[var(--radius-shell)] border border-slate-200/90 bg-slate-50 p-6 shadow-[var(--shadow-app-soft)] sm:p-8">
            <DialogHeader className="mb-4">
              <DialogTitle className="bv103-type-title tracking-tight text-slate-900">Tạo công việc</DialogTitle>
            </DialogHeader>
            <CongViecForm
              key={
                createPrefill?.nhiem_vu_id ||
                analyticsCreatePrefill?.tieu_de ||
                "new-task"
              }
              initialData={createPrefill ?? analyticsCreatePrefill}
              onSuccess={() => void navigateQlcvMain()}
              onCancel={() => {
                setIsAdding(false);
                setCreatePrefill(undefined);
                setCreateStayTab(null);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[var(--radius-shell)] border border-slate-200/90 bg-slate-50 p-6 shadow-[var(--shadow-app-soft)] sm:p-8">
            <DialogHeader className="mb-4">
              <DialogTitle className="bv103-type-title tracking-tight text-slate-900">Chỉnh sửa công việc</DialogTitle>
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

        <Dialog open={!!kanban.kanbanApproveRow} onOpenChange={(o) => !o && kanban.setKanbanApproveRow(null)}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[var(--radius-shell)] border border-slate-200/90 bg-slate-50 p-6 shadow-[var(--shadow-app-soft)]">
            <DialogHeader className="mb-4">
              <DialogTitle className="bv103-type-title tracking-tight text-slate-900">Phê duyệt đề xuất</DialogTitle>
            </DialogHeader>
            {kanban.kanbanApproveRow ? (
              <DeXuatApproveForm
                proposal={kanban.kanbanApproveRow}
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

        <Tabs.Content value="DIEN_HANH" className="outline-none space-y-[var(--bv103-space-3)]">
          {allowed.import ? (
            <div className="no-print flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:underline"
              >
                <Upload size={12} aria-hidden /> Nạp Excel
              </button>
            </div>
          ) : null}
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
            onEditTask={(row) => {
              if (canApprove && isDeXuatChoDuyet(row)) {
                kanban.setKanbanApproveRow(row);
                return;
              }
              setEditingTask(row);
            }}
            onRefreshAll={refreshAll}
            onBoardFilter={handleBoardFilter}
            onCreateTask={() => openCreateCongViec(undefined, "DIEN_HANH")}
            mauSacByMa={mauSacByMa}
            loaiFilter={loaiFilter}
            periodKindFilter={filterBoardByPeriod ? periodKind : null}
            gateCountsRefreshKey={gateCountsRefreshKey}
            summarySlot={
              <QlcvDinhKySummaryBar
                tasks={mergedTasks}
                loaiFilter={loaiFilter}
                onLoaiFilterChange={setLoaiFilter}
                periodKind={periodKind}
                onPeriodKindChange={setPeriodKind}
                filterBoardByPeriod={filterBoardByPeriod}
                onFilterBoardByPeriodChange={setFilterBoardByPeriod}
                onPrintExec={runPrintExec}
              />
            }
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
          <Tabs.Content value="NHIEM_VU" className="outline-none">
            <NhiemVuPanel
              onOpenCongViec={setSelectedTaskId}
              onCreateCongViec={(p) =>
                openCreateCongViec(
                  {
                    loai_cong_viec: "DOT_XUAT",
                    nhiem_vu_id: p.nhiem_vu_id,
                    nguoi_phu_trach_id: p.nguoi_phu_trach_id ?? null,
                    han_hoan_thanh: p.han_hoan_thanh ?? null,
                  },
                  "NHIEM_VU",
                )
              }
            />
          </Tabs.Content>
        ) : null}

        {canManageDinhKy ? (
          <Tabs.Content value="DINH_KY" className="outline-none">
            <QlcvDinhKyPanel highlightMauId={highlightMauId} onRequestPrintPlan={runPrintPlan} onAfterSpawn={() => void refreshAll()} />
          </Tabs.Content>
        ) : null}

        {canManageDinhKy ? (
          <Tabs.Content value="BAO_CAO" className="outline-none">
            <QlcvBaoCaoPanel />
          </Tabs.Content>
        ) : null}
      </Tabs.Root>
      </div>

      {printMode === "plan" ? (
        <QlcvPeriodPlanPrintView period={printPeriodSnapshot} maus={printPlanMaus} />
      ) : null}
      {printMode === "exec" ? (
        <QlcvPeriodExecPrintView period={printPeriodSnapshot} tasks={execPrintTasks} />
      ) : null}
    </div>
  );
}
