"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DM_HUB_LABELS } from "@/lib/master-data/domain-registry";
import { resolveDanhMucViewModuleByType } from "@/lib/master-data/danh-muc-permission-map";
import { useImportExport } from "@/hooks/useImportExport";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { ImportExportToolbar } from "@/components/shared/ImportExportToolbar";
import GenericDmEditModal from "@/components/master-data/generic-dm/GenericDmEditModal";
import GenericDmHubRedirectBanner from "@/components/master-data/generic-dm/GenericDmHubRedirectBanner";
import GenericDmMasterDataTable from "@/components/master-data/generic-dm/GenericDmMasterDataTable";
import GenericDmMasterHeader from "@/components/master-data/generic-dm/GenericDmMasterHeader";
import { useGenericDmMasterPageModel } from "@/components/master-data/generic-dm/useGenericDmMasterPageModel";
import { usePermission } from "@/hooks/usePermission";
import {
  exportGenericDmExcelAction,
  importGenericDmExcelAction,
} from "@/lib/master-data/engine/generic-dm-import.actions";
import { isLockedSystemLookup } from "@/lib/master-data/locked-system-lookups";
import { LOOKUP_ADMIN_ONLY_WRITE_OWNERS } from "@/lib/master-data/master-table-permission-map";

export default function GenericDmMasterPage({
  loaiDanhMuc,
  backHref = "/quan-tri-he-thong",
}: {
  loaiDanhMuc: string;
  /** Trang quay về — module sở hữu danh mục (AR-8e: Tổ chức → `/to-chuc`). */
  backHref?: string;
}) {
  const router = useRouter();
  const permissionModule = resolveDanhMucViewModuleByType(loaiDanhMuc);
  const { loading: permLoading, isAdmin, canView, canCreate, canEdit, canDelete: canDeletePerm, canImport: canImportPerm } =
    usePermission();
  const locked = isLockedSystemLookup(loaiDanhMuc);
  const canViewPage = isAdmin || canView(permissionModule);
  /* AR-8h: lookup trong module nghiệp vụ (GSC/CSSD/NKBV) — ghi chỉ ADMIN dù có quyền ghi module. */
  const adminOnlyWrite = LOOKUP_ADMIN_ONLY_WRITE_OWNERS.has(permissionModule);
  const canMutate = !locked && (adminOnlyWrite ? isAdmin : canCreate(permissionModule) || canEdit(permissionModule));
  const canDelete = !locked && (adminOnlyWrite ? isAdmin : canDeletePerm(permissionModule));
  const canImport = !locked && (adminOnlyWrite ? isAdmin : canImportPerm(permissionModule) || canEdit(permissionModule));
  const m = useGenericDmMasterPageModel(loaiDanhMuc, canMutate, canDelete);
  const title = DM_HUB_LABELS[m.key] || loaiDanhMuc;
  const maCol = m.reg?.maColumn ?? "ma";
  const tenCol = m.reg?.tenColumn ?? "ten";
  const [listSearch, setListSearch] = useState("");
  const filteredRows = useMemo(() => {
    const t = listSearch.trim().toLowerCase();
    if (!t) return m.rows;
    return m.rows.filter(
      (r) =>
        String(r[maCol] ?? "").toLowerCase().includes(t) ||
        String(r[tenCol] ?? "").toLowerCase().includes(t),
    );
  }, [listSearch, m.rows, maCol, tenCol]);

  const { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef } = useImportExport({
    moduleKey: permissionModule,
    tableName: m.reg?.sourceTable || "sys_lookup_value",
    displayName: title,
    uniqueKey: maCol,
    columnMapping: {
      Mã: maCol,
      Tên: tenCol,
      is_active: "is_active",
    },
    onGetData: () => exportGenericDmExcelAction(loaiDanhMuc),
    onImport: (d, options) =>
      importGenericDmExcelAction(loaiDanhMuc, d, {
        softDeleteMissing: options?.softDeleteMissing,
        dryRun: options?.dryRun,
      }),
    onSuccess: () => void m.load(),
  });

  if (!m.reg) {
    return (
      <div className="rounded-[var(--radius-shell)] border border-slate-200 bg-white px-6 py-10 text-center">
        <p className="text-sm font-medium text-slate-700">Không mở được danh mục này.</p>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="mt-3 text-xs font-semibold text-[var(--primary)] hover:underline"
        >
          Về trung tâm quản trị
        </button>
      </div>
    );
  }

  if (!permLoading && !canViewPage) {
    return (
      <div className="rounded-[var(--radius-shell)] border border-slate-200 bg-white px-6 py-10 text-center">
        <p className="text-sm font-medium text-slate-700">Không có quyền xem danh mục này.</p>
      </div>
    );
  }

  if (permLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="bv103-stack-page pb-16 animate-in fade-in duration-500">
      <GenericDmHubRedirectBanner registryKey={m.key} />
      {locked ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
          {loaiDanhMuc === "LOAI_NKBV"
            ? "Loại ca nhiễm khuẩn bệnh viện là danh mục hệ thống. Chỉ xem — không thêm, sửa, xóa hay nạp Excel."
            : "Đây là danh mục hệ thống (mã máy). Chỉ xem — không thêm, sửa, xóa hay nạp Excel."}
        </p>
      ) : null}
      <GenericDmMasterHeader
        title={title}
        onBack={() => router.push(backHref)}
        onCreate={() => void m.openCreate()}
        canCreate={canMutate}
        importExportSlot={
          locked ? undefined : (
            <details className="rounded-[var(--radius-control)] border border-slate-200 bg-white px-2 py-1">
              <summary className="cursor-pointer text-xs font-semibold text-slate-500">Excel</summary>
              <div className="pt-2">
                <ImportExportToolbar
                  fileInputRef={fileInputRef}
                  isImporting={isImporting}
                  onExport={() => void exportTemplate()}
                  onImportClick={triggerImport}
                  onFileChange={(file) => void handleFileUpload(file)}
                  showImport={canImport}
                  exportClassName={T.btnSecondary}
                  importClassName={T.btnSecondary}
                />
              </div>
            </details>
          )
        }
      />
      <GenericDmMasterDataTable
        columns={m.columns}
        rows={filteredRows}
        loading={m.loading}
        listSearch={listSearch}
        onListSearchChange={setListSearch}
        canDelete={canDelete}
        registryKey={m.key}
        onReload={() => void m.load()}
        onRowClick={(row) => {
          if (canMutate) m.openEdit(row);
        }}
      />
      <GenericDmEditModal
        open={m.modalOpen}
        editMode={Boolean(m.editRow)}
        ma={m.ma}
        ten={m.ten}
        active={m.active}
        onMa={m.setMa}
        onTen={m.setTen}
        onActive={m.setActive}
        onClose={() => m.setModalOpen(false)}
        onSave={() => void m.save()}
        onSuggestMa={
          !m.editRow && canMutate
            ? async () => {
                const x = await m.fillSuggestedMa(m.ten);
                if (x) m.setMa(x);
              }
            : undefined
        }
        suggestLoading={m.suggestLoading}
      />
    </div>
  );
}
