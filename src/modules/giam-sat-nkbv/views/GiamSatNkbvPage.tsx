"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, LayoutList, Plus, Trash2, FileSpreadsheet, Activity, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { bv103DefaultTuNgayFromToday } from "@/lib/bv103-analytics-default-range";
import { formatDateVi } from "@/lib/format-datetime-vi";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import {
  KsnkSupervisionHero,
  KsnkSupervisionTabList,
  KsnkSupervisionPanel,
} from "@/components/shared/ksnk-supervision-chrome";
import { Bv103AnalyticsPageFrame } from "@/components/shared/Bv103AnalyticsPageFrame";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { formatKhoaCompactLabel, formatKhoaPickerLabel } from "@/lib/domain/khoa-display";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import { useGiamSatHeader } from "@/hooks/useGiamSatHeader";
import { useModulePermission } from "@/hooks/useModulePermission";
import { useGenerateMa } from "@/hooks/useGenerateMa";
import { useServerPaginatedTable, type ServerPaginationParams } from "@/hooks/use-server-paginated-table";
import {
  createGiamSatNkbvCa,
  ensureNkbvBaAnalysisCase,
  getNkbvFormDmBundle,
  getGiamSatNkbvCaById,
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
import NkbvBenhAnImportPortal from "../components/NkbvBenhAnImportPortal";
import NkbvBenhAnEditModal from "../components/NkbvBenhAnEditModal";
import NkbvBenhAnHubPanel from "../components/NkbvBenhAnHubPanel";
import NkbvMdroCensusPanel from "../components/NkbvMdroCensusPanel";
import NkbvMauSoDailyPortal from "../components/NkbvMauSoDailyPortal";
import NkbvCdcLocationBanner from "../components/NkbvCdcLocationBanner";
import type { NkbvDashboardPayload } from "../lib/nkbv-dashboard-aggregate";
import NkbvClinicalChecklistModal from "../components/NkbvClinicalChecklistModal";
import { formatNkbvLoaiDisplay } from "../lib/nkbv-loai-labels";
import { classifyEntityQr } from "@/lib/entity-qr/entity-qr-core";

const NkbvDashboardPanel = dynamic(() => import("../components/NkbvDashboardPanel"), {
  ssr: false,
  loading: () => <div className="h-56 animate-pulse rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50/90" />,
});

const MODULE_KEY = "GIAM_SAT_NKBV";

type NkbvTableRow = NkbvCaseLike & { id: string };

type NkbvMainTab = "cases" | "records" | "dashboard" | "vi-sinh" | "mau-so";

const MAIN_TABS = new Set<NkbvMainTab>(["cases", "records", "dashboard", "vi-sinh", "mau-so"]);

function parseMainTab(raw: string | null): NkbvMainTab | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (MAIN_TABS.has(t as NkbvMainTab)) return t as NkbvMainTab;
  return null;
}

