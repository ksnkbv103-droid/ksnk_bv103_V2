"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  newChecklistItem,
  normalizeQlcvChecklist,
  percentFromQlcvChecklist,
  type QlcvChecklistItem,
} from "@/lib/domain/qlcv-checklist";
import { updateQlcvChecklist } from "../actions/cong-viec-checklist.actions";

type Props = {
  congViecId: string;
  initialChecklist: unknown;
  readOnly?: boolean;
  onUpdated?: () => void;
};

export function QlcvChecklistPanel({ congViecId, initialChecklist, readOnly, onUpdated }: Props) {
  const [items, setItems] = useState<QlcvChecklistItem[]>(() => normalizeQlcvChecklist(initialChecklist));
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(normalizeQlcvChecklist(initialChecklist));
  }, [congViecId, initialChecklist]);

  const pct = percentFromQlcvChecklist(items);

  const persist = async (next: QlcvChecklistItem[]) => {
    setSaving(true);
    try {
      await updateQlcvChecklist(congViecId, next);
      setItems(next);
      onUpdated?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không lưu được checklist.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (id: string) => {
    if (readOnly) return;
    const next = items.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    void persist(next);
  };

  const addItem = () => {
    const label = newLabel.trim();
    if (!label) return;
    const next = [...items, newChecklistItem(label)];
    setNewLabel("");
    void persist(next);
  };

  const removeItem = (id: string) => {
    const next = items.filter((i) => i.id !== id);
    void persist(next);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.02] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-800">Checklist thực hiện</h3>
        <span className="text-sm font-semibold tabular-nums text-[var(--primary)]">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
          >
            <input
              type="checkbox"
              checked={item.done}
              disabled={readOnly || saving}
              onChange={() => toggle(item.id)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]/30"
              aria-label={item.label}
            />
            <span
              className={`min-w-0 flex-1 text-sm ${item.done ? "text-slate-500 line-through" : "font-medium text-slate-800"}`}
            >
              {item.label}
            </span>
            {!readOnly ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => removeItem(item.id)}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Xóa mục"
              >
                <Trash2 size={14} />
              </button>
            ) : null}
          </li>
        ))}
        {items.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-500">
            Chưa có mục — thêm bước việc (ví dụ: kiểm tra van, ghi sổ…)
          </li>
        ) : null}
      </ul>

      {!readOnly ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
            placeholder="Thêm mục checklist…"
            className="bv103-control-h flex-1 rounded-xl border border-slate-200/90 bg-white px-3 text-sm"
            disabled={saving}
          />
          <Button type="button" variant="outline" className="shrink-0 rounded-xl" onClick={addItem} disabled={saving}>
            <Plus size={16} className="mr-1" aria-hidden /> Thêm
          </Button>
        </div>
      ) : null}
    </div>
  );
}
