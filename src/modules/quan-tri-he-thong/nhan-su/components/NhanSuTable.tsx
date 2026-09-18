// src/modules/quan-tri-he-thong/nhan-su/components/NhanSuTable.tsx
"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getNhanSus, getNhanSuExportData, getNhanSuFormOptionsAction } from "../actions/nhan-su-read.actions";
import type { NhanSu } from "../types";
import NhanSuForm from "./NhanSuForm";
import { useMasterDataCrud } from "@/hooks/useMasterDataCrud";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";
import { Plus, KeyRound, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { provisionStaffAuthAccount } from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/tai-khoan-nhan-su.actions";
import {
  approveAccountAccessRequest,
  listPendingAccountRequests,
  rejectAccountAccessRequest,
} from "../actions/account-access-request.actions";
import { isPendingAccountRequest, readAccountRequest } from "../lib/account-access-request";
import StaffAuthPasswordDialog from "./StaffAuthPasswordDialog";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { quanTriTableChrome as TC, quanTriTableHeaders as TH } from "../../lib/quan-tri-table-chrome";
import { ImportExportToolbar } from "@/components/shared/ImportExportToolbar";
import { useImportExport } from "@/hooks/useImportExport";
import { smartImportData } from "../../danh-muc/actions/smart-import.actions";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

const NHAN_SU_PAGE_SIZE = 20;

/** Không truyền = full quyền (legacy). Trường `false` tước quyền tương ứng. */
export type NhanSuTablePermission = Partial<{
  import: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}>;

type NhanSuTableProps = { refreshKey?: number; permission?: NhanSuTablePermission };

export default function NhanSuTable({ refreshKey: externalRefresh, permission }: NhanSuTableProps) {
  const [data, setData] = useState<NhanSu[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, _setSearch] = useState("");
  const [khoaFilter, _setKhoaFilter] = useState("Tất cả");
  const [toFilter, _setToFilter] = useState("Tất cả");
  const [chucVuFilter, _setChucVuFilter] = useState("Tất cả");
  const [chucDanhFilter, _setChucDanhFilter] = useState("Tất cả");
  const [vaiTroFilter, _setVaiTroFilter] = useState("Tất cả");
  const [ngheNghiepFilter, _setNgheNghiepFilter] = useState("Tất cả");
  const [_khoas, setKhoas] = useState<Array<{ id: string; ten_danh_muc: string }>>([]);
  const [_tos, setTos] = useState<Array<{ id: string; ten_danh_muc: string }>>([]);
  const [_chucVus, setChucVus] = useState<Array<{ id: string; ten_danh_muc: string }>>([]);
  const [_chucDanhs, setChucDanhs] = useState<Array<{ id: string; ten_danh_muc: string }>>([]);
  const [_vaiTros, setVaiTros] = useState<Array<{ id: string; ten_danh_muc: string }>>([]);
  const [_ngheNghieps, setNgheNghieps] = useState<Array<{ id: string; ten_danh_muc: string }>>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NhanSu | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [authDialog, setAuthDialog] = useState<{
    mode: "approve_request" | "approve_reset";
    staff: NhanSu;
  } | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("pending") === "1") {
        setPendingOnly(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const filterKey = useMemo(
    () =>
      [
        search,
        khoaFilter,
        toFilter,
        chucVuFilter,
        chucDanhFilter,
        vaiTroFilter,
        ngheNghiepFilter,
        pendingOnly ? "1" : "0",
      ].join("\0"),
    [search, khoaFilter, toFilter, chucVuFilter, chucDanhFilter, vaiTroFilter, ngheNghiepFilter, pendingOnly],
  );

  const [syncedFilterKey, setSyncedFilterKey] = useState(filterKey);
  if (filterKey !== syncedFilterKey) {
    setSyncedFilterKey(filterKey);
    setPage(1);
  }

  const allowImport = permission?.import !== false;
  const allowCreate = permission?.create !== false;
  const allowEdit = permission?.edit !== false;
  const allowDelete = permission?.delete !== false;

  const { isAdmin, canEdit } = usePermission();
  const canProvisionTk = isAdmin || canEdit("PHAN_QUYEN");
  const [provisioningId, setProvisioningId] = useState<string | null>(null);

  const handleCreateTk = async (row: NhanSu) => {
    if (!row.email?.trim()) {
      toast.error("Nhân sự chưa có email — cập nhật hồ sơ trước khi tạo TK.");
      return;
    }
    const pw = window.prompt(`Mật khẩu ban đầu cho ${row.ho_ten} (≥8 ký tự):`);
    if (pw == null) return;
    if (pw.length < 8) {
      toast.error("Mật khẩu tối thiểu 8 ký tự.");
      return;
    }
    setProvisioningId(row.id);
    try {
      const res = await provisionStaffAuthAccount({ staffId: row.id, password: pw });
      if (!res.success) {
        toast.error(res.error || "Không tạo được tài khoản.");
        return;
      }
      toast.success("Đã tạo tài khoản và liên kết hồ sơ.");
      setRefreshKey((k) => k + 1);
    } finally {
      setProvisioningId(null);
    }
  };

  const openEditPrefill = (row: NhanSu) => {
    setEditingItem(row);
    setIsFormOpen(true);
  };

  const handleApproveSubmit = async (payload: {
    password: string;
    confirmActorPassword?: string;
  }) => {
    if (!authDialog) return;
    const staffId = authDialog.staff.id;
    const kind = readAccountRequest(authDialog.staff.extra_data)?.kind || "REQUEST";
    setAuthSubmitting(true);
    try {
      if (kind === "RESET" || authDialog.mode === "approve_reset") {
        toast.error("Dùng đặt lại MK trên hồ sơ cho yêu cầu RESET.");
        return;
      }
      const actorPw = String(payload.confirmActorPassword || "").trim();
      if (!actorPw) {
        toast.error("Nhập mật khẩu đăng nhập hiện tại của bạn để xác nhận.");
        return;
      }
      const res = await approveAccountAccessRequest({
        staffId,
        password: payload.password,
        confirmActorPassword: actorPw,
      });
      if (!res.success) {
        toast.error(res.error || "Duyệt thất bại.");
        return;
      }
      toast.success("Đã duyệt và tạo tài khoản.");
      setAuthDialog(null);
      setRefreshKey((k) => k + 1);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRejectPending = async (row: NhanSu) => {
    const reason = window.prompt(`Lý do từ chối phiếu của ${row.ho_ten}:`);
    if (reason == null) return;
    const res = await rejectAccountAccessRequest({ staffId: row.id, reason });
    if (!res.success) {
      toast.error(res.error || "Từ chối thất bại.");
      return;
    }
    toast.success("Đã từ chối phiếu.");
    setRefreshKey((k) => k + 1);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (pendingOnly) {
        const res = await listPendingAccountRequests({ page, pageSize: NHAN_SU_PAGE_SIZE });
        if (res.success) {
          const rows = (res.rows || []) as NhanSu[];
          const q = search.trim().toLowerCase();
          const filtered = q
            ? rows.filter((r) => {
                const blob = `${r.ma_nv || ""} ${r.ho_ten || ""} ${r.email || ""}`.toLowerCase();
                return blob.includes(q);
              })
            : rows;
          setData(filtered);
          setTotalCount(q ? filtered.length : res.total ?? filtered.length);
        } else {
          toast.error(res.error || "Không tải được phiếu chờ duyệt.");
          setData([]);
          setTotalCount(0);
        }
        return;
      }
      const res = await getNhanSus({
        search,
        khoaId: khoaFilter,
        toId: toFilter,
        chucVuId: chucVuFilter,
        chucDanhId: chucDanhFilter,
        vaiTroId: vaiTroFilter,
        ngheNghiepId: ngheNghiepFilter,
        page,
        pageSize: NHAN_SU_PAGE_SIZE,
      });
      if (res.success) {
        setData(res.data || []);
        setTotalCount(res.totalCount ?? res.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [
    search,
    khoaFilter,
    toFilter,
    chucVuFilter,
    chucDanhFilter,
    vaiTroFilter,
    ngheNghiepFilter,
    page,
    pendingOnly,
  ]);

  useEffect(() => {
    const loadFilters = async () => {
      const res = await getNhanSuFormOptionsAction();
      if (!res.success) return;
      setKhoas(res.data.khoas || []);
      setTos(res.data.tos || []);
      setChucVus(res.data.chucVus || []);
      setChucDanhs(res.data.chucDanhs || []);
      setVaiTros(res.data.vaiTros || []);
      setNgheNghieps(res.data.ngheNghieps || []);
    };
    void loadFilters();
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadData();
    });
  }, [loadData, refreshKey, externalRefresh]);
  const crud = useMasterDataCrud<NhanSu>({
    tableName: "mdm_nhan_su",
    codeField: "ma_nv",
    mainField: "ho_ten",
    entityLabel: "nhân sự",
    onSuccess: () => setRefreshKey((k) => k + 1),
  });
  const actionUi = useTableActionUi<NhanSu>({
    onToggleStatus: crud.toggleStatus,
    onEdit: (item) => {
      setEditingItem(item);
      setIsFormOpen(true);
    },
    onDelete: crud.softDelete,
    capabilities: { edit: allowEdit, delete: allowDelete, toggleActive: allowEdit },
  });

  const { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef } = useImportExport({
    moduleKey: "NHAN_SU",
    tableName: "mdm_nhan_su",
    displayName: "Nhân sự",
    uniqueKey: "ma_nv",
    columnMapping: {
      "Mã nhân viên": "ma_nv",
      "Họ tên nhân sự": "ho_ten",
      "Email đăng nhập": "email",
      "Số điện thoại": "so_dien_thoai",
      "Giới tính": "gioi_tinh",
      "Ngày sinh": "ngay_sinh",
      "Mã khoa phòng": "ma_khoa",
      "Mã tổ công tác": "ma_to",
      "Tên chức vụ": "ten_chuc_vu",
      "Tên chức danh": "ten_chuc_danh",
      is_active: "is_active",
    },
    onGetData: () => getNhanSuExportData(),
    onImport: (d, options) =>
      smartImportData({ tableName: "mdm_nhan_su", uniqueKey: "ma_nv" }, d, {
        softDeleteMissing: options?.softDeleteMissing, dryRun: options?.dryRun,
      }),
    onSuccess: () => setRefreshKey((k) => k + 1),
  });

  const columns: Column<NhanSu>[] = [
    { 
      header: "Nhân viên",
      accessorKey: "ho_ten", 
      sortable: true, 
      cell: (i) => (
        <div className="flex items-center gap-3 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--primary)]/5 bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
            {i.ho_ten?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className={TC.cellTitle}>{i.ho_ten}</div>
            <div className={`${TC.cellCode} mt-0.5 w-fit rounded-sm bg-[var(--primary)]/5 px-1.5`}>{i.ma_nv}</div>
          </div>
        </div>
      )
    },
    { 
      header: "Phân bổ",
      accessorKey: "khoa", 
      sortable: true, 
      cell: (i) => (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-600">
            {i.khoa
              ? formatKhoaCompactLabel({ ma_khoa: i.khoa.ma_khoa, ten_khoa: i.khoa.ten_khoa })
              : "---"}
          </span>
          {i.to?.ten_danh_muc && (
            <span className="bv103-type-note text-amber-600">
              ↳ {i.to.ten_danh_muc}
            </span>
          )}
        </div>
      ) 
    },
    { 
      header: "Chức vụ & danh",
      accessorKey: "chuc_danh", 
      sortable: true, 
      cell: (i) => (
        <div className="flex flex-col gap-0.5">
          <span className="w-fit rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
            {i.chuc_danh || "Chưa gán"}
          </span>
          {i.chuc_vu && (
            <span className="ml-0.5 bv103-type-note">
              {i.chuc_vu}
            </span>
          )}
        </div>
      ) 
    },
    {
      header: "Tài khoản",
      accessorKey: "auth_user_id",
      sortable: false,
      cell: (i) => (
        <div className="flex flex-col gap-1">
          <span className={`w-fit rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            i.auth_user_id
              ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
              : "bg-slate-100 text-slate-500"
          }`}>
            {i.auth_user_id ? "Đã có TK" : "Chưa TK"}
          </span>
          <span className="text-[11px] font-medium text-slate-600">
            {i.vai_tro_he_thong_ksnk || "— vai trò —"}
          </span>
          {isPendingAccountRequest(i.extra_data) ? (
            <div className="mt-0.5 flex flex-col gap-1">
              <span className="w-fit rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                Chờ duyệt
              </span>
              {allowEdit ? (
                <button
                  type="button"
                  onClick={() => openEditPrefill(i)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Sửa hồ sơ
                </button>
              ) : null}
              {canProvisionTk ? (
                <>
                  {(readAccountRequest(i.extra_data)?.kind || "REQUEST") === "REQUEST" ? (
                    <button
                      type="button"
                      onClick={() => setAuthDialog({ mode: "approve_request", staff: i })}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100"
                    >
                      <KeyRound size={12} aria-hidden />
                      Duyệt cấp TK
                    </button>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500">
                      RESET — dùng Đặt lại MK trên hồ sơ Tài khoản
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleRejectPending(i)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Từ chối
                  </button>
                </>
              ) : null}
            </div>
          ) : canProvisionTk && !i.auth_user_id ? (
            <button
              type="button"
              disabled={i.is_active === false || provisioningId === i.id}
              onClick={() => void handleCreateTk(i)}
              className="mt-0.5 inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <KeyRound size={12} aria-hidden />
              {provisioningId === i.id ? "Đang tạo…" : "Tạo TK"}
            </button>
          ) : null}
        </div>
      ),
    },
    { header: TH.status, accessorKey: "is_active", sortable: true, cell: (i) => actionUi.renderStatusCell(i) },
    { header: TH.manage, accessorKey: "id", cell: (i) => actionUi.renderManagementCell(i) },
  ];

  const showForm =
    isFormOpen && ((editingItem != null && allowEdit) || (editingItem == null && allowCreate));

  return (
    <div className="space-y-[var(--bv103-space-3)] animate-in fade-in duration-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setPendingOnly((v) => !v);
            setPage(1);
          }}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${
            pendingOnly
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <ClipboardList size={14} aria-hidden />
          {pendingOnly ? "Đang lọc: Chỉ chờ duyệt" : "Chỉ chờ duyệt"}
        </button>
        {(allowImport || allowCreate) ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {allowImport ? (
              <ImportExportToolbar
                fileInputRef={fileInputRef}
                isImporting={isImporting}
                onExport={() => void exportTemplate()}
                onImportClick={triggerImport}
                onFileChange={(file) => void handleFileUpload(file)}
                exportClassName={bv103DesignTokens.btnSecondary}
                importClassName={bv103DesignTokens.btnSecondary}
              />
            ) : null}
            {allowCreate ? (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsFormOpen(true);
                }}
                className={bv103DesignTokens.btnPrimary}
              >
                <Plus size={16} aria-hidden /> Thêm người
              </button>
            ) : null}
          </div>
        ) : <span />}
      </div>

      <div className="min-h-[500px] min-w-0">
        <AdvancedDataTable
          columns={columns}
          data={data}
          loading={loading}
          searchPlaceholder="Tìm mã NV, họ tên, email…"
          searchValue={search}
          onSearch={_setSearch}
          enableMultiSelect={allowDelete}
          onDeleteSelected={allowDelete ? crud.softDeleteMany : undefined}
          serverPagination={{
            page,
            totalPages: Math.max(1, Math.ceil(totalCount / NHAN_SU_PAGE_SIZE)),
            totalCount,
            pageSize: NHAN_SU_PAGE_SIZE,
            onPageChange: setPage,
          }}
        />
      </div>
      {showForm ? (
        <NhanSuForm
          initialData={editingItem}
          onSuccess={() => { setIsFormOpen(false); setRefreshKey((k) => k + 1); }}
          onCancel={() => setIsFormOpen(false)}
        />
      ) : null}
      {authDialog ? (
        <StaffAuthPasswordDialog
          open
          onOpenChange={(open) => {
            if (!open) setAuthDialog(null);
          }}
          mode={authDialog.mode}
          staffName={authDialog.staff.ho_ten || authDialog.staff.ma_nv || "nhân sự"}
          submitting={authSubmitting}
          requireReauth
          onSubmit={(payload) => void handleApproveSubmit(payload)}
        />
      ) : null}
    </div>
  );
}
