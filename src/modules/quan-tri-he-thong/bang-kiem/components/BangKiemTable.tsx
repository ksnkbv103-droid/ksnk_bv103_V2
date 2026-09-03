// src/modules/quan-tri-he-thong/bang-kiem/components/BangKiemTable.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { getBangKiems, deleteBangKiem, saveBangKiem, getExportData, toggleIsActive } from "../actions/bang-kiem.actions";
import { importFullBangKiemData } from "../actions/bang-kiem-import.actions";
import { toast } from "sonner";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";
import { ImportExportToolbar } from "@/components/shared/ImportExportToolbar";
import BangKiemForm from "./BangKiemForm";
import { useImportExport } from "@/hooks/useImportExport";
import { useTableActionUi } from "@/hooks/useTableActionUi";
import type { DanhMucBangKiem } from "../bang-kiem.types";
import { summarizeApDungForTable } from "@/lib/domain/bang-kiem-ap-dung";
import {
  labelBangKiemCachTinhDiem,
  labelBangKiemLoaiGiamSat,
} from "../lib/bang-kiem-gsc-fields";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import { quanTriTableChrome as TC, quanTriTableHeaders as TH } from "../../lib/quan-tri-table-chrome";

export type BangKiemTablePermission = Partial<{
  import: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}>;