export default function GiamSatNkbvPage() {
  const header = useGiamSatHeader("nkbv");
  const { loading: permLoading, allowed } = useModulePermission(MODULE_KEY);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const lastCaseDeepLink = useRef("");
  const [filterLoaiId, setFilterLoaiId] = useState("");
  const [filterTrangThaiId, setFilterTrangThaiId] = useState("");
  const fetchNkbvPage = useCallback(
    async (params: ServerPaginationParams) => {
      const res = await listGiamSatNkbvCas({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        sortKey: params.sortKey,
        sortDir: params.sortDir,
        khoa_ghi_nhan_id: header.selectedKhoa || undefined,
        loai_nkbv_id: filterLoaiId || undefined,
        trang_thai_id: filterTrangThaiId || undefined,
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
    [filterLoaiId, filterTrangThaiId, header.selectedKhoa],
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
  const [mainTab, setMainTab] = useState<NkbvMainTab>("cases");
  const [dashTu, setDashTu] = useState(() => bv103DefaultTuNgayFromToday());
  const [dashDen, setDashDen] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [dashPayload, setDashPayload] = useState<NkbvDashboardPayload | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [hubBa, setHubBa] = useState<string | null>(null);
  const [hubXn, setHubXn] = useState<string | null>(null);
  const [hubNonce, setHubNonce] = useState(0);
  const [editStay, setEditStay] = useState<Record<string, unknown> | null>(null);

  const setSelectedKhoa = header.setSelectedKhoa;

  /** Deep link: ?case= | ?ba=&xn= | ?tab=… — đọc lại khi URL đổi (nút Phân tích từ kho vi sinh). */
  useEffect(() => {
    if (header.loading) return;
    const caseId = (searchParams.get("case") || "").trim();
    const ba = (searchParams.get("ba") || "").trim();
    const xn = (searchParams.get("xn") || "").trim();
    const tab = parseMainTab(searchParams.get("tab"));
    const tu = (searchParams.get("tu_ngay") || searchParams.get("tu") || "").trim();
    const den = (searchParams.get("den_ngay") || searchParams.get("den") || "").trim();
    const khoa =
      (searchParams.get("khoa") || "").trim() ||
      (searchParams.get("khoa_ids") || "").split(",")[0]?.trim() ||
      "";

    if (tab) setMainTab(tab);
    if (tu) setDashTu(tu);
    if (den) setDashDen(den);
    if (khoa) setSelectedKhoa(khoa);

    if (ba) {
      setMainTab("records");
      setHubBa(ba);
      setHubXn(xn || null);
    } else {
      setHubXn(null);
      setHubBa(null);
    }

    if (caseId && lastCaseDeepLink.current !== caseId) {
      lastCaseDeepLink.current = caseId;
      void (async () => {
        const res = await getGiamSatNkbvCaById(caseId);
        if (!res.success || !res.data) {
          toast.error(res.error || "Không mở được phiếu NKBV từ mã QR");
          return;
        }
        setDraft(res.data as NkbvCaseLike);
        setEditorOpen(true);
        setMainTab("cases");
        toast.success("Đã mở phiếu NKBV từ mã QR / liên kết");
      })();
    }
  }, [header.loading, searchParams, setSelectedKhoa]);

  const openHubBa = useCallback(
    (ma: string, xnId?: string) => {
      const next = String(ma || "").trim();
      if (!next) return;
      setHubBa(next);
      setHubXn(xnId ? String(xnId).trim() : null);
      setMainTab("records");
      const q = new URLSearchParams(searchParams.toString());
      q.set("tab", "records");
      q.set("ba", next);
      if (xnId) q.set("xn", String(xnId).trim());
      else q.delete("xn");
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const closeHubBa = useCallback(() => {
    setHubBa(null);
    setHubXn(null);
    const q = new URLSearchParams(searchParams.toString());
    q.delete("ba");
    q.delete("xn");
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const syncNkbvUrl = useCallback(
    (next: { tab?: NkbvMainTab; tu?: string; den?: string; khoa?: string }) => {
      const q = new URLSearchParams(searchParams.toString());
      const tab = next.tab ?? mainTab;
      if (tab === "cases") q.delete("tab");
      else q.set("tab", tab);
      if (tab === "dashboard") {
        const tu = next.tu ?? dashTu;
        const den = next.den ?? dashDen;
        const khoa = next.khoa !== undefined ? next.khoa : header.selectedKhoa;
        q.set("tu_ngay", tu);
        q.set("den_ngay", den);
        q.delete("tu");
        q.delete("den");
        if (khoa) {
          q.set("khoa_ids", khoa);
          q.set("khoa", khoa); // alias legacy
        } else {
          q.delete("khoa");
          q.delete("khoa_ids");
        }
      }
      const qs = q.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [dashDen, dashTu, header.selectedKhoa, mainTab, pathname, router, searchParams],
  );

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
  const [recordsInpatientOnly, setRecordsInpatientOnly] = useState(false);
  const [recordsDevicePriority, setRecordsDevicePriority] = useState(false);
  const [recordsChuaPtOnly, setRecordsChuaPtOnly] = useState(false);
  const [recordsKhoaId, setRecordsKhoaId] = useState("");

  const fetchRecords = useCallback(async () => {
    if (mainTab !== "records") return;
    setRecordsLoading(true);
    try {
      const res = await listNkbvMedicalRecords({
        page: recordsPage,
        pageSize: 15,
        search: recordsSearch,
        inpatientOnly: recordsInpatientOnly,
        devicePriorityOnly: recordsDevicePriority,
        chuaPhanTichOnly: recordsChuaPtOnly,
        khoaId: recordsKhoaId || null,
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
  }, [
    mainTab,
    recordsPage,
    recordsSearch,
    recordsInpatientOnly,
    recordsDevicePriority,
    recordsChuaPtOnly,
    recordsKhoaId,
  ]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const recordColumns = useMemo(
    () => [
      {
        header: "Mã bệnh án (số hs)",
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
              <span className="text-[11px] text-slate-400">
                Sinh: {formatDateVi(item.ngay_sinh)} {item.gioi_tinh ? `(${item.gioi_tinh})` : ""}
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
            <span>{formatDateVi(item.ngay_vao_vien)}</span>
            <span className="mx-1">→</span>
            <span>{item.ngay_ra_vien ? formatDateVi(item.ngay_ra_vien) : <span className="text-emerald-600 font-medium">Đang nằm viện</span>}</span>
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
            <span className={`px-2.5 py-0.5 rounded-full bv103-type-label font-semibold ${
              isDeath ? "bg-red-50 text-red-700 border border-red-100 animate-pulse" : "bg-slate-100 text-slate-700"
            }`}>
              {text}
            </span>
          );
        },
      },
      {
        header: "Thống kê lis & ca bệnh",
        accessorKey: "lis_records",
        cell: (item: any) => (
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 bv103-type-label font-semibold">
              LIS: {item.lis_records?.length || 0}
            </span>
            <span className="rounded-full bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-0.5 bv103-type-label font-semibold">
              Ca NKBV: {item.nkbv_cases?.length || 0}
            </span>
            {Number(item.chua_phan_tich_count || 0) > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 bv103-type-label font-semibold text-amber-900">
                Chưa PT: {item.chua_phan_tich_count}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (item: any) => (
          <div className="flex flex-wrap justify-end gap-1.5">
            {allowed.edit ? (
              <button
                type="button"
                onClick={() => setEditStay(item)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
              >
                Sửa BA
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => openHubBa(String(item.ma_benh_an || ""))}
              className="rounded-full bg-[var(--primary)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#026615]"
            >
              Hub BA
            </button>
          </div>
        ),
      },
    ],
    [allowed.edit, openHubBa],
  );

  const prevListFilterRef = useRef<{ khoa?: string; loai: string; tt: string } | undefined>(undefined);
  useEffect(() => {
    if (permLoading || !allowed.view) return;
    const next = {
      khoa: header.selectedKhoa,
      loai: filterLoaiId,
      tt: filterTrangThaiId,
    };
    if (prevListFilterRef.current === undefined) {
      prevListFilterRef.current = next;
      return;
    }
    const prev = prevListFilterRef.current;
    if (prev.khoa !== next.khoa || prev.loai !== next.loai || prev.tt !== next.tt) {
      prevListFilterRef.current = next;
      setPage(1);
      refresh();
    }
  }, [allowed.view, filterLoaiId, filterTrangThaiId, header.selectedKhoa, permLoading, refresh, setPage]);

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
            <span className="bv103-type-label font-semibold text-slate-800 font-mono">
              {String((item as any).ma_benh_an || "—")}
            </span>
            <span className="text-[11px] text-[11px] font-medium text-slate-500">
              {String((item as any).ma_benh_nhan || "")} - {String((item as any).ho_ten_benh_nhan || "—")}
            </span>
          </div>
        ),
      },
      {
        header: "Khoa chỉ định",
        accessorKey: "khoa",
        cell: (item: NkbvCaseLike) => {
          const khoa = (item as { khoa_ghi_nhan?: { ma_khoa?: string; ten_khoa?: string } }).khoa_ghi_nhan;
          return (
            <span className="text-xs font-medium text-slate-650">
              {formatKhoaCompactLabel({ ma_khoa: khoa?.ma_khoa, ten_khoa: khoa?.ten_khoa })}
            </span>
          );
        },
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
          <span className="bv103-type-label font-semibold text-amber-800 font-mono">
            {String((item as any).tac_nhan_vi_khuan || "Chưa mọc / Đang chờ")}
          </span>
        ),
      },
      {
        header: "Số lượng (cfu)",
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
          return formatDateVi(d, d);
        },
      },
      {
        header: "Nghi ngờ nkbv",
        accessorKey: "loai",
        cell: (item: NkbvCaseLike) => (
          <span className="font-mono text-[11px] font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-0.5 rounded-full">
            {formatNkbvLoaiDisplay(
              (item as { loai_nkbv?: { ma_loai?: string; ten_loai?: string } }).loai_nkbv?.ma_loai,
              (item as { loai_nkbv?: { ma_loai?: string; ten_loai?: string } }).loai_nkbv?.ten_loai,
            )}
          </span>
        ),
      },
      {
        header: "Trạng thái",
        accessorKey: "tt",
        cell: (item: NkbvCaseLike) => (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
            {(item as { trang_thai_row?: { ten_trang_thai?: string } }).trang_thai_row?.ten_trang_thai || "—"}
          </span>
        ),
      },
      {
        header: "Cảnh báo",
        accessorKey: "import_alerts",
        cell: (item: NkbvCaseLike) => {
          const notes = (item as { clinical_notes?: { import_alerts?: Array<{ code?: string }>; can_phan_tich_sbap?: boolean } }).clinical_notes;
          const codes = new Set(
            (Array.isArray(notes?.import_alerts) ? notes!.import_alerts! : [])
              .map((a) => a.code)
              .filter(Boolean) as string[],
          );
          if (notes?.can_phan_tich_sbap) codes.add("SBAP");
          if (codes.size === 0) return <span className="text-slate-300">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {[...codes].map((c) => (
                <span
                  key={c}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    c === "SBAP" ? "bg-violet-100 text-violet-800" : "bg-amber-100 text-amber-900"
                  }`}
                  title="Cần phân tích khung thời gian — chưa tự chốt"
                >
                  {c}
                </span>
              ))}
            </div>
          );
        },
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
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
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
                  className="rounded-full px-3 py-1.5 font-mono text-[11px] font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10"
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
      <div className="rounded-[var(--radius-shell)] border border-slate-200 bg-[var(--bg-panel)] px-8 py-12 text-center shadow-[var(--shadow-app-soft)]">
        <p className="text-sm font-medium text-slate-600">Bạn không có quyền truy cập Giám sát NKBV.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 bv103-stack-page pb-16 duration-500">
      <KsnkSupervisionHero
        title="Giám sát Nhiễm khuẩn BV (NKBV)"
        trailing={
          <KsnkSupervisionTabList
            tabs={supervisionTabs}
            activeId={mainTab}
            onChange={(id) => {
              if (id === "cases" || id === "records" || id === "dashboard" || id === "vi-sinh" || id === "mau-so") {
                setMainTab(id);
                syncNkbvUrl({ tab: id });
              }
            }}
            ariaLabel="Chế độ NKBV"
          />
        }
      />

      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          {mainTab !== "dashboard" ? (
          <label className={`${C.formLabelFlex} min-w-[220px]`}>
            Lọc khoa
            <SearchableSelect
              placeholder="Tất cả khoa"
              disabled={header.loading}
              options={[
                { id: "", label: "Tất cả khoa" },
                ...header.khoas.map((k) => ({
                  id: k.id,
                  label: formatKhoaPickerLabel({
                    ma_danh_muc: k.ma_danh_muc,
                    ten_danh_muc: k.ten_danh_muc,
                  }),
                })),
              ]}
              value={header.selectedKhoa || ""}
              onChange={(id) => header.setSelectedKhoa(id)}
              className="min-w-[200px]"
            />
          </label>
          ) : null}
          {mainTab === "cases" ? (
            <>
              <label className={C.formLabelFlex}>
                Lọc loại
                <select
                  value={filterLoaiId}
                  onChange={(e) => setFilterLoaiId(e.target.value)}
                  className="min-w-[200px] rounded-[var(--radius-shell)] border-0 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm"
                >
                  <option value="">Tất cả loại</option>
                  {loaiRows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatNkbvLoaiDisplay(r.ma, r.ten)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={C.formLabelFlex}>
                Lọc trạng thái
                <select
                  value={filterTrangThaiId}
                  onChange={(e) => setFilterTrangThaiId(e.target.value)}
                  className="min-w-[200px] rounded-[var(--radius-shell)] border-0 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm"
                >
                  <option value="">Tất cả trạng thái</option>
                  {ttRows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.ten}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
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
            className={`${C.ctaPrimary} disabled:opacity-50`}
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
            className={C.ctaPrimary}
          >
            <Plus className="h-4 w-4" /> Tạo đợt bệnh án mới
          </button>
        ) : null}
      </div>

      {mainTab === "dashboard" ? (
        <Bv103AnalyticsPageFrame
          title="Thống kê NKBV"
          filterBar={
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-7 shrink-0 text-xs font-medium text-slate-500">Kỳ</span>
                <input
                  type="date"
                  value={dashTu}
                  onChange={(e) => setDashTu(e.target.value)}
                  aria-label="Từ ngày"
                  className={T.analyticsDateInput}
                />
                <span className="text-xs text-slate-300">–</span>
                <input
                  type="date"
                  value={dashDen}
                  onChange={(e) => setDashDen(e.target.value)}
                  aria-label="Đến ngày"
                  className={T.analyticsDateInput}
                />
              </div>
              <div className="min-w-0 sm:max-w-xs">
                <SearchableSelect
                  placeholder="Khoa ghi nhận"
                  disabled={header.loading}
                  options={[
                    { id: "", label: "Tất cả khoa" },
                    ...header.khoas.map((k) => ({
                      id: k.id,
                      label: formatKhoaPickerLabel({
                        ma_danh_muc: k.ma_danh_muc,
                        ten_danh_muc: k.ten_danh_muc,
                      }),
                    })),
                  ]}
                  value={header.selectedKhoa || ""}
                  onChange={(id) => {
                    header.setSelectedKhoa(id);
                    syncNkbvUrl({ tab: "dashboard", khoa: id });
                  }}
                  className="w-full"
                />
              </div>
              <div className="flex justify-start sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    syncNkbvUrl({
                      tab: "dashboard",
                      tu: dashTu,
                      den: dashDen,
                      khoa: header.selectedKhoa,
                    });
                    void loadDashboard();
                  }}
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 touch-manipulation"
                >
                  Cập nhật
                </button>
              </div>
            </div>
          }
        >
          <NkbvCdcLocationBanner />
          <NkbvDashboardPanel
            payload={dashPayload}
            loading={dashLoading}
            filtersInChrome
            tuNgay={dashTu}
            denNgay={dashDen}
            onTuNgayChange={setDashTu}
            onDenNgayChange={setDashDen}
            onApplyRange={() => {
              syncNkbvUrl({ tab: "dashboard", tu: dashTu, den: dashDen, khoa: header.selectedKhoa });
              void loadDashboard();
            }}
            khoaOptions={header.khoas}
            selectedKhoaId={header.selectedKhoa}
            khoaOptionsLoading={header.loading}
            onKhoaChange={(id) => {
              header.setSelectedKhoa(id);
              syncNkbvUrl({ tab: "dashboard", khoa: id });
            }}
          />
        </Bv103AnalyticsPageFrame>
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
        <div className="mx-4 min-w-0">
          <AdvancedDataTable
            columns={tableColumns as Parameters<typeof AdvancedDataTable>[0]["columns"]}
            data={rows as Parameters<typeof AdvancedDataTable>[0]["data"]}
            loading={tableLoading}
            searchPlaceholder="Tìm mã phiếu, họ tên, khoa…"
            searchValue={searchTerm}
            onSearch={handleSearch}
            onSort={handleColumnSort}
            enableQrScan
            onQrScan={(code) => {
              const resolved = classifyEntityQr(code);
              if (resolved.kind === "NKBV_CASE" && resolved.recordId) {
                void (async () => {
                  const res = await getGiamSatNkbvCaById(resolved.recordId!);
                  if (!res.success || !res.data) {
                    toast.error(res.error || "Không mở được phiếu từ QR");
                    return;
                  }
                  setDraft(res.data as NkbvCaseLike);
                  setEditorOpen(true);
                })();
                return;
              }
              handleSearch(code);
            }}
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
        <div className="mx-4 min-w-0 space-y-3 animate-in fade-in duration-300 md:p-0">
          <KsnkSupervisionPanel className="pt-2">
            <NkbvMdroCensusPanel khoas={header.khoas} />
          </KsnkSupervisionPanel>
          {allowed.create ? (
            <KsnkSupervisionPanel className="pt-2">
              <NkbvBenhAnImportPortal
                khoas={header.khoas}
                onImported={() => {
                  setRecordsPage(1);
                  void fetchRecords();
                }}
              />
            </KsnkSupervisionPanel>
          ) : null}
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={recordsInpatientOnly}
                  onChange={(e) => {
                    setRecordsInpatientOnly(e.target.checked);
                    setRecordsPage(1);
                  }}
                />
                Chỉ đang nằm viện
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={recordsDevicePriority}
                  onChange={(e) => {
                    setRecordsDevicePriority(e.target.checked);
                    setRecordsPage(1);
                  }}
                />
                Trọng điểm xâm lấn (CVC/Foley/Vent)
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                <input
                  type="checkbox"
                  checked={recordsChuaPtOnly}
                  onChange={(e) => {
                    setRecordsChuaPtOnly(e.target.checked);
                    setRecordsPage(1);
                  }}
                />
                Chỉ BA còn XN (+) chưa phân tích
              </label>
              <div className="min-w-[200px] flex-1">
                <span className="mb-1 block text-[11px] font-medium text-slate-500">Khoa điều trị</span>
                <SearchableSelect
                  value={recordsKhoaId}
                  onChange={(v) => {
                    setRecordsKhoaId(String(v || ""));
                    setRecordsPage(1);
                  }}
                  options={[
                    { id: "", label: "Tất cả khoa" },
                    ...header.khoas.map((k) => ({
                      id: k.id,
                      label: formatKhoaPickerLabel({
                        ma_danh_muc: k.ma_danh_muc,
                        ten_danh_muc: k.ten_danh_muc,
                      }),
                    })),
                  ]}
                  placeholder="Lọc khoa…"
                />
              </div>
            </div>
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

      {checklistOpen && checklistCase && (allowed.edit || allowed.create) && (
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
            setHubNonce((n) => n + 1);
          }}
          allowedEdit={allowed.edit}
          onOpenTimeline={
            String(checklistCase.ma_benh_an || "").trim()
              ? () => {
                  const ma = String(checklistCase.ma_benh_an || "").trim();
                  setChecklistOpen(false);
                  setChecklistCase(null);
                  setHubNonce((n) => n + 1);
                  openHubBa(ma);
                }
              : undefined
          }
        />
      )}

      {hubBa ? (
        <NkbvBenhAnHubPanel
          key={`${hubBa}-${hubXn || ""}-${hubNonce}`}
          maBenhAn={hubBa}
          khoas={header.khoas}
          allowedEdit={allowed.edit}
          allowedCreate={allowed.create}
          focusXnId={hubXn}
          onClose={closeHubBa}
          onEditStay={(stay) => setEditStay(stay)}
          onOpenCase={(caseId) => {
            void (async () => {
              const res = await getGiamSatNkbvCaById(caseId);
              if (!res.success || !res.data) {
                toast.error(res.error || "Không mở được phiếu");
                return;
              }
              setChecklistCase(res.data as unknown as NkbvTableRow);
              setChecklistOpen(true);
            })();
          }}
          onCreateCase={(stay) => {
            setDraft({
              ma_benh_an: String(stay.ma_benh_an || ""),
              ma_benh_nhan: String(stay.ma_benh_nhan || ""),
              ho_ten_benh_nhan: String(stay.ho_ten_benh_nhan || ""),
              ngay_sinh: stay.ngay_sinh ? String(stay.ngay_sinh).slice(0, 10) : "",
              gioi_tinh: String(stay.gioi_tinh || ""),
              ngay_vao_vien: stay.ngay_vao_vien ? String(stay.ngay_vao_vien).slice(0, 10) : "",
              khoa_ghi_nhan_id: String(stay.khoa_dieu_tri_id || header.selectedKhoa || ""),
            });
            setEditorOpen(true);
          }}
          onCaseMutated={() => {
            void refresh();
            void fetchRecords();
          }}
          onEnsureAnalysisCase={async ({ stay, milestone, gate, existingCaseId, analysisSeed }) => {
            if (!allowed.create && !allowed.edit) {
              return { success: false, error: "Không có quyền tạo/mở phiếu từ mốc" };
            }
            const res = await ensureNkbvBaAnalysisCase({
              ma_benh_an: String(stay.ma_benh_an || ""),
              ma_benh_nhan: stay.ma_benh_nhan ? String(stay.ma_benh_nhan) : null,
              ho_ten_benh_nhan: stay.ho_ten_benh_nhan ? String(stay.ho_ten_benh_nhan) : null,
              ngay_sinh: stay.ngay_sinh ? String(stay.ngay_sinh).slice(0, 10) : null,
              gioi_tinh: stay.gioi_tinh ? String(stay.gioi_tinh) : null,
              ngay_vao_vien: stay.ngay_vao_vien
                ? String(stay.ngay_vao_vien).slice(0, 10)
                : null,
              khoa_ghi_nhan_id: String(stay.khoa_dieu_tri_id || header.selectedKhoa || "") || null,
              milestone_id: milestone.id,
              milestone_date: milestone.date,
              gate,
              loai_benh_pham: milestone.loai_benh_pham || null,
              tac_nhan: milestone.tac_nhan || null,
              title: milestone.title || null,
              existing_case_id: existingCaseId || null,
              analysisSeed: analysisSeed || null,
            });
            if (!res.success) {
              return { success: false, error: res.error || "Không mở được khung điều tra" };
            }
            if (!res.caseRow) {
              return { success: false, error: "Không mở được khung điều tra" };
            }
            void refresh();
            void fetchRecords();
            return { success: true, caseRow: res.caseRow };
          }}
        />
      ) : null}

      {editStay && allowed.edit ? (
        <NkbvBenhAnEditModal
          stay={{
            ma_benh_an: String(editStay.ma_benh_an || ""),
            ma_benh_nhan: editStay.ma_benh_nhan as string | null,
            ho_ten_benh_nhan: editStay.ho_ten_benh_nhan as string | null,
            ngay_sinh: editStay.ngay_sinh as string | null,
            gioi_tinh: editStay.gioi_tinh as string | null,
            ngay_vao_vien: editStay.ngay_vao_vien as string | null,
            ngay_ra_vien: editStay.ngay_ra_vien as string | null,
            khoa_dieu_tri_id: editStay.khoa_dieu_tri_id as string | null,
            ket_cuc_dieu_tri: editStay.ket_cuc_dieu_tri as string | null,
            ly_do_tu_vong: editStay.ly_do_tu_vong as string | null,
            tu_vong_lien_quan_nkbv: editStay.tu_vong_lien_quan_nkbv as boolean | null,
          }}
          khoas={header.khoas}
          onClose={() => setEditStay(null)}
          onSaved={() => {
            void fetchRecords();
            setHubNonce((n) => n + 1);
          }}
        />
      ) : null}

    </div>
  );
}
