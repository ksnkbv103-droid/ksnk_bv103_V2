"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import QuanTriFormDialogShell from "../../components/QuanTriFormDialogShell";

type Props = {
  open: boolean;
  editMode: boolean;
  ma: string;
  ten: string;
  active: boolean;
  onMa: (v: string) => void;
  onTen: (v: string) => void;
  onActive: (v: boolean) => void;
  onClose: () => void;
  onSave: () => void;
  /** Gợi ý mã DM-xxxx từ server (chỉ khi thêm mới). */
  onSuggestMa?: () => void | Promise<void>;
  suggestLoading?: boolean;
};

/** Modal thêm/sửa danh mục generic — Dialog shell chung (header / body scroll / footer CTA). */
export default function GenericDmEditModal({
  open,
  editMode,
  ma,
  ten,
  active,
  onMa,
  onTen,
  onActive,
  onClose,
  onSave,
  onSuggestMa,
  suggestLoading = false,
}: Props) {
  const title = editMode ? "Sửa danh mục" : "Thêm danh mục";

  return (
    <QuanTriFormDialogShell
      open={open}
      onClose={onClose}
      title={title}
      subtitle={editMode ? "Cập nhật mã và tên hiển thị." : "Gợi ý DM-xxxx hoặc nhập mã nghiệp vụ."}
      size="sm"
      footer={
        <>
          <button type="button" className={`${C.ctaSecondary} flex-1 ${C.modalFooterBtn}`} onClick={onClose}>
            Hủy
          </button>
          <button
            type="button"
            className={`${C.ctaPrimary} flex-[2] ${C.modalFooterBtn}`}
            onClick={() => void onSave()}
          >
            Lưu
          </button>
        </>
      }
    >
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="block text-[11px] font-medium text-slate-500">Mã</label>
          {!editMode && onSuggestMa ? (
            <button
              type="button"
              disabled={suggestLoading}
              onClick={() => void onSuggestMa()}
              className={`${C.btnSecondary} h-auto min-h-0 px-2 py-1 text-[11px] text-[var(--primary)]`}
            >
              <Sparkles className="h-3 w-3" />
              {suggestLoading ? "…" : "Gợi ý mã"}
            </button>
          ) : null}
        </div>
        <input
          value={ma}
          onChange={(e) => onMa(e.target.value)}
          readOnly={false}
          placeholder="VD: DM-0006 hoặc mã nghiệp vụ"
          className={C.controlInput}
        />
        {!editMode ? (
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-400">
            Mặc định gợi ý DM-xxxx; có thể sửa tay (ví dụ mã trạng thái workflow).
          </p>
        ) : null}
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-slate-500">Tên hiển thị</label>
        <input value={ten} onChange={(e) => onTen(e.target.value)} className={C.controlInput} />
      </div>
      <MdmFormActiveToggleRow active={active} onChange={onActive} />
    </QuanTriFormDialogShell>
  );
}
