"use client";

import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { cn } from "@/lib/utils";

export function DaoTaoMultiCheckList(props: {
  label: string;
  items: Array<{ id: string; label: string; hint?: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
  emptyText: string;
}) {
  return (
    <div>
      <p className={cn(T.labelBlock, "mb-1.5")}>{props.label}</p>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-[var(--radius-control)] border border-slate-200 bg-slate-50/50 p-2.5 text-sm">
        {props.items.map((it) => (
          <label key={it.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white">
            <input
              type="checkbox"
              checked={props.selected.includes(it.id)}
              onChange={(e) => {
                props.onChange(
                  e.target.checked
                    ? [...props.selected, it.id]
                    : props.selected.filter((id) => id !== it.id),
                );
              }}
            />
            <span className="text-slate-700">
              {it.label}{" "}
              {it.hint ? <span className="text-[11px] text-slate-400">({it.hint})</span> : null}
            </span>
          </label>
        ))}
        {props.items.length === 0 ? (
          <p className="px-1 py-2 text-sm text-slate-500">{props.emptyText}</p>
        ) : null}
      </div>
    </div>
  );
}
