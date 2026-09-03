"use client";

import React from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { KsnkPageHeader } from "@/components/shared/KsnkPageShell";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";

type Props = {
  title: string;
  onBack: () => void;
  onCreate: () => void;
  canCreate?: boolean;
  importExportSlot?: React.ReactNode;
};

export default function GenericDmMasterHeader({
  title,
  onBack,
  onCreate,
  canCreate = true,
  importExportSlot,
}: Props) {
  return (
    <div className="space-y-3">
      <KsnkPageHeader
        showTitle={false}
        title={title}
        actions={
          <>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 touch-manipulation sm:px-3"
              aria-label="Quay lại"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Quay lại</span>
            </button>
            {importExportSlot}
            {canCreate ? (
              <button type="button" onClick={onCreate} className={C.ctaPrimary}>
                <Plus size={16} /> Thêm mới
              </button>
            ) : (
              <p className="max-w-xs text-right text-xs text-slate-500">
                Chỉ xem — cần quyền tạo/sửa danh mục tương ứng.
              </p>
            )}
          </>
        }
      />
    </div>
  );
}
