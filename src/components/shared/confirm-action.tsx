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

export type PromptTextOptions = {
  title?: string;
  /** Câu giải thích phía trên ô nhập (tùy chọn). */
  message?: string;
  /** Nhãn ô nhập, ví dụ «Lý do xóa phiên». */
  label: string;
  /** Số ký tự tối thiểu sau khi bỏ khoảng trắng; mặc định 1 (bắt buộc nhập). 0 = cho phép trống. */
  minLength?: number;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "danger" | "default";
  /** Ô nhập nhiều dòng (lý do dài). */
  multiline?: boolean;
};

type Result = { ok: boolean; value: string };

type Pending =
  | { kind: "confirm"; opts: ConfirmActionOptions; resolve: (r: Result) => void }
  | { kind: "prompt"; opts: PromptTextOptions; resolve: (r: Result) => void };

let root: Root | null = null;
let enqueue: ((p: Pending) => void) | null = null;
/** Lời gọi trước khi host kịp mount — host nhận hết khi mount. */
const preMount: Pending[] = [];

function ConfirmActionHost() {
  const [items, setItems] = React.useState<Pending[]>([]);
  const [typed, setTyped] = React.useState("");
  const current = items[0] ?? null;

  React.useEffect(() => {
    enqueue = (p) => setItems((xs) => [...xs, p]);
    if (preMount.length) {
      const early = preMount.splice(0, preMount.length);
      setItems((xs) => [...xs, ...early]);
    }
    return () => {
      enqueue = null;
    };
  }, []);

  React.useEffect(() => {
    if (current?.kind === "prompt") setTyped(current.opts.defaultValue ?? "");
    else setTyped("");
  }, [current]);

  const close = (ok: boolean) => {
    if (!current) return;
    current.resolve({ ok, value: typed });
    setItems((xs) => xs.slice(1));
  };

  if (!current) return null;

  const isPrompt = current.kind === "prompt";
  const confirmOpts = current.kind === "confirm" ? current.opts : null;
  const promptOpts = current.kind === "prompt" ? current.opts : null;
  const needText = confirmOpts?.requireText;
  const minLen = promptOpts ? Math.max(0, promptOpts.minLength ?? 1) : 0;
  const tooShort = isPrompt && typed.trim().length < minLen;
  const canConfirm = isPrompt ? !tooShort : !needText || typed.trim() === needText;
  const danger = ((current.opts.tone ?? (isPrompt ? "default" : "danger")) === "danger");
  const title = current.opts.title || (isPrompt ? "Nhập thông tin" : "Xác nhận thao tác");
  const message = current.opts.message;
  const inputClass =
    "w-full rounded-md border border-slate-300 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]";

  return (
    <Dialog open onOpenChange={(open) => !open && close(false)}>
      <DialogContent
        overlayClassName={cn(BV103_DIALOG_STACK.nestedOverlay, BV103_DIALOG_STACK.overlayDim)}
        className={cn(BV103_DIALOG_STACK.nestedContent, "max-w-md")}
        hideCloseButton
      >
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canConfirm) close(true);
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {message ? (
              <DialogDescription className="whitespace-pre-line text-sm text-slate-700">{message}</DialogDescription>
            ) : null}
          </DialogHeader>
          {promptOpts ? (
            <div className="grid gap-1.5">
              <label htmlFor="confirm-action-text" className="text-sm font-medium text-slate-700">
                {promptOpts.label}
              </label>
              {promptOpts.multiline ? (
                <textarea
                  id="confirm-action-text"
                  autoFocus
                  rows={3}
                  value={typed}
                  placeholder={promptOpts.placeholder}
                  onChange={(e) => setTyped(e.target.value)}
                  className={cn(inputClass, "py-2")}
                />
              ) : (
                <input
                  id="confirm-action-text"
                  autoFocus
                  autoComplete="off"
                  value={typed}
                  placeholder={promptOpts.placeholder}
                  onChange={(e) => setTyped(e.target.value)}
                  className={cn(inputClass, "h-11")}
                />
              )}
              {minLen > 1 ? (
                <p className={cn("text-xs", tooShort ? "text-amber-700" : "text-slate-500")}>
                  Tối thiểu {minLen} ký tự.
                </p>
              ) : null}
            </div>
          ) : null}
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
                className={cn(inputClass, "h-11 font-mono")}
              />
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => close(false)} autoFocus={!needText && !isPrompt}>
              {current.opts.cancelText || "Hủy"}
            </Button>
            <Button type="submit" variant={danger ? "destructive" : "default"} disabled={!canConfirm}>
              {current.opts.confirmText || "Đồng ý"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function open(p: Pending) {
  if (enqueue) {
    enqueue(p);
    return;
  }
  preMount.push(p);
  if (!root) {
    const el = document.createElement("div");
    el.setAttribute("data-confirm-action-host", "");
    document.body.appendChild(el);
    root = createRoot(el);
    root.render(<ConfirmActionHost />);
  }
}

/**
 * Thay `window.confirm`: hộp xác nhận chuẩn BV103, trả `true` khi người dùng đồng ý.
 * Tự gắn host vào `document.body` lần gọi đầu — không cần sửa layout.
 */
export function confirmAction(input: string | ConfirmActionOptions): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  const opts = typeof input === "string" ? { message: input } : input;
  return new Promise<boolean>((resolve) => open({ kind: "confirm", opts, resolve: (r) => resolve(r.ok) }));
}

/**
 * Thay `window.prompt`: hộp nhập chuẩn BV103 (dùng được trên điện thoại).
 * Trả chuỗi đã bỏ khoảng trắng hai đầu, hoặc `null` khi người dùng hủy. Nút xác nhận chỉ bật khi đủ `minLength`.
 */
export function promptText(opts: PromptTextOptions): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise<string | null>((resolve) =>
    open({ kind: "prompt", opts, resolve: (r) => resolve(r.ok ? r.value.trim() : null) }),
  );
}
