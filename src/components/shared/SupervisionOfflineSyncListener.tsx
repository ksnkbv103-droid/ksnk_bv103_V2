"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw, Trash2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import {
  discardPendingSupervisionItem,
  flushPendingSupervisionSaves,
  getPendingSupervisionCount,
  listPendingSupervisionItems,
  type PendingSupervisionItem,
} from "@/lib/offline-pending-supervision-save";
import { BV103_DIALOG_STACK } from "@/lib/bv103-dialog-stack";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const RETRY_MS = 60_000;

function describeItem(item: PendingSupervisionItem): string {
  const loai = item.kind === "vst" ? "Vệ sinh tay" : "Giám sát chung";
  const s = item.session as Record<string, unknown>;
  const ngay = typeof s.ngay_giam_sat === "string" && s.ngay_giam_sat ? ` · ngày ${s.ngay_giam_sat}` : "";
  const viTri = typeof s.vi_tri === "string" && s.vi_tri.trim() ? ` · ${s.vi_tri.trim()}` : "";
  const luc = new Date(item.enqueuedAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
  return `${loai}${ngay}${viTri} · lưu lúc ${luc}`;
}

/**
 * Đăng ký flush hàng đợi phiên giám sát ngoại tuyến khi có mạng + thử định kỳ.
 * Hiển thị banner khi còn phiên chưa gửi lên máy chủ.
 */
export default function SupervisionOfflineSyncListener() {
  const flushing = useRef(false);
  const [items, setItems] = useState<PendingSupervisionItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showList, setShowList] = useState(false);
  const [toDiscard, setToDiscard] = useState<PendingSupervisionItem | null>(null);
  const pendingCount = items.length;

  const refreshCount = useCallback(() => {
    setItems(listPendingSupervisionItems());
  }, []);

  const confirmDiscard = () => {
    if (!toDiscard) return;
    if (discardPendingSupervisionItem(toDiscard.clientId)) {
      toast.success("Đã hủy bảng kiểm chưa gửi.");
    }
    setToDiscard(null);
    refreshCount();
  };

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
    <div className={`fixed bottom-20 left-4 right-4 ${BV103_DIALOG_STACK.toast} mx-auto max-w-lg rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg md:left-auto md:right-6`}>
      <div className="flex items-center gap-3">
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
      <button
        type="button"
        onClick={() => setShowList((v) => !v)}
        aria-expanded={showList}
        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-950"
      >
        {showList ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
        {showList ? "Ẩn danh sách" : "Xem danh sách / hủy bảng kiểm"}
      </button>
      {showList && (
        <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <li key={item.clientId} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-800">{describeItem(item)}</p>
                {item.lastError && <p className="mt-0.5 text-xs text-red-700">Lỗi: {item.lastError}</p>}
              </div>
              <button
                type="button"
                onClick={() => setToDiscard(item)}
                disabled={isSyncing}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Hủy
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!toDiscard} onOpenChange={(open) => { if (!open) setToDiscard(null); }}>
        <DialogContent
          className={`max-w-md rounded-[var(--radius-shell)] p-6 ${BV103_DIALOG_STACK.hubContent} ${BV103_DIALOG_STACK.surface}`}
          overlayClassName={`${BV103_DIALOG_STACK.hubOverlay} ${BV103_DIALOG_STACK.overlayDim}`}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">Hủy bảng kiểm chưa gửi?</DialogTitle>
            <DialogDescription className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {toDiscard ? describeItem(toDiscard) : ""}. Bảng kiểm sẽ bị xóa khỏi máy này, không gửi lên hệ thống và
              không khôi phục được.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <button
              type="button"
              onClick={() => setToDiscard(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Giữ lại
            </button>
            <button
              type="button"
              onClick={confirmDiscard}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Hủy bảng kiểm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
