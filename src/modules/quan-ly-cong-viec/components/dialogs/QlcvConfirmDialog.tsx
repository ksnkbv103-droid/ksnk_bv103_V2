"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

interface QlcvConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

/**
 * Dialog xác nhận đơn giản — thay thế browser confirm().
 * Dùng cho: nghiệm thu & đóng, xóa công việc, các thao tác không cần lý do.
 */
export function QlcvConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy bỏ",
  variant = "default",
  onConfirm,
  loading = false,
}: QlcvConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  const isLoading = loading || busy;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isLoading) onOpenChange(v); }}>
      <DialogContent className="max-w-md rounded-[var(--radius-shell)] border border-slate-200/90 bg-white p-6 shadow-[var(--shadow-app-soft)]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight text-slate-900">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            id="qlcv-confirm-dialog-cancel"
            className={C.btnSecondary}
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            id="qlcv-confirm-dialog-confirm"
            className={
              variant === "danger"
                ? "bv103-control-h inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-red-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                : C.btnPrimary
            }
            onClick={() => void handleConfirm()}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Đang xử lý…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
