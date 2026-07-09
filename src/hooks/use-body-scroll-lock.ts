"use client";

import { useEffect } from "react";

/** Số lớp đang khóa cuộn — tránh race khi sidebar + picker + filter cùng mở/đóng. */
let lockCount = 0;
let savedScrollY = 0;
let savedOverflow = "";
let savedBody: {
  overflow: string;
  position: string;
  top: string;
  width: string;
  paddingRight: string;
} | null = null;

export const BV103_APP_SCROLL_ATTR = "data-bv103-app-scroll";

function getAppScrollRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(`[${BV103_APP_SCROLL_ATTR}]`);
}

function isBodyFixedLock(): boolean {
  return (
    document.body.dataset.bv103ScrollLock === "1" ||
    document.body.style.position === "fixed"
  );
}

function lockAppScrollRoot(root: HTMLElement) {
  savedScrollY = root.scrollTop;
  savedOverflow = root.style.overflow;
  root.style.overflow = "hidden";
  root.dataset.bv103ScrollLock = "1";
}

function unlockAppScrollRoot(root: HTMLElement) {
  root.style.overflow = savedOverflow;
  root.scrollTop = savedScrollY;
  delete root.dataset.bv103ScrollLock;
  savedOverflow = "";
}

function lockBodyLegacy() {
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

function unlockBodyLegacy() {
  if (!savedBody) return;
  document.body.style.overflow = savedBody.overflow;
  document.body.style.position = savedBody.position;
  document.body.style.top = savedBody.top;
  document.body.style.width = savedBody.width;
  document.body.style.paddingRight = savedBody.paddingRight;
  delete document.body.dataset.bv103ScrollLock;
  window.scrollTo(0, savedScrollY);
  savedBody = null;
}

function lockBodyScroll() {
  const root = getAppScrollRoot();
  if (lockCount === 0) {
    if (root) {
      lockAppScrollRoot(root);
    } else {
      lockBodyLegacy();
    }
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  const root = getAppScrollRoot();
  if (root?.dataset.bv103ScrollLock === "1") {
    unlockAppScrollRoot(root);
    return;
  }

  if (savedBody || isBodyFixedLock()) {
    unlockBodyLegacy();
  }
}

/** Khóa cuộn nền (mobile modal/sidebar/picker) — ref-count an toàn iOS. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [active]);
}

/** Gỡ mọi khóa cuộn còn sót — gọi khi đổi route hoặc đóng overlay. */
export function forceReleaseScrollLock() {
  lockCount = 0;

  const root = getAppScrollRoot();
  if (root?.dataset.bv103ScrollLock === "1") {
    root.style.overflow = "";
    delete root.dataset.bv103ScrollLock;
    savedOverflow = "";
  }

  if (isBodyFixedLock() || savedBody) {
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    document.body.style.paddingRight = "";
    delete document.body.dataset.bv103ScrollLock;
    savedBody = null;
  }
}

/** @deprecated — dùng `forceReleaseScrollLock` */
export function repairBodyScrollLockIfStale() {
  forceReleaseScrollLock();
}
