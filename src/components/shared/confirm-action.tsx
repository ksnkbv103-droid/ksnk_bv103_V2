"use client";

import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BV103_DIALOG_STACK } from "@/lib/bv103-dialog-stack";
import { cn } from "@/lib/utils";

export type ConfirmActionOptions = {
  title?: string;
  /** Xuống dòng `\n` được giữ. */
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** `danger` (mặc định): nút đỏ — xóa, tắt, ghi đè. */
  tone?: "danger" | "default";
  /** Bắt gõ đúng chuỗi này mới bật nút xác nhận — cho thao tác IT khó đảo. */
  requireText?: string;
};

type Pending = ConfirmActionOptions & { resolve: (ok: boolean) => void };

let root: Root | null = null;
let push: ((p: Pending) => void) | null = null;
const queue: Pending[] = [];

function ConfirmActionHost() {
  const [current, setCurrent] = React.useState<Pending | null>(null);
  const [typed, setTyped] = React.useState("");

  React.useEffect(() => {
    push = (p) => setCurrent((cur) => (cur ? (queue.push(p), cur) : p));
    for (let p = queue.shift(); p; p = queue.shift()) push(p);
    return () => {
      push = null;
    };
  }, []);

  const close = (ok: boolean) => {
    current?.resolve(ok);
    setTyped("");
    setCurrent(queue.shift() ?? null);
  };

  const needText = current?.requireText;
  const canConfirm = !needText || typed.trim() === needText;
  const danger = (current?.tone ?? "danger") === "danger";

  return (
    <Dialog open={!!current} onOpenChange={(open) => !open && close(false)}>
      {current ? (
        <DialogContent
          overlayClassName={cn(BV103_DIALOG_STACK.nestedOverlay, BV103_DIALOG_STACK.overlayDim)}
          className={cn(BV103_DIALOG_STACK.nestedContent, "max-w-md")}
          hideCloseButton
        >
          <DialogHeader>
            <DialogTitle>{current.title || "Xác nhận thao tác"}</DialogTitle>
            <DialogDescription className="whitespace-pre-line text-sm text-slate-700">
              {current.message}
            </DialogDescription>
          </DialogHeader>
          {needText ? (
            <div className="grid gap-1.5">
              <label htmlFor="confirm-action-text" className="text-xs font-medium text-slate-600">
                Gõ <span className="font-mono font-semibold">{needText}</span> để xác nhận
              </label>
              <input
                id="confirm-action-text"
                autoComplete="off"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="h-11 rounded-md border border-slate-300 px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              />
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => close(false)} autoFocus={!needText}>
              {current.cancelText || "Hủy"}
            </Button>
            <Button variant={danger ? "destructive" : "default"} disabled={!canConfirm} onClick={() => close(true)}>
              {current.confirmText || "Đồng ý"}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

/**
 * Thay `window.confirm`: hộp xác nhận chuẩn BV103, trả `true` khi người dùng đồng ý.
 * Tự gắn host vào `document.body` lần gọi đầu — không cần sửa layout.
 */
export function confirmAction(input: string | ConfirmActionOptions): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  const opts = typeof input === "string" ? { message: input } : input;
  return new Promise<boolean>((resolve) => {
    const pending: Pending = { ...opts, resolve };
    if (push) {
      push(pending);
      return;
    }
    queue.push(pending);
    if (!root) {
      const el = document.createElement("div");
      el.setAttribute("data-confirm-action-host", "");
      document.body.appendChild(el);
      root = createRoot(el);
      root.render(<ConfirmActionHost />);
    }
  });
}
