"use client";

import React from "react";
import { Dialog, DialogContent, DialogTitle, dialogContentKeepCentered } from "@/components/ui/dialog";
import { quanTriFormChrome as F } from "../lib/quan-tri-form-chrome";
import { cn } from "@/lib/utils";
import { BV103_DIALOG_STACK } from "@/lib/bv103-dialog-stack";

const SIZE_CLASS = {
  sm: "max-w-md sm:max-w-md",
  md: "max-w-xl sm:max-w-xl",
  lg: "max-w-2xl sm:max-w-2xl",
  xl: "max-w-4xl sm:max-w-5xl",
} as const;

export type QuanTriFormDialogSize = keyof typeof SIZE_CLASS;

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** sm=md, md=xl, lg=2xl, xl=4xl/5xl — mặc định md. */
  size?: QuanTriFormDialogSize;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** Bọc body+footer trong <form>; không truyền thì dùng div. */
  onSubmit?: (e: React.FormEvent) => void;
  bodyClassName?: string;
};

/**
 * Shell Dialog MDM: header primary + body scroll + footer sticky CTA.
 * Cùng pattern NhanSuForm / Bo (max-h min(90dvh,880px)).
 */
export default function QuanTriFormDialogShell({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  children,
  footer,
  onSubmit,
  bodyClassName,
}: Props) {
  if (!open) return null;

  const body = (
    <>
      <div
        className={cn(
          "min-h-0 flex-1 space-y-[var(--bv103-space-3)] overflow-y-auto overscroll-contain px-6 py-5 sm:px-8",
          bodyClassName,
        )}
      >
        {children}
      </div>
      <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:px-8">
        {footer}
      </div>
    </>
  );

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className={cn(
          "flex max-h-[min(90dvh,880px)] flex-col gap-0 overflow-hidden p-0",
          SIZE_CLASS[size],
          (size === "lg" || size === "xl") && dialogContentKeepCentered,
          BV103_DIALOG_STACK.nestedContent,
        )}
        overlayClassName={BV103_DIALOG_STACK.nestedOverlay}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="shrink-0 bg-[var(--primary)] px-6 py-5 pr-14 text-white sm:px-8 sm:py-6">
          <h3 className={F.modalTitle}>{title}</h3>
          {subtitle ? <p className={F.modalSubtitle}>{subtitle}</p> : null}
        </div>
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            {body}
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">{body}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
