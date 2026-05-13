"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMobilePickerSheet } from "@/hooks/use-mobile-picker-sheet";

export type SearchableSelectOption = {
  id: string;
  label: string;
  keywords?: string[];
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  required?: boolean;
};

const normalizeSearchText = (value: string) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

/** Cao hơn overlay dialog (z-50) để list không bị che; portal tránh overflow-hidden trên form. */
const DROPDOWN_Z = 10050;

/** Vùng danh sách desktop: cao cố định mục tiêu, cuộn nội bộ — chỉ thu khi sát mép viewport. */
const DESKTOP_PICKER_LIST_IDEAL_PX = 240;
const DESKTOP_PICKER_LIST_FLOOR_PX = 140;

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Tìm nhanh...",
  disabled = false,
  className = "",
  name,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [listMaxHeight, setListMaxHeight] = useState(DESKTOP_PICKER_LIST_IDEAL_PX);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const canUseDOM = typeof document !== "undefined";
  const isMobileSheet = useMobilePickerSheet();

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.id === value);
  }, [options, value]);

  const filtered = useMemo(() => {
    const q = normalizeSearchText(query);
    if (!q) return options;
    const terms = q.split(/\s+/).filter(Boolean);
    return options.filter((opt) => {
      const haystack = [opt.label, opt.id, ...(opt.keywords || [])]
        .map((x) => normalizeSearchText(String(x || "")))
        .join(" ");
      return terms.every((term) => haystack.includes(term));
    });
  }, [options, query]);

  const handleSelect = (next: string) => {
    onChange?.(next);
    setOpen(false);
    setQuery("");
  };

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
      const minPanelHeight = 180;
      const panelChromeHeight = 72;
      const spaceBelow = viewportHeight - rect.bottom - safeMargin;
      const spaceAbove = rect.top - safeMargin;
      const openUpward = spaceBelow < minPanelHeight && spaceAbove > spaceBelow;
      const availableSpace = Math.max(DESKTOP_PICKER_LIST_FLOOR_PX, (openUpward ? spaceAbove : spaceBelow) - gap);
      const maxAllowedList = Math.max(DESKTOP_PICKER_LIST_FLOOR_PX, availableSpace - panelChromeHeight);
      const nextListHeight = Math.min(DESKTOP_PICKER_LIST_IDEAL_PX, maxAllowedList);

      setListMaxHeight(nextListHeight);
      setDropdownStyle({
        position: "fixed",
        top: openUpward
          ? Math.max(safeMargin, rect.top - gap - (panelChromeHeight + nextListHeight))
          : rect.bottom + gap,
        left: rect.left,
        width: Math.max(rect.width, 280),
        zIndex: DROPDOWN_Z,
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
      searchInputRef.current?.focus({ preventScroll: true });
    } catch {
      searchInputRef.current?.focus();
    }
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
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
        searchInputRef.current?.focus({ preventScroll: true });
      } catch {
        searchInputRef.current?.focus();
      }
    }, 0);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(t);
    };
  }, [open, isMobileSheet]);

  return (
    <div ref={rootRef} className="relative">
      {!!name && <input type="hidden" name={name} value={value || ""} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 min-h-[2.75rem] w-full items-center rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm font-medium text-slate-800 shadow-sm transition-colors outline-none hover:border-slate-300 hover:bg-slate-50/90 focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60 md:h-12 md:rounded-2xl md:px-4 ${className}`}
      >
        <span className={selectedOption ? "text-slate-900" : "text-slate-500"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
      </button>

      {open && !disabled && canUseDOM
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
                  aria-labelledby="searchable-select-sheet-title"
                  className="relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/80"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5">
                    <span
                      id="searchable-select-sheet-title"
                      className="min-w-0 truncate text-sm font-black uppercase tracking-tight text-slate-800"
                    >
                      {placeholder}
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
                      ref={searchInputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (filtered.length > 0) handleSelect(filtered[0].id);
                        }
                      }}
                      placeholder={searchPlaceholder}
                      className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-base outline-none focus:border-[#026f17]"
                      autoComplete="off"
                      enterKeyHint="search"
                    />
                  </div>
                  <div className="custom-scrollbar min-h-0 max-h-[min(52dvh,420px)] flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
                    <button
                      type="button"
                      onClick={() => handleSelect("")}
                      className="mb-2 w-full rounded-xl border border-slate-100 px-3 py-3.5 text-left text-base text-slate-500 hover:bg-slate-50 active:bg-slate-100"
                    >
                      {placeholder}
                    </button>
                    {filtered.map((opt, idx) => (
                      <button
                        key={opt.id || idx}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelect(opt.id);
                        }}
                        className={`mb-2 w-full rounded-xl px-3 py-3.5 text-left text-base leading-snug hover:bg-slate-50 active:bg-slate-100 ${
                          value === opt.id ? "bg-[#026f17]/12 font-semibold text-[#026f17]" : "text-slate-800"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                    {filtered.length === 0 ? (
                      <p className="px-2 py-8 text-center text-base text-slate-400">Không có kết quả phù hợp</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div
                ref={panelRef}
                style={dropdownStyle}
                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              >
                <input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (filtered.length > 0) handleSelect(filtered[0].id);
                    }
                  }}
                  placeholder={searchPlaceholder}
                  className="mb-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#026f17]"
                />

                <div
                  className="custom-scrollbar overflow-y-auto overflow-x-hidden overscroll-contain pr-1"
                  style={{ maxHeight: `${listMaxHeight}px` }}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect("")}
                    className="mb-1 w-full rounded-lg px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-50"
                  >
                    {placeholder}
                  </button>
                  {filtered.map((opt, idx) => (
                    <button
                      key={opt.id || idx}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(opt.id);
                      }}
                      className={`mb-1 w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50 ${
                        value === opt.id ? "bg-[#026f17]/10 font-semibold text-[#026f17]" : "text-slate-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  {filtered.length === 0 ? (
                    <p className="px-2 py-2 text-sm text-slate-400">Không có kết quả phù hợp</p>
                  ) : null}
                </div>
              </div>
            ),
            document.body,
          )
        : null}
    </div>
  );
}
