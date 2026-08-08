"use client";

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PANEL_W = 224; // w-56
const GAP = 4;
const MARGIN = 8;
const DEFAULT_MAX_H = 176; // ~max-h-44

type Props = {
  triggerLabel: string;
  triggerClassName: string;
  /** Chiều cao tối đa danh sách (px) */
  maxHeight?: number;
  children: React.ReactNode;
};

/**
 * Menu thêm TC/CĐHA trên lưới BA — portal + fixed để không bị overflow của khung cuộn cắt.
 * Gần đáy: mở lên; gần mép phải: kẹp trong viewport.
 */
export default function NkbvGridCriteriaAddPopover({
  triggerLabel,
  triggerClassName,
  maxHeight = DEFAULT_MAX_H,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLUListElement | null>(null);
  const listId = useId();
  const maxHeightRef = useRef(maxHeight);
  maxHeightRef.current = maxHeight;

  const computeStyle = (rect: DOMRect): React.CSSProperties => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const mh = maxHeightRef.current;
    const spaceBelow = vh - rect.bottom - MARGIN;
    const spaceAbove = rect.top - MARGIN;
    const openUpward = spaceBelow < Math.min(mh, 120) && spaceAbove > spaceBelow;
    const available = Math.max(72, (openUpward ? spaceAbove : spaceBelow) - GAP);
    const panelH = Math.min(mh, available);
    const left = Math.min(Math.max(MARGIN, rect.left), Math.max(MARGIN, vw - PANEL_W - MARGIN));
    const top = openUpward
      ? Math.max(MARGIN, rect.top - GAP - panelH)
      : rect.bottom + GAP;
    return {
      position: "fixed",
      top,
      left,
      width: PANEL_W,
      maxHeight: panelH,
      zIndex: 10070,
    };
  };

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setStyle(computeStyle(rect));
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => updatePosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const canPortal = typeof document !== "undefined";

  return (
    <div className="mt-auto">
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) {
              const rect = triggerRef.current?.getBoundingClientRect();
              if (rect) setStyle(computeStyle(rect));
            }
            return next;
          });
        }}
      >
        {triggerLabel}
      </button>
      {open && canPortal && style
        ? createPortal(
            <ul
              ref={panelRef}
              id={listId}
              role="menu"
              data-bv103-picker-portal=""
              style={{ ...style, pointerEvents: "auto" }}
              className="overflow-auto rounded border bg-white p-1 shadow-lg"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {children}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