/** Import phân cấp có tiêu chí: máy chủ yêu cầu thêm import `BANG_KIEM_DETAIL` khi có dòng con trong file. */
export default function BangKiemTable({
  onSelectBK,
  onDataLoaded,
  refreshToken = 0,
  selectedBKId,
  permission,
}: {
  onSelectBK: (bk: DanhMucBangKiem) => void;
  onDataLoaded?: (rows: DanhMucBangKiem[]) => void;
  refreshToken?: number;
  selectedBKId?: string;
  permission?: BangKiemTablePermission;
}) {
  const router = useRouter();
  const allowImport = permission?.import !== false;
  const allowCreate = permission?.create !== false;
  const allowEdit = permission?.edit !== false;
  const allowDelete = permission?.delete !== false;

  const [data, setData] = useState<DanhMucBangKiem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBK, setEditingBK] = useState<DanhMucBangKiem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = async () => {
    setLoading(true);
    const res = await getBangKiems();
    if (res.success) {
      const rows = (res.data || []) as DanhMucBangKiem[];
      setData(rows);
      onDataLoaded?.(rows);
    } else toast.error(res.error || "Không tải được danh mục bảng kiểm");
    setLoading(false);
  };
  useEffect(() => { loadData(); }, [refreshKey, refreshToken]);

  useEffect(() => {
    if (!selectedBKId && data.length > 0) {
      onSelectBK(data[0]);
    }
  }, [data, selectedBKId, onSelectBK]);

  const { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef } = useImportExport({
    moduleKey: "BANG_KIEM", tableName: "gstt_dm_bang_kiem", displayName: "Danh mục Bảng kiểm", uniqueKey: "ma_bk",
    isHierarchical: true, childUniqueKey: "ma_tc", childArrayKey: "tieu_chi_bang_kiem",
    columnMapping: {
      "Mã bảng kiểm": "ma_bk",
      "Tên bảng kiểm": "ten_bang_kiem",
      "Mô tả": "mo_ta",
      "Nhóm chuyên đề": "phan_loai_chuyen_mon",
      "Mã tiêu chí": "ma_tc",
      "Nội dung tiêu chí": "noi_dung",
      "STT": "stt",
      "Ghi chú": "ghi_chu",
      "Đang dùng": "is_active",
    },
    onGetData: getExportData,
    onImport: (val, options) =>
      importFullBangKiemData(val, { softDeleteMissing: options?.softDeleteMissing, dryRun: options?.dryRun }),
    onSuccess: () => { setRefreshKey(k => k + 1); router.refresh(); }
  });
  const actionUi = useTableActionUi<DanhMucBangKiem>({
    onToggleStatus: async (bk) => {
      const res = await toggleIsActive("gstt_dm_bang_kiem", bk.id, bk.is_active ?? true);
      if (res.success) setRefreshKey((k) => k + 1);
      else toast.error(res.error || "Không thể cập nhật trạng thái");
    },
    onEdit: (bk) => {
      setEditingBK(bk);
      setIsFormOpen(true);
    },
    onDelete: async (bk) => {
      if (!window.confirm("Xóa mẫu này?")) return;
      await deleteBangKiem(bk.id);
      setRefreshKey((k) => k + 1);
    },
    capabilities: { edit: allowEdit, delete: allowDelete, toggleActive: allowEdit },
  });

  const columns: Column<DanhMucBangKiem>[] = [
    {
      header: TH.codeAndName,
      accessorKey: "ten_bang_kiem",
      sortable: true,
      cell: (bk) => (
        <div className="py-1">
          <div className={TC.cellCode}>{bk.ma_bk}</div>
          <div className={`${TC.cellTitle} mt-1`}>{bk.ten_bang_kiem}</div>
        </div>
      ),
    },
    {
      header: "Loại / Tính điểm",
      accessorKey: "loai_giam_sat",
      sortable: true,
      cell: (bk) => (
        <div className="py-1">
          <div className={TC.cellTitle}>{labelBangKiemLoaiGiamSat(bk.loai_giam_sat)}</div>
          <div className={`${TC.cellMeta} mt-1`}>{labelBangKiemCachTinhDiem(bk.cach_tinh_diem)}</div>
        </div>
      ),
    },
    {
      header: "Phạm vi",
      accessorKey: "ap_dung_jsonb",
      sortable: false,
      cell: (bk) => {
        const s = summarizeApDungForTable(bk);
        return (
          <div className="py-1 space-y-1">
            <span className={`${C.statusBadge} border-slate-100 bg-slate-100 text-slate-700`}>
              {s.mucDoLabel}
            </span>
            <span className={`block ${TC.cellMeta}`}>{s.phamViLabel}</span>
            <div className={`flex flex-wrap gap-1 ${TC.cellMeta}`}>
              {s.batBuocTgs ? <span className="text-emerald-700">TGS khoa</span> : null}
              {s.batBuocKsnk ? <span className="text-sky-700">KSNK</span> : null}
              {s.tanSuatLabel ? <span className="text-violet-700">{s.tanSuatLabel}</span> : null}
              {s.needsKhoaConfig ? (
                <span className="text-amber-700">Chưa chọn khoa/khối</span>
              ) : null}
            </div>
          </div>
        );
      },
    },
    { header: TH.status, accessorKey: "is_active", sortable: true, cell: (bk) => actionUi.renderStatusCell(bk) },
    { header: TH.manage, accessorKey: "id", cell: (bk) => actionUi.renderManagementCell(bk) },
  ];

  const showForm =
    isFormOpen && ((editingBK != null && allowEdit) || (editingBK == null && allowCreate));

  return (
    <div className="min-h-[400px] space-y-2 animate-in fade-in">
      <div className={C.pageToolbar}>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <ImportExportToolbar
            fileInputRef={fileInputRef}
            isImporting={isImporting}
            onExport={() => void exportTemplate()}
            onImportClick={() => triggerImport()}
            onFileChange={(file) => void handleFileUpload(file)}
            showImport={allowImport}
            exportClassName={TC.ctaExport}
            importClassName={TC.ctaImport}
            actionsClassName={TC.toolbarActions}
          />
        </div>
        {allowCreate ? (
          <button type="button" onClick={() => { setEditingBK(null); setIsFormOpen(true); }} className={TC.ctaPrimary}>
            <Plus size={16} /> Thêm bảng kiểm
          </button>
        ) : null}
      </div>
      <AdvancedDataTable
          columns={columns}
          data={data}
          loading={loading}
          enableMultiSelect={allowDelete}
          onRowClick={(row) => onSelectBK(row)}
          rowClassName={(row) =>
            row.id === selectedBKId ? "bg-[var(--primary)]/8" : ""
          }
          onDeleteSelected={
            allowDelete
              ? (items) => {
                  if (confirm(`Xóa ${items.length} bảng kiểm?`)) {
                    void Promise.all(items.map((i) => deleteBangKiem(i.id))).then(() =>
                      setRefreshKey((k) => k + 1),
                    );
                  }
                }
              : undefined
          }
        />
      {showForm ? (
        <BangKiemForm
          initialData={editingBK ?? undefined}
          onClose={() => setIsFormOpen(false)}
          onSave={async (val) => {
            const res = await saveBangKiem(val as unknown as Record<string, unknown>);
            if (res.success) {
              toast.success("Đã cập nhật cơ sở dữ liệu");
              setIsFormOpen(false);
              setRefreshKey((k) => k + 1);
              router.refresh();
            } else toast.error(res.error);
          }}
        />
      ) : null}
    </div>
  );
}
