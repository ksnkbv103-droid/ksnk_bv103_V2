"use client";

import React from "react";
import { ArrowLeft, Layers, Plus } from "lucide-react";
import { KsnkPageHeader } from "@/components/shared/KsnkPageShell";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";

type Props = {
  title: string;
  onBack: () => void;
  onCreate: () => void;
  canCreate?: boolean;
};

export default function GenericDmMasterHeader({ title, onBack, onCreate, canCreate = true }: Props) {
  return (
    <div className="space-y-4">
      <KsnkPageHeader
        title={
          <span className="inline-flex items-center gap-2.5">
            <Layers className="h-6 w-6 shrink-0 text-[var(--primary)]" aria-hidden /> {title}
          </span>
        }
        actions={
          <>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 touch-manipulation"
              aria-label="Quay lại"
            >
              <ArrowLeft size={16} /> Quay lại
            </button>
            {canCreate ? (
              <button type="button" onClick={onCreate} className={bv103DesignTokens.btnPrimary}>
                <Plus size={16} /> Thêm mới
              </button>
            ) : (
              <p className="max-w-xs text-right text-xs text-slate-500">
                Chỉ xem — cần quyền tạo/sửa danh mục (DANH_MUC).
              </p>
            )}
          </>
        }
      />
    </div>
  );
}
