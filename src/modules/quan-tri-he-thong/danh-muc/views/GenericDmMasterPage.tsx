"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DM_HUB_LABELS } from "@/lib/master-data/domain-registry";
import { resolveDanhMucViewModuleByType } from "@/lib/master-data/danh-muc-permission-map";
import { useImportExport } from "@/hooks/useImportExport";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { ImportExportToolbar } from "@/components/shared/ImportExportToolbar";
import GenericDmEditModal from "./GenericDmEditModal";
import GenericDmHubRedirectBanner from "./GenericDmHubRedirectBanner";
import GenericDmMasterDataTable from "./GenericDmMasterDataTable";
import GenericDmMasterHeader from "./GenericDmMasterHeader";
import { useGenericDmMasterPageModel } from "../hooks/useGenericDmMasterPageModel";
import { useModulePermission } from "@/hooks/useModulePermission";
import {
  exportGenericDmExcelAction,
  importGenericDmExcelAction,
} from "../actions/generic-dm-import.actions";
import { isLockedSystemLookup } from "@/lib/master-data/locked-system-lookups";

export default function GenericDmMasterPage({ loaiDanhMuc }: { loaiDanhMuc: string }) {
  const router = useRouter();
  const permissionModule = resolveDanhMucViewModuleByType(loaiDanhMuc);
  const { loading: permLoading, allowed } = useModulePermission(permissionModule);
  const locked = isLockedSystemLookup(loaiDanhMuc);
  const canMutate = !locked && (allowed.create || allowed.edit);
  const canDelete = !locked && allowed.delete;
  const canImport = !locked && (allowed.import || allowed.edit);
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
      <div className="p-10 text-center text-red-600 font-bold">
        Loại danh mục không hợp lệ: {loaiDanhMuc}
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
          Đây là danh mục hệ thống (mã máy). Chỉ xem — không thêm, sửa, xóa hay nạp Excel.
        </p>
      ) : null}
      <GenericDmMasterHeader
        title={title}
        onBack={() => router.push("/quan-tri-he-thong")}
        onCreate={() => void m.openCreate()}
        canCreate={canMutate}
        importExportSlot={
          locked ? undefined : (
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
