"use client";

import { useEffect } from "react";

/** Số lớp đang khóa cuộn — tránh race khi sidebar + picker + filter cùng mở/đóng. */
let lockCount = 0;
let savedOverflow = "";
let lockedElement: HTMLElement | null = null;

const MOBILE_INNER_SCROLL_MQ = "(max-width: 767px)";

function getAppScrollEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-bv103-app-scroll]");
}

function usesMobileInnerScroll(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_INNER_SCROLL_MQ).matches;
}

function lockBodyScroll() {
  if (lockCount === 0) {
    const appScroll = usesMobileInnerScroll() ? getAppScrollEl() : null;
    if (appScroll) {
      lockedElement = appScroll;
      savedOverflow = appScroll.style.overflow;
      appScroll.style.overflow = "hidden";
      appScroll.dataset.bv103ScrollLock = "1";
    } else {
      lockedElement = null;
      savedOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.dataset.bv103ScrollLock = "1";
    }
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  if (lockedElement) {
    lockedElement.style.overflow = savedOverflow;
    delete lockedElement.dataset.bv103ScrollLock;
    lockedElement = null;
  } else {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = savedOverflow;
    delete document.body.dataset.bv103ScrollLock;
  }
  savedOverflow = "";
}

/** Khóa cuộn nền (mobile: vùng `<main>`; desktop: body). */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [active]);
}

/** Gỡ mọi khóa cuộn còn sót — gọi khi đổi route / mount app. */
export function forceReleaseScrollLock() {
  lockCount = 0;
  lockedElement = null;
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.paddingRight = "";
  delete document.body.dataset.bv103ScrollLock;
  savedOverflow = "";

  document.querySelectorAll<HTMLElement>("[data-bv103-app-scroll]").forEach((el) => {
    el.style.overflow = "";
    delete el.dataset.bv103ScrollLock;
  });
}

/** @deprecated — dùng `forceReleaseScrollLock` */
function repairBodyScrollLockIfStale() {
  forceReleaseScrollLock();
}
