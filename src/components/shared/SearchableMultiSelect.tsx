"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type MultiSelectOption = { id: string; label: string; khoi_id?: string };

type Props = {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  minWidthClassName?: string;
};

export default function SearchableMultiSelect({
  label,
  options,
  selected,
  onChange,
  minWidthClassName = "min-w-[220px]",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [listMaxHeight, setListMaxHeight] = useState(256);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canUseDOM = typeof document !== "undefined";

  const normalizeSearchText = (value: unknown) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim();

  const filtered = useMemo(() => {
    const q = normalizeSearchText(query);
    if (!q) return options;
    const terms = q.split(/\s+/).filter(Boolean);
    return options.filter((opt) => {
      const haystack = normalizeSearchText(`${opt.label} ${opt.id}`);
      return terms.every((term) => haystack.includes(term));
    });
  }, [options, query]);

  const allSelected = selected.length === options.length && options.length > 0;

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportHeight = window.innerHeight;
      const gap = 8;
      const safeMargin = 12;
      const minPanelHeight = 200;
      const panelChromeHeight = 84;
      const spaceBelow = viewportHeight - rect.bottom - safeMargin;
      const spaceAbove = rect.top - safeMargin;
      const openUpward = spaceBelow < minPanelHeight && spaceAbove > spaceBelow;
      const availableSpace = Math.max(120, (openUpward ? spaceAbove : spaceBelow) - gap);
      const nextListHeight = Math.max(120, Math.min(320, availableSpace - panelChromeHeight));

      setListMaxHeight(nextListHeight);
      setDropdownStyle({
        position: "fixed",
        top: openUpward ? Math.max(safeMargin, rect.top - gap - (panelChromeHeight + nextListHeight)) : rect.bottom + gap,
        left: rect.left,
        width: Math.max(rect.width, 320),
        zIndex: 10000,
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    updatePosition();
    try {
      inputRef.current?.focus({ preventScroll: true });
    } catch {
      inputRef.current?.focus();
    }
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-11 ${minWidthClassName} rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold`}
      >
        {label}: {selected.length === 0 ? "0" : selected.length}/{options.length}
      </button>

      {open && canUseDOM
        ? createPortal(
        <div ref={panelRef} style={dropdownStyle} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Tìm ${label.toLowerCase()}...`}
            className="mb-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
          />

          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => onChange(allSelected ? [] : options.map((opt) => opt.id))}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold"
            >
              {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold"
            >
              Đóng
            </button>
          </div>

          <div className="space-y-1 overflow-auto pr-1" style={{ maxHeight: `${listMaxHeight}px` }}>
            {filtered.map((opt) => {
              const checked = selected.includes(opt.id);
              return (
                <label key={opt.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      onChange(e.target.checked ? [...selected, opt.id] : selected.filter((x) => x !== opt.id))
                    }
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
