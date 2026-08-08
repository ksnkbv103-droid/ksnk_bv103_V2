"use client";

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  newChecklistItem,
  type QlcvChecklistItem,
} from "@/lib/domain/qlcv-checklist";

type Props = {
  items: QlcvChecklistItem[];
  onChange: (next: QlcvChecklistItem[]) => void;
};

/** Checklist mẫu định kỳ — thêm/xóa dòng (không tick done; done chỉ trên phiếu sinh ra). */
export function DinhKyChecklistEditor({ items, onChange }: Props) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const label = draft.trim();
    if (!label) return;
    onChange([...items, newChecklistItem(label)]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-[11px] text-slate-400" aria-hidden>
              ✓
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">{item.label}</span>
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label={`Xóa ${item.label}`}
              onClick={() => onChange(items.filter((i) => i.id !== item.id))}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-500">Chưa có mục — thêm từng việc sẽ tick khi sinh phiếu.</p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/15"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Ví dụ: Kiểm tủ thuốc"
        />
        <button
          type="button"
          onClick={add}
          className="bv103-control-h inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Thêm mục
        </button>
      </div>
    </div>
  );
}
