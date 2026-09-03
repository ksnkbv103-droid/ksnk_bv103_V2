"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMobilePickerSheet } from "@/hooks/use-mobile-picker-sheet";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import {
  BV103_PICKER_PORTAL_ATTR,
  resolveBv103PickerPortalRoot,
  unlockBv103PickerPortalKeyboard,
} from "@/lib/bv103-picker-portal";

export type SearchableSelectOption = {
  id: string;
  label: string;
  keywords?: string[];
  /** Nhóm hiển thị (vd. 4 vùng IPAC) — render header khi đổi nhóm. */
  groupLabel?: string;
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
  /** Cho gõ mã mới (Enter hoặc nút “Nhập mã mới”) khi không có trong danh sách. */
  allowCustom?: boolean;
  /** Ô gõ ngay trên trigger — tìm / dán mã / súng QR, không cần ô riêng. */
  inputTrigger?: boolean;
  endSlot?: React.ReactNode;
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
  allowCustom = false,
  inputTrigger = false,
  endSlot,
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
  useBodyScrollLock(open && isMobileSheet);

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

  const commitTypedQuery = () => {
    const typed = query.trim();
    if (!typed) {
      if (filtered.length > 0) handleSelect(filtered[0].id);
      return;
    }
    const normalized = typed.toUpperCase();
    const exact =
      filtered.find((o) => o.id.toUpperCase() === normalized) ||
      options.find((o) => o.id.toUpperCase() === normalized);
    if (exact) {
      handleSelect(exact.id);
      return;
    }
    if (allowCustom) {
      handleSelect(normalized);
      return;
    }
    if (filtered.length > 0) handleSelect(filtered[0].id);
  };

  const typedCustom = allowCustom ? query.trim().toUpperCase() : "";
  const showCustomCreate =
    Boolean(typedCustom) && !options.some((o) => o.id.toUpperCase() === typedCustom);

  const displayText = selectedOption?.label || (allowCustom && value ? value : "");

  const renderOptionButtons = (list: SearchableSelectOption[], itemClassName: string) => {
    let lastGroup = "";
    return list.flatMap((opt, idx) => {
      const nodes: React.ReactNode[] = [];
      const group = opt.groupLabel?.trim() || "";
      if (group && group !== lastGroup) {
        lastGroup = group;
        nodes.push(
          <div
            key={`group-${group}-${idx}`}
            className="sticky top-0 z-[1] px-2 py-1.5 text-[11px] font-medium text-slate-500 bg-white/95 backdrop-blur-sm border-b border-slate-100 mb-1"
          >
            {group}
          </div>,
        );
      }
      nodes.push(
        <button
          key={opt.id || idx}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSelect(opt.id);
          }}
          className={`${itemClassName} ${
            value === opt.id ? "bg-[var(--primary)]/10 font-semibold text-[var(--primary)]" : "text-slate-700"
          }`}
        >
          {opt.label}
        </button>,
      );
      return nodes;
    });
  };

  const renderCustomCreate = (itemClassName: string) =>
    showCustomCreate ? (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSelect(typedCustom);
        }}
        className={`${itemClassName} font-semibold text-[var(--primary)]`}
      >
        Nhập mã mới: {typedCustom}
      </button>
    ) : null;

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
    if (!open) return;
    let stop: () => void = () => {};
    const id = window.requestAnimationFrame(() => {
      const root =
        panelRef.current?.closest(`[${BV103_PICKER_PORTAL_ATTR}]`) ?? panelRef.current;
      stop = unlockBv103PickerPortalKeyboard(root instanceof HTMLElement ? root : null);
    });
    return () => {
      window.cancelAnimationFrame(id);
      stop();
    };
  }, [open]);

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

  const triggerInputValue = open || query ? query : displayText;

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      {!!name && <input type="hidden" name={name} value={value || ""} />}
      {inputTrigger ? (
        <input
          type="text"
          disabled={disabled}
          value={triggerInputValue}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder={placeholder}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            commitTypedQuery();
          }}
          className={`${bv103LayoutChrome.controlInput} min-w-0 flex-1 font-mono uppercase tracking-wide ${className}`}
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={`${bv103LayoutChrome.controlSelectTrigger} min-w-0 flex-1 ${className}`}
        >
          <span className={selectedOption || (allowCustom && value) ? "text-slate-900" : "text-slate-500"}>
            {displayText || placeholder}
          </span>
        </button>
      )}
      {endSlot}

      {open && !disabled && canUseDOM
        ? createPortal(
            isMobileSheet ? (
              <div
                data-bv103-picker-portal=""
                className="pointer-events-auto fixed inset-0 z-[10060] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
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
                  className="relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-shell)] bg-white shadow-[var(--shadow-app-soft)] ring-1 ring-slate-200/80"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5">
                    <span
                      id="searchable-select-sheet-title"
                      className="min-w-0 truncate text-sm font-semibold text-slate-800"
                    >
                      {placeholder}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold text-slate-800 active:bg-slate-100"
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
                        e.stopPropagation();
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitTypedQuery();
                        }
                      }}
                      placeholder={searchPlaceholder}
                      className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-base outline-none focus:border-[var(--primary)]"
                      autoComplete="off"
                      enterKeyHint="search"
                    />
                  </div>
                  <div className="custom-scrollbar bv103-scroll-y min-h-0 max-h-[min(52dvh,420px)] flex-1 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
                    <button
                      type="button"
                      onClick={() => handleSelect("")}
                      className="mb-2 w-full rounded-xl border border-slate-100 px-3 py-3.5 text-left text-base text-slate-500 hover:bg-slate-50 active:bg-slate-100"
                    >
                      {placeholder}
                    </button>
                    {renderOptionButtons(
                      filtered,
                      "mb-2 w-full rounded-xl px-3 py-3.5 text-left text-base leading-snug hover:bg-slate-50 active:bg-slate-100",
                    )}
                    {renderCustomCreate(
                      "mb-2 w-full rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-3 py-3.5 text-left text-base",
                    )}
                    {filtered.length === 0 && !showCustomCreate ? (
                      <p className="px-2 py-8 text-center text-base text-slate-400">Không có kết quả phù hợp</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div
                ref={panelRef}
                data-bv103-picker-portal=""
                style={{ ...dropdownStyle, pointerEvents: "auto" }}
                className="pointer-events-auto rounded-[var(--radius-shell)] border border-slate-200 bg-white p-3 shadow-[var(--shadow-app-soft)] animate-in fade-in zoom-in-95 duration-200"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {inputTrigger ? null : (
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitTypedQuery();
                      }
                    }}
                    placeholder={searchPlaceholder}
                    className="mb-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
                  />
                )}

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
                  {renderOptionButtons(
                    filtered,
                    "mb-1 w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50",
                  )}
                  {renderCustomCreate(
                    "mb-1 w-full rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-2 py-1.5 text-left text-sm",
                  )}
                  {filtered.length === 0 && !showCustomCreate ? (
                    <p className="px-2 py-2 text-sm text-slate-400">Không có kết quả phù hợp</p>
                  ) : null}
                </div>
              </div>
            ),
            resolveBv103PickerPortalRoot(),
          )
        : null}
    </div>
  );
}
