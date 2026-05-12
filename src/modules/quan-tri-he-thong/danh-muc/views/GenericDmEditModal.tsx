"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";

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

/** Modal thêm/sửa danh mục generic — đồng bộ token KSNK với shell chung. */
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex touch-manipulation items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-md space-y-4 rounded-[28px] border border-slate-100 bg-white p-6 shadow-2xl">
        <h2 className="text-sm font-black uppercase tracking-tight text-slate-800">
          {editMode ? "Sửa" : "Thêm"} danh mục
        </h2>
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-[10px] font-black uppercase text-slate-500">Mã</label>
            {!editMode && onSuggestMa ? (
              <button
                type="button"
                disabled={suggestLoading}
                onClick={() => void onSuggestMa()}
                className="inline-flex items-center gap-1 rounded-lg border border-[#026f17]/20 bg-[#026f17]/5 px-2 py-1 text-[9px] font-black uppercase text-[#026f17] touch-manipulation disabled:opacity-50"
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
            className="w-full rounded-xl border-2 border-slate-100 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#026f17]"
          />
          {!editMode ? (
            <p className="mt-1 text-[9px] font-bold uppercase leading-relaxed text-slate-400">
              Mặc định gợi ý DM-xxxx theo mã đang có; có thể sửa tay (ví dụ mã trạng thái workflow).
            </p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase text-slate-500">Tên hiển thị</label>
          <input
            value={ten}
            onChange={(e) => onTen(e.target.value)}
            className="w-full rounded-xl border-2 border-slate-100 px-3 py-2.5 text-sm outline-none focus:border-[#026f17]"
          />
        </div>
        <MdmFormActiveToggleRow active={active} onChange={onActive} />
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="touch-manipulation rounded-xl bg-slate-100 px-4 py-2 text-xs font-black uppercase text-slate-700"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="touch-manipulation rounded-xl bg-[#026f17] px-4 py-2 text-xs font-black uppercase text-[#FFD700]"
            onClick={() => void onSave()}
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
