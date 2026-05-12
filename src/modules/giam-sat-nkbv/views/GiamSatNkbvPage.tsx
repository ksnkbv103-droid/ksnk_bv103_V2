"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, LayoutList, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { bv103DefaultTuNgayFromToday } from "@/lib/bv103-analytics-default-range";
import { vi } from "date-fns/locale";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import {
  KsnkSupervisionHero,
  KsnkSupervisionTabList,
  KsnkSupervisionPanel,
} from "@/components/shared/ksnk-supervision-chrome";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import { useGiamSatHeader } from "@/hooks/useGiamSatHeader";
import { useModulePermission } from "@/hooks/useModulePermission";
import { useGenerateMa } from "@/hooks/useGenerateMa";
import { useServerPaginatedTable, type ServerPaginationParams } from "@/hooks/use-server-paginated-table";
import {
  createGiamSatNkbvCa,
  getNkbvFormDmBundle,
  getGiamSatNkbvDashboardPayload,
  listAllMaNkbvCas,
  listGiamSatNkbvCas,
  softDeleteGiamSatNkbvCa,
  updateGiamSatNkbvCa,
} from "../actions/giam-sat-nkbv.actions";
import type { RegistrySelectRow } from "@/lib/master-data/registry-select-fetch";
import NkbvCaseEditor, { type NkbvCaseLike } from "../components/NkbvCaseEditor";
import NkbvDashboardPanel from "../components/NkbvDashboardPanel";
import type { NkbvDashboardPayload } from "../lib/nkbv-dashboard-aggregate";

const MODULE_KEY = "GIAM_SAT_NKBV";

type NkbvTableRow = NkbvCaseLike & { id: string };

