"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMobilePickerSheet } from "@/hooks/use-mobile-picker-sheet";

/** Vùng danh sách desktop: cao cố định mục tiêu, cuộn nội bộ. */
const DESKTOP_PICKER_LIST_IDEAL_PX = 240;
const DESKTOP_PICKER_LIST_FLOOR_PX = 140;

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
  const [listMaxHeight, setListMaxHeight] = useState(DESKTOP_PICKER_LIST_IDEAL_PX);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canUseDOM = typeof document !== "undefined";
  const isMobileSheet = useMobilePickerSheet();

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
    if (!open || !isMobileSheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobileSheet]);

  useEffect(() => {
    if (!open || isMobileSheet) return;

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
      const availableSpace = Math.max(DESKTOP_PICKER_LIST_FLOOR_PX, (openUpward ? spaceAbove : spaceBelow) - gap);
      const maxAllowedList = Math.max(DESKTOP_PICKER_LIST_FLOOR_PX, availableSpace - panelChromeHeight);
      const nextListHeight = Math.min(DESKTOP_PICKER_LIST_IDEAL_PX, maxAllowedList);

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
  }, [open, isMobileSheet]);

  useEffect(() => {
    if (!open || !isMobileSheet) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const t = window.setTimeout(() => {
      try {
        inputRef.current?.focus({ preventScroll: true });
      } catch {
        inputRef.current?.focus();
      }
    }, 0);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(t);
    };
  }, [open, isMobileSheet]);

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
            isMobileSheet ? (
              <div
                className="fixed inset-0 z-[10060] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
                role="presentation"
              >
                <button
                  type="button"
                  aria-label="Đóng"
                  className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
                  onClick={() => setOpen(false)}
                />
                <div
                  ref={panelRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="searchable-multi-sheet-title"
                  className="relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/80"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5">
                    <span
                      id="searchable-multi-sheet-title"
                      className="min-w-0 truncate text-sm font-black uppercase tracking-tight text-slate-800"
                    >
                      {label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-700 active:bg-slate-100"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="shrink-0 border-b border-slate-100 p-3">
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Tìm ${label.toLowerCase()}...`}
                      className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-base outline-none focus:border-[#026f17]"
                      autoComplete="off"
                      enterKeyHint="search"
                    />
                  </div>
                  <div className="flex shrink-0 gap-2 border-b border-slate-100 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onChange(allSelected ? [] : options.map((opt) => opt.id))}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-bold text-slate-800 active:bg-slate-100"
                    >
                      {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    </button>
                  </div>
                  <div className="custom-scrollbar min-h-0 max-h-[min(52dvh,440px)] flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 py-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    {filtered.map((opt) => {
                      const checked = selected.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-3.5 hover:bg-slate-50 active:bg-slate-100"
                        >
                          <input
                            type="checkbox"
                            className="h-5 w-5 shrink-0 accent-[#026f17]"
                            checked={checked}
                            onChange={(e) =>
                              onChange(e.target.checked ? [...selected, opt.id] : selected.filter((x) => x !== opt.id))
                            }
                          />
                          <span className="min-w-0 flex-1 text-base leading-snug">{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
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

                <div
                  className="custom-scrollbar space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1"
                  style={{ maxHeight: `${listMaxHeight}px` }}
                >
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
              </div>
            ),
            document.body,
          )
        : null}
    </div>
  );
}
