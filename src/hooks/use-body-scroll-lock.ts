"use client";

import { useEffect } from "react";

/** Số lớp đang khóa cuộn — tránh race khi sidebar + picker + filter cùng mở/đóng. */
let lockCount = 0;
let savedBodyOverflow = "";

function lockBodyScroll() {
  if (lockCount === 0) {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.bv103ScrollLock = "1";
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  document.body.style.overflow = savedBodyOverflow;
  delete document.body.dataset.bv103ScrollLock;
  savedBodyOverflow = "";
}

/** Khóa cuộn nền khi mở sidebar/modal mobile — chỉ `overflow:hidden`, không `position:fixed`. */
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
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.paddingRight = "";
  delete document.body.dataset.bv103ScrollLock;
  savedBodyOverflow = "";

  document.querySelectorAll<HTMLElement>("[data-bv103-app-scroll]").forEach((el) => {
    el.style.overflow = "";
    delete el.dataset.bv103ScrollLock;
  });
}

/** @deprecated — dùng `forceReleaseScrollLock` */
export function repairBodyScrollLockIfStale() {
  forceReleaseScrollLock();
}
