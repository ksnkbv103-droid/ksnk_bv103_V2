"use client";

import React, { useEffect, useState, useCallback } from "react";
import { WifiOff, Wifi, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getOfflineTasks, removeOfflineTask, type OfflineTask } from "@/lib/offline-sync";
import { cssdCommandAdvanceStation } from "@/modules/cssd-erp/contexts/processing-lifecycle/entrypoint";
import { createIncidentReport } from "@/modules/cssd-su-co/actions/su-co-report.actions";

export default function OfflineSyncManager() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingTasks, setPendingTasks] = useState<OfflineTask[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const checkQueue = useCallback(async () => {
    const tasks = await getOfflineTasks();
    setPendingTasks(tasks);
  }, []);

  async function syncData() {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);

    try {
      const tasks = await getOfflineTasks();
      if (tasks.length === 0) {
        setIsSyncing(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const task of tasks) {
        try {
          if (task.type === "SCAN_QR") {
            const { maQR, station } = task.payload;
            await cssdCommandAdvanceStation(maQR, station);
          } else if (task.type === "REPORT_INCIDENT") {
            await createIncidentReport(task.payload);
          }

          await removeOfflineTask(task.id);
          successCount++;
        } catch (err: unknown) {
          console.error("Lỗi đồng bộ task", task, err);
          errorCount++;
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes("fetch")) {
            await removeOfflineTask(task.id);
          }
        }
      }

      await checkQueue();

      if (successCount > 0) {
        toast.success(`Đã đồng bộ ${successCount} thao tác ngoại tuyến thành công.`);
      }
      if (errorCount > 0) {
        toast.error(`Có ${errorCount} thao tác ngoại tuyến bị lỗi nghiệp vụ (đã loại bỏ).`);
      }
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    // Initial check
    setIsOnline(navigator.onLine);
    checkQueue();

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Đã có kết nối mạng", {
        description: "Hệ thống sẽ tự động đồng bộ dữ liệu ngoại tuyến.",
      });
      syncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Mất kết nối mạng!", {
        description: "Phần mềm đang chạy ở chế độ Offline. Các thao tác quét sẽ được lưu tạm.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Poll queue periodically just in case
    const interval = setInterval(checkQueue, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [checkQueue]);

  if (isOnline && pendingTasks.length === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-[9999] flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold shadow-xl transition-all ${
      !isOnline ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
    }`}>
      {!isOnline ? (
        <WifiOff size={18} className="animate-pulse" />
      ) : isSyncing ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <Wifi size={18} />
      )}
      
      <div className="flex flex-col">
        <span>{!isOnline ? "Chế độ Offline" : "Đang kết nối..."}</span>
        {pendingTasks.length > 0 && (
          <span className="text-[11px] font-medium text-white/80">
            {pendingTasks.length} thao tác chờ đồng bộ
          </span>
        )}
      </div>

      {isOnline && pendingTasks.length > 0 && !isSyncing && (
        <button 
          onClick={syncData}
          className="ml-2 rounded-lg bg-white/20 p-1.5 hover:bg-white/30"
          aria-label="Đồng bộ ngay"
        >
          <RefreshCw size={14} />
        </button>
      )}
    </div>
  );
}
