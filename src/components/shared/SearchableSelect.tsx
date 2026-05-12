"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const [listMaxHeight, setListMaxHeight] = useState(220);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const canUseDOM = typeof document !== "undefined";

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
    if (!open) return;

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
      const availableSpace = Math.max(120, (openUpward ? spaceAbove : spaceBelow) - gap);
      const nextListHeight = Math.max(120, Math.min(280, availableSpace - panelChromeHeight));

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
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {!!name && <input type="hidden" name={name} value={value || ""} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`h-12 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 text-left text-sm font-semibold text-slate-700 transition-all outline-none hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <span className={selectedOption ? "text-slate-800" : "text-slate-400 font-medium"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
      </button>

      {open && !disabled && canUseDOM
        ? createPortal(
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

              <div className="overflow-y-auto overflow-x-hidden pr-1" style={{ maxHeight: `${listMaxHeight}px` }}>
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
