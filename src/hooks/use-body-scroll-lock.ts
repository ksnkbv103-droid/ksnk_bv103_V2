"use client";

import { useEffect } from "react";

/** Số lớp đang khóa cuộn — tránh race khi sidebar + picker + filter cùng mở/đóng. */
let lockCount = 0;
let savedScrollY = 0;
let savedBody: {
  overflow: string;
  position: string;
  top: string;
  width: string;
  paddingRight: string;
} | null = null;

function lockBodyScroll() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    savedBody = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    };
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarGap > 0) {
      document.body.style.paddingRight = `${scrollbarGap}px`;
    }
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = "100%";
    document.body.dataset.bv103ScrollLock = "1";
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount > 0 || !savedBody) return;

  document.body.style.overflow = savedBody.overflow;
  document.body.style.position = savedBody.position;
  document.body.style.top = savedBody.top;
  document.body.style.width = savedBody.width;
  document.body.style.paddingRight = savedBody.paddingRight;
  delete document.body.dataset.bv103ScrollLock;
  window.scrollTo(0, savedScrollY);
  savedBody = null;
}

/** Khóa cuộn nền (mobile modal/sidebar/picker) — ref-count an toàn iOS. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [active]);
}

/** Gỡ khóa body còn sót sau điều hướng (lockCount=0 nhưng body vẫn fixed). */
export function repairBodyScrollLockIfStale() {
  if (lockCount > 0 || document.body.dataset.bv103ScrollLock !== "1") return;

  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.paddingRight = "";
  delete document.body.dataset.bv103ScrollLock;
  savedBody = null;
}
