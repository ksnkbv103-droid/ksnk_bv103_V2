"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface QlcvReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  minLength?: number;
  onConfirm: (reason: string) => void | Promise<void>;
}

/**
 * Dialog nhập lý do — thay thế browser prompt().
 * Dùng cho: từ chối nghiệm thu, hủy công việc, bất kỳ thao tác cần lý do.
 */
export function QlcvReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder = "Nhập lý do…",
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy bỏ",
  variant = "default",
  minLength = 3,
  onConfirm,
}: QlcvReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset form khi mở/đóng dialog
  useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const trimmed = reason.trim();
  const isValid = trimmed.length >= minLength;
  const showError = touched && !isValid;

  const handleConfirm = async () => {
    setTouched(true);
    if (!isValid) return;
    setBusy(true);
    try {
      await onConfirm(trimmed);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { onOpenChange(v); } }}>
      <DialogContent className="max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl">
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

        <div className="mt-4 space-y-2">
          <textarea
            ref={textareaRef}
            id="qlcv-reason-dialog-input"
            className={[
              "w-full resize-none rounded-xl border px-3 py-2.5 text-sm leading-relaxed text-slate-800 outline-none transition-colors",
              "placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--primary)]/20",
              showError
                ? "border-red-300 bg-red-50/40 focus:border-red-400"
                : "border-slate-200 bg-slate-50/60 focus:border-slate-300",
            ].join(" ")}
            rows={3}
            maxLength={500}
            placeholder={placeholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            disabled={busy}
          />
          <div className="flex items-center justify-between">
            {showError ? (
              <p className="text-[11px] text-red-600">
                Vui lòng nhập lý do (tối thiểu {minLength} ký tự).
              </p>
            ) : (
              <span />
            )}
            <span className="text-[11px] text-slate-400">{reason.length}/500</span>
          </div>
        </div>

        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button
            id="qlcv-reason-dialog-cancel"
            variant="outline"
            className="h-10 rounded-xl border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            id="qlcv-reason-dialog-confirm"
            className={
              variant === "danger"
                ? "h-10 rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                : "h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            }
            onClick={handleConfirm}
            disabled={busy || !isValid}
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Đang xử lý…
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
