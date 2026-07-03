"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { flushPendingSupervisionSaves, getPendingSupervisionCount } from "@/lib/offline-pending-supervision-save";

const RETRY_MS = 60_000;

/**
 * Đăng ký flush hàng đợi phiên giám sát ngoại tuyến khi có mạng + thử định kỳ.
 * Hiển thị banner khi còn phiên chưa gửi lên máy chủ.
 */
export default function SupervisionOfflineSyncListener() {
  const flushing = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshCount = useCallback(() => {
    setPendingCount(getPendingSupervisionCount());
  }, []);

  const run = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    refreshCount();
    if (getPendingSupervisionCount() === 0) return;
    if (flushing.current) return;
    flushing.current = true;
    setIsSyncing(true);
    try {
      const { synced, failed, lastError } = await flushPendingSupervisionSaves();
      refreshCount();
      if (synced > 0) {
        toast.success(`Đã gửi ${synced} phiên giám sát lên hệ thống (trước đó chờ mạng).`);
      }
      if (failed > 0) {
        toast.error(
          lastError
            ? `Còn ${failed} phiên chưa gửi được: ${lastError}`
            : `Còn ${failed} phiên chưa gửi được — kiểm tra tài khoản liên kết hồ sơ và thử lại.`,
          { duration: 8000 },
        );
      }
    } finally {
      flushing.current = false;
      setIsSyncing(false);
    }
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();
    void run();

    const onOnline = () => void run();
    window.addEventListener("online", onOnline);

    const interval = setInterval(() => {
      refreshCount();
      if (getPendingSupervisionCount() > 0) void run();
    }, RETRY_MS);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "bv103_supervision_offline_queue_v1") refreshCount();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, [run, refreshCount]);

  if (pendingCount === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9998] mx-auto flex max-w-lg items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg md:left-auto md:right-6">
      <WifiOff className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Có {pendingCount} phiên giám sát chưa lên máy chủ</p>
        <p className="text-xs text-amber-800">
          Dữ liệu đang chờ mạng hoặc cần sửa lỗi trước khi gửi. Bấm đồng bộ khi đã có internet.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void run()}
        disabled={isSyncing}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} aria-hidden />
        Đồng bộ
      </button>
    </div>
  );
}
