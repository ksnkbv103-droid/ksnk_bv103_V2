"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, LayoutList, Plus, Trash2, FileSpreadsheet, Activity, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
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
  listNkbvMedicalRecords, // Added
} from "../actions/giam-sat-nkbv.actions";
import type { RegistrySelectRow } from "@/lib/master-data/registry-select-fetch";
import dynamic from "next/dynamic";
import NkbvCaseEditor, { type NkbvCaseLike } from "../components/NkbvCaseEditor";
import NkbvViSinhImportPortal from "../components/NkbvViSinhImportPortal";
import NkbvMauSoDailyPortal from "../components/NkbvMauSoDailyPortal";
import type { NkbvDashboardPayload } from "../lib/nkbv-dashboard-aggregate";
import NkbvClinicalChecklistModal from "../components/NkbvClinicalChecklistModal";

const NkbvDashboardPanel = dynamic(() => import("../components/NkbvDashboardPanel"), {
  ssr: false,
  loading: () => <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-slate-50/90" />,
});

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
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistCase, setChecklistCase] = useState<NkbvTableRow | null>(null);
  const [mainTab, setMainTab] = useState<"cases" | "records" | "dashboard" | "vi-sinh" | "mau-so">("cases");
  const [dashTu, setDashTu] = useState(() => bv103DefaultTuNgayFromToday());
  const [dashDen, setDashDen] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [dashPayload, setDashPayload] = useState<NkbvDashboardPayload | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  const supervisionTabs = useMemo(
    () => [
      { id: "cases", label: "Danh sách phiếu", icon: LayoutList },
      { id: "records", label: "Hồ sơ Bệnh án", icon: HeartPulse },
      { id: "vi-sinh", label: "Cổng Vi sinh LIS", icon: FileSpreadsheet },
      { id: "mau-so", label: "Nộp Mẫu số", icon: Activity },
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

  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsTotalCount, setRecordsTotalCount] = useState(0);
  const [recordsSearch, setRecordsSearch] = useState("");
  const [selectedMaBenhAn, setSelectedMaBenhAn] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (mainTab !== "records") return;
    setRecordsLoading(true);
    try {
      const res = await listNkbvMedicalRecords({
        page: recordsPage,
        pageSize: 15,
        search: recordsSearch,
      });
      if (res.success) {
        setMedicalRecords(res.data);
        setRecordsTotalCount(res.totalCount);
      } else {
        toast.error(res.error || "Không thể tải danh sách bệnh án");
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi");
    } finally {
      setRecordsLoading(false);
    }
  }, [mainTab, recordsPage, recordsSearch]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const recordColumns = useMemo(
    () => [
      {
        header: "Mã bệnh án (Số HS)",
        accessorKey: "ma_benh_an",
        cell: (item: any) => (
          <span className="font-bold text-slate-800 font-mono">{item.ma_benh_an}</span>
        ),
      },
      {
        header: "Mã bệnh nhân",
        accessorKey: "ma_benh_nhan",
        cell: (item: any) => (
          <span className="text-slate-550 font-semibold">{item.ma_benh_nhan || "—"}</span>
        ),
      },
      {
        header: "Họ và tên",
        accessorKey: "ho_ten_benh_nhan",
        cell: (item: any) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">{item.ho_ten_benh_nhan}</span>
            {item.ngay_sinh && (
              <span className="text-[10px] text-slate-400">
                Sinh: {item.ngay_sinh} {item.gioi_tinh ? `(${item.gioi_tinh})` : ""}
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Đợt nằm viện",
        accessorKey: "ngay_vao_vien",
        cell: (item: any) => (
          <div className="text-xs text-slate-600 font-medium">
            <span>{item.ngay_vao_vien ? format(parseISO(item.ngay_vao_vien), "dd/MM/yyyy") : "—"}</span>
            <span className="mx-1">→</span>
            <span>{item.ngay_ra_vien ? format(parseISO(item.ngay_ra_vien), "dd/MM/yyyy") : <span className="text-emerald-600 font-bold italic">Đang nằm viện</span>}</span>
          </div>
        ),
      },
      {
        header: "Kết cục",
        accessorKey: "ket_cuc_dieu_tri",
        cell: (item: any) => {
          if (!item.ket_cuc_dieu_tri) return <span className="text-slate-400">—</span>;
          const labelMap: Record<string, string> = {
            KHOI_DO: "Khỏi / Đỡ",
            NANG_XIN_VE: "Nặng xin về",
            TU_VONG: "Tử vong 💀",
            CHUYEN_VIEN: "Chuyển viện",
          };
          const text = labelMap[item.ket_cuc_dieu_tri] || item.ket_cuc_dieu_tri;
          const isDeath = item.ket_cuc_dieu_tri === "TU_VONG";
          return (
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              isDeath ? "bg-red-50 text-red-700 border border-red-100 animate-pulse" : "bg-slate-100 text-slate-700"
            }`}>
              {text}
            </span>
          );
        },
      },
      {
        header: "Thống kê LIS & Ca bệnh",
        accessorKey: "lis_records",
        cell: (item: any) => (
          <div className="flex gap-2">
            <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-[10px] font-bold">
              LIS: {item.lis_records?.length || 0}
            </span>
            <span className="rounded-full bg-[#026f17]/10 text-[#026f17] px-2.5 py-0.5 text-[10px] font-bold">
              Ca NKBV: {item.nkbv_cases?.length || 0}
            </span>
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (item: any) => (
          <button
            type="button"
            onClick={() => {
              setMainTab("cases");
              handleSearch(item.ma_benh_an);
            }}
            className="rounded-full bg-[#026f17] hover:bg-[#026615] px-4 py-1.5 text-[11px] font-black uppercase text-white shadow-sm transition"
          >
            Hồ sơ dịch tễ
          </button>
        ),
      },
    ],
    [],
  );

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
        header: "Bệnh án / Bệnh nhân",
        accessorKey: "ma_benh_an",
        sortable: true,
        cell: (item: NkbvCaseLike) => (
          <div className="flex flex-col py-1">
            <span className="text-xs font-black text-slate-800 font-mono">
              {String((item as any).ma_benh_an || "—")}
            </span>
            <span className="text-[10px] font-bold text-slate-500">
              {String((item as any).ma_benh_nhan || "")} - {String((item as any).ho_ten_benh_nhan || "—")}
            </span>
          </div>
        ),
      },
      {
        header: "Khoa chỉ định",
        accessorKey: "khoa",
        cell: (item: NkbvCaseLike) => (
          <span className="text-xs font-medium text-slate-650">
            {(item as { khoa_ghi_nhan?: { ten_khoa?: string } }).khoa_ghi_nhan?.ten_khoa || "—"}
          </span>
        ),
      },
      {
        header: "Loại bệnh phẩm",
        accessorKey: "loai_benh_pham",
        cell: (item: NkbvCaseLike) => (
          <span className="text-xs font-semibold text-slate-700 bg-slate-100/70 border border-slate-200/50 px-2 py-0.5 rounded-lg">
            {String((item as any).loai_benh_pham || "—")}
          </span>
        ),
      },
      {
        header: "Tác nhân vi khuẩn",
        accessorKey: "tac_nhan_vi_khuan",
        cell: (item: NkbvCaseLike) => (
          <span className="text-xs font-bold text-amber-800 font-mono italic">
            {String((item as any).tac_nhan_vi_khuan || "Chưa mọc / Đang chờ")}
          </span>
        ),
      },
      {
        header: "Số lượng (CFU)",
        accessorKey: "so_luong",
        cell: (item: NkbvCaseLike) => (
          <span className="text-xs font-medium text-slate-600 font-mono">
            {String((item as any).so_luong || "—")}
          </span>
        ),
      },
      {
        header: "Ngày lấy mẫu",
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
        header: "Nghi ngờ NKBV",
        accessorKey: "loai",
        cell: (item: NkbvCaseLike) => (
          <span className="text-[10px] font-black uppercase text-[#026f17] bg-[#026f17]/10 px-2.5 py-0.5 rounded-full">
            {(item as { loai_nkbv?: { ten_loai?: string } }).loai_nkbv?.ten_loai || "—"}
          </span>
        ),
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
        cell: (item: NkbvCaseLike) => {
          const isPendingVerification = ["CHO_XAC_NHAN", "CHO_XAC_MINH", "DANG_GHI_NHAN"].includes(
            String((item as any).trang_thai_row?.ma_trang_thai || "")
          );
          return (
            <div className="flex gap-1">
              {allowed.edit && (
                <button
                  type="button"
                  onClick={() => {
                    setChecklistCase(item as NkbvTableRow);
                    setChecklistOpen(true);
                  }}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase transition-colors ${
                    isPendingVerification
                      ? "text-amber-600 hover:bg-amber-600/10"
                      : "text-blue-600 hover:bg-blue-600/10"
                  }`}
                >
                  {isPendingVerification ? "Xác minh" : "Thẩm định"}
                </button>
              )}
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
          );
        },
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
        trailing={
          <KsnkSupervisionTabList
            tabs={supervisionTabs}
            activeId={mainTab}
            onChange={(id) => {
              if (id === "cases" || id === "records" || id === "dashboard" || id === "vi-sinh" || id === "mau-so") setMainTab(id);
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
        {mainTab === "records" && allowed.create ? (
          <button
            type="button"
            disabled={!loaiRows.length || !ttRows.length}
            onClick={() => {
              setDraft({
                ma_benh_an: "",
                ma_benh_nhan: "",
                ho_ten_benh_nhan: "",
                ngay_sinh: "",
                gioi_tinh: "",
                ngay_vao_vien: new Date().toISOString().slice(0, 10),
                khoa_ghi_nhan_id: header.selectedKhoa || "",
              });
              setEditorOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-full bg-[#026f17] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#026f17]/20"
          >
            <Plus className="h-4 w-4" /> Tạo đợt bệnh án mới
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

      {mainTab === "vi-sinh" ? (
        <KsnkSupervisionPanel className="pt-2">
          <NkbvViSinhImportPortal khoas={header.khoas} />
        </KsnkSupervisionPanel>
      ) : null}

      {mainTab === "mau-so" ? (
        <KsnkSupervisionPanel className="pt-2">
          <NkbvMauSoDailyPortal
            khoas={header.khoas}
            selectedKhoaId={header.selectedKhoa || ""}
            onKhoaChange={header.setSelectedKhoa}
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

      {mainTab === "records" ? (
        <div className="app-data-shell mx-4 overflow-hidden p-2 md:p-3 animate-in fade-in duration-300">
          <AdvancedDataTable
            columns={recordColumns as Parameters<typeof AdvancedDataTable>[0]["columns"]}
            data={medicalRecords as Parameters<typeof AdvancedDataTable>[0]["data"]}
            loading={recordsLoading}
            searchPlaceholder="Tìm kiếm Số bệnh án, mã bệnh nhân, họ tên..."
            searchValue={recordsSearch}
            onSearch={(val) => {
              setRecordsSearch(val);
              setRecordsPage(1);
            }}
            serverPagination={{
              page: recordsPage,
              totalPages: Math.ceil(recordsTotalCount / 15) || 1,
              totalCount: recordsTotalCount,
              pageSize: 15,
              onPageChange: setRecordsPage,
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
              void fetchRecords();
            } else toast.error(res.error);
          }}
        />
      ) : null}

      {checklistOpen && checklistCase && allowed.edit && (
        <NkbvClinicalChecklistModal
          row={checklistCase}
          khoas={header.khoas}
          onClose={() => {
            setChecklistOpen(false);
            setChecklistCase(null);
          }}
          onSuccess={() => {
            void refresh();
            void fetchRecords();
          }}
          allowedEdit={allowed.edit}
        />
      )}

    </div>
  );
}
