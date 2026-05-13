"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { flushPendingSupervisionSaves, getPendingSupervisionCount } from "@/lib/offline-pending-supervision-save";

/**
 * Đăng ký flush hàng đợi phiên giám sát ngoại tuyến khi có mạng + thử một lần khi mount.
 */
export default function SupervisionOfflineSyncListener() {
  const flushing = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      if (getPendingSupervisionCount() === 0) return;
      if (flushing.current) return;
      flushing.current = true;
      try {
        const { synced, failed } = await flushPendingSupervisionSaves();
        if (synced > 0) {
          toast.success(`Đã đồng bộ ${synced} phiên giám sát đang chờ (ngoại tuyến).`);
        }
        if (failed > 0) {
          toast.message(`Còn ${failed} mục chưa gửi được — sẽ thử lại khi mạng ổn định.`);
        }
      } finally {
        flushing.current = false;
      }
    };

    void run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, []);

  return null;
}
