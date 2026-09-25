"use client";

/**
 * Ops detail pattern (UX principles §8): right sheet / full-height panel for primary
 * view·edit. Keep centered `Dialog` for confirm/destroy only.
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isBv103PickerPortalTarget } from "@/lib/bv103-picker-portal";
import { BV103_DIALOG_STACK } from "@/lib/bv103-dialog-stack";

function preventDismissForPickerPortal(event: {
  target: EventTarget | null;
  preventDefault: () => void;
}) {
  if (isBv103PickerPortalTarget(event.target)) {
    event.preventDefault();
  }
}

export type OpsDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Visible header title (also used for a11y). */
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
  titleId?: string;
};

export function OpsDetailSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
  titleId = "ops-detail-sheet-title",
}: OpsDetailSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            `fixed inset-0 ${BV103_DIALOG_STACK.hubOverlay} data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0`,
            BV103_DIALOG_STACK.overlayDim,
          )}
        />
        <DialogPrimitive.Content
          aria-labelledby={titleId}
          className={cn(
            `fixed inset-y-0 right-0 ${BV103_DIALOG_STACK.hubContent} flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden border-l border-slate-200/90 bg-white p-0 shadow-[var(--shadow-app-soft)] outline-none`,
            "sm:max-w-xl md:max-w-2xl lg:max-w-3xl",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            contentClassName,
          )}
          onPointerDownOutside={preventDismissForPickerPortal}
          onFocusOutside={preventDismissForPickerPortal}
          onInteractOutside={preventDismissForPickerPortal}
        >
          <header className="shrink-0 border-b border-slate-100 bg-white px-5 py-4 pr-14 sm:px-6">
            <DialogPrimitive.Title
              id={titleId}
              className="text-lg font-semibold tracking-tight text-slate-900"
            >
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-0.5 text-sm text-slate-500">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">
                Chi tiết thao tác
              </DialogPrimitive.Description>
            )}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
            {children}
          </div>

          {footer ? (
            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
              {footer}
            </div>
          ) : null}

          <DialogPrimitive.Close
            aria-label="Đóng"
            className="app-shell-focus absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/80 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none sm:right-4 sm:top-4"
          >
            <X className="h-5 w-5" aria-hidden />
            <span className="sr-only">Đóng</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