export default function GiamSatNkbvPage() {
  const header = useGiamSatHeader("nkbv");
  const { loading: permLoading, allowed } = useModulePermission(MODULE_KEY);
  const fetchNkbvPage = useCallback(
    async (params: ServerPaginationParams) => {
      const res = await listGiamSatNkbvCas({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        sortKey: params.sortKey,
        sortDir: params.sortDir,
        khoa_ghi_nhan_id: header.selectedKhoa || undefined,
      });
      if (!res.success) {
        toast.error(res.error || "Lỗi tải danh sách");
        return { success: false as const, data: [], totalCount: 0, error: res.error };
      }
      return {
        success: true as const,
        data: (res.data || []) as NkbvTableRow[],
        totalCount: res.totalCount ?? 0,
      };
    },
    [header.selectedKhoa],
  );

  const {
    data: rows,
    totalPages,
    page,
    setPage,
    pageSize,
    totalCount,
    searchTerm,
    handleSearch,
    handleSort,
    loading: tableLoading,
    refresh,
  } = useServerPaginatedTable<NkbvTableRow>({
    fetchAction: fetchNkbvPage,
    defaultPageSize: 20,
    defaultSortKey: "ngay_phat_hien",
    defaultSortDir: "desc",
  });
  const [loaiRows, setLoaiRows] = useState<RegistrySelectRow[]>([]);
  const [ttRows, setTtRows] = useState<RegistrySelectRow[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<NkbvCaseLike | null>(null);
  const [mainTab, setMainTab] = useState<"cases" | "dashboard">("cases");
  const [dashTu, setDashTu] = useState(() => bv103DefaultTuNgayFromToday());
  const [dashDen, setDashDen] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [dashPayload, setDashPayload] = useState<NkbvDashboardPayload | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  const supervisionTabs = useMemo(
    () => [
      { id: "cases", label: "Danh sách phiếu", icon: LayoutList },
      { id: "dashboard", label: "Thống kê", icon: BarChart3 },
    ],
    [],
  );

  const { maTuDong } = useGenerateMa("NK", undefined, listAllMaNkbvCas);

  const defaultTrangThaiId = useMemo(() => {
    const d = ttRows.find((t) => t.ma === "DANG_GHI_NHAN");
    return d?.id || ttRows[0]?.id || "";
  }, [ttRows]);

  const loadDm = useCallback(async () => {
    const res = await getNkbvFormDmBundle();
    if (res.success && res.data) {
      setLoaiRows(res.data.loaiRows);
      setTtRows(res.data.trangThaiRows);
    }
  }, []);

  useEffect(() => {
    void loadDm();
  }, [loadDm]);

  const prevKhoaRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (permLoading || !allowed.view) return;
    if (prevKhoaRef.current === undefined) {
      prevKhoaRef.current = header.selectedKhoa;
      return;
    }
    if (prevKhoaRef.current !== header.selectedKhoa) {
      prevKhoaRef.current = header.selectedKhoa;
      setPage(1);
      refresh();
    }
  }, [allowed.view, header.selectedKhoa, permLoading, refresh, setPage]);

  const handleColumnSort = useCallback(
    (key: keyof NkbvTableRow) => {
      handleSort(String(key));
    },
    [handleSort],
  );

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await getGiamSatNkbvDashboardPayload({
        khoa_ghi_nhan_id: header.selectedKhoa || undefined,
        tu_ngay: dashTu,
        den_ngay: dashDen,
      });
      if (res.success && res.data) setDashPayload(res.data);
      else {
        toast.error(res.success === false ? res.error : "Lỗi thống kê");
        setDashPayload(null);
      }
    } finally {
      setDashLoading(false);
    }
  }, [dashDen, dashTu, header.selectedKhoa]);

  useEffect(() => {
    if (mainTab !== "dashboard" || permLoading || !allowed.view) return;
    void loadDashboard();
  }, [allowed.view, loadDashboard, mainTab, permLoading]);

  const tableColumns = useMemo(
    () => [
      {
        header: "Mã / BN",
        accessorKey: "ma_ca",
        sortable: true,
        cell: (item: NkbvCaseLike) => (
          <div className="flex flex-col py-1">
            <span className="text-xs font-bold text-slate-800">{String(item.ma_ca ?? "")}</span>
            <span className="text-[10px] font-medium text-slate-400">
              {(item as { ho_ten_benh_nhan?: string }).ho_ten_benh_nhan}
            </span>
          </div>
        ),
      },
      {
        header: "Khoa",
        accessorKey: "khoa",
        cell: (item: NkbvCaseLike) => (
          <span className="text-xs font-medium text-slate-600">
            {(item as { khoa_ghi_nhan?: { ten_khoa?: string } }).khoa_ghi_nhan?.ten_khoa || "—"}
          </span>
        ),
      },
      {
        header: "Loại",
        accessorKey: "loai",
        cell: (item: NkbvCaseLike) => (
          <span className="text-[10px] font-bold uppercase text-[#026f17]">
            {(item as { loai_nkbv?: { ten_loai?: string } }).loai_nkbv?.ten_loai || "—"}
          </span>
        ),
      },
      {
        header: "Ngày PH",
        accessorKey: "ngay_phat_hien",
        sortable: true,
        cell: (item: NkbvCaseLike) => {
          const d = (item as { ngay_phat_hien?: string }).ngay_phat_hien;
          if (!d) return "—";
          try {
            return format(new Date(d), "dd/MM/yyyy", { locale: vi });
          } catch {
            return d;
          }
        },
      },
      {
        header: "Trạng thái",
        accessorKey: "tt",
        cell: (item: NkbvCaseLike) => (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-600">
            {(item as { trang_thai_row?: { ten_trang_thai?: string } }).trang_thai_row?.ten_trang_thai || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        accessorKey: "id",
        cell: (item: NkbvCaseLike) => (
          <div className="flex gap-1">
            {allowed.edit && (
              <button
                type="button"
                onClick={() => {
                  setDraft(item);
                  setEditorOpen(true);
                }}
                className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase text-[#026f17] hover:bg-[#026f17]/10"
              >
                Sửa
              </button>
            )}
            {allowed.delete && (
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("Ẩn phiếu này khỏi danh sách?")) return;
                  const id = String(item.id ?? "");
                  const res = await softDeleteGiamSatNkbvCa(id);
                  if (res.success) {
                    toast.success("Đã ẩn phiếu");
                    void refresh();
                  } else toast.error(res.error);
                }}
                className="rounded-full p-2 text-red-500 hover:bg-red-50"
                title="Ẩn phiếu"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [allowed.delete, allowed.edit, refresh],
  );

  if (permLoading) {
    return <SupervisionPageSkeleton />;
  }

  if (!allowed.view) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-[var(--bg-panel)] px-8 py-12 text-center shadow-[var(--shadow-app-soft)]">
        <p className="text-sm font-medium text-slate-600">Bạn không có quyền truy cập Giám sát NKBV.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 pb-16 duration-500">
      <KsnkSupervisionHero
        eyebrow="Giai đoạn 3 — MVP"
        title="Giám sát Nhiễm khuẩn BV (NKBV)"
        description="Ghi nhận ca HAI thủ công: loại nhiễm, trạng thái xử lý, trích yếu lâm sàng. Chuẩn bị cho tích hợp HIS / Rules CDC sau."
        trailing={
          <KsnkSupervisionTabList
            tabs={supervisionTabs}
            activeId={mainTab}
            onChange={(id) => {
              if (id === "cases" || id === "dashboard") setMainTab(id);
            }}
            ariaLabel="Chế độ NKBV"
          />
        }
      />

      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase text-slate-400">
            Lọc khoa
            <select
              value={header.selectedKhoa}
              disabled={header.loading}
              onChange={(e) => header.setSelectedKhoa(e.target.value)}
              className="min-w-[200px] rounded-2xl border-0 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm"
            >
              <option value="">Tất cả khoa</option>
              {header.khoas.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ten_danh_muc}
                </option>
              ))}
            </select>
          </label>
        </div>
        {mainTab === "cases" && allowed.create ? (
          <button
            type="button"
            disabled={!loaiRows.length || !ttRows.length}
            title={!loaiRows.length || !ttRows.length ? "Đang tải danh mục…" : undefined}
            onClick={() => {
              setDraft(null);
              setEditorOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-full bg-[#026f17] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#026f17]/20 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Phiếu mới
          </button>
        ) : null}
      </div>

      {mainTab === "dashboard" ? (
        <KsnkSupervisionPanel className="pt-2">
          <NkbvDashboardPanel
            payload={dashPayload}
            loading={dashLoading}
            tuNgay={dashTu}
            denNgay={dashDen}
            onTuNgayChange={setDashTu}
            onDenNgayChange={setDashDen}
            onApplyRange={() => void loadDashboard()}
          />
        </KsnkSupervisionPanel>
      ) : null}

      {mainTab === "cases" ? (
        <div className="app-data-shell mx-4 overflow-hidden p-2 md:p-3">
          <AdvancedDataTable
            columns={tableColumns as Parameters<typeof AdvancedDataTable>[0]["columns"]}
            data={rows as Parameters<typeof AdvancedDataTable>[0]["data"]}
            loading={tableLoading}
            searchPlaceholder="Tìm mã phiếu, họ tên, khoa…"
            searchValue={searchTerm}
            onSearch={handleSearch}
            onSort={handleColumnSort}
            serverPagination={{
              page,
              totalPages,
              totalCount,
              pageSize,
              onPageChange: setPage,
            }}
          />
        </div>
      ) : null}

      {editorOpen && loaiRows.length > 0 && ttRows.length > 0 && (draft?.id ? allowed.edit : allowed.create) ? (
        <NkbvCaseEditor
          row={draft}
          onClose={() => setEditorOpen(false)}
          khoas={header.khoas}
          loaiRows={loaiRows}
          trangThaiRows={ttRows}
          defaultTrangThaiId={defaultTrangThaiId}
          maTuDong={maTuDong}
          onSubmit={async (payload) => {
            const res = draft?.id
              ? await updateGiamSatNkbvCa(String(draft.id), payload)
              : await createGiamSatNkbvCa(payload);
            if (res.success) {
              toast.success("Đã lưu");
              setEditorOpen(false);
              void refresh();
            } else toast.error(res.error);
          }}
        />
      ) : null}
    </div>
  );
}
