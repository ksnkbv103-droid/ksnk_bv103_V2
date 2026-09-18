"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { isBv103PickerPortalTarget } from "@/lib/bv103-picker-portal"
import { BV103_DIALOG_STACK } from "@/lib/bv103-dialog-stack"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      `fixed inset-0 ${BV103_DIALOG_STACK.hubOverlay} bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0`,
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * SearchableSelect/MultiSelect portal ra `document.body` — cần chặn dismiss Dialog
 * khi tương tác ô tìm / danh sách (Radix coi đó là click ngoài).
 */
function preventDismissForPickerPortal(event: {
  target: EventTarget | null
  preventDefault: () => void
}) {
  if (isBv103PickerPortalTarget(event.target)) {
    event.preventDefault()
  }
}

/** Hủy bottom-sheet `max-sm:*` của DialogContent — hub lớn giữ centered trên mobile. */
export const dialogContentKeepCentered =
  "max-sm:!inset-x-auto max-sm:!left-[50%] max-sm:!right-auto max-sm:!bottom-auto max-sm:!top-[50%] max-sm:!translate-x-[-50%] max-sm:!translate-y-[-50%] max-sm:!rounded-b-[var(--radius-shell)] max-sm:!rounded-t-[var(--radius-shell)] max-sm:max-h-[min(92dvh,880px)] max-sm:!p-0 max-sm:!pb-0"

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /** Override overlay z-index when stacking above other portals (e.g. NKBV hub z-10040). */
  overlayClassName?: string
  /** Ẩn nút Đóng — chỉ khi luồng bắt buộc kết luận (hiếm). */
  hideCloseButton?: boolean
  closeButtonClassName?: string
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, overlayClassName, hideCloseButton = false, closeButtonClassName, onPointerDownOutside, onFocusOutside, onInteractOutside, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className={overlayClassName} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        `fixed left-[50%] top-[50%] ${BV103_DIALOG_STACK.hubContent} grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-200/90 bg-white p-6 shadow-[var(--shadow-app-soft)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[min(92dvh,720px)] max-sm:translate-x-0 max-sm:translate-y-0 max-sm:overflow-y-auto max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:p-4 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-[2rem]`,
        className
      )}
      onPointerDownOutside={(event) => {
        preventDismissForPickerPortal(event)
        onPointerDownOutside?.(event)
      }}
      onFocusOutside={(event) => {
        preventDismissForPickerPortal(event)
        onFocusOutside?.(event)
      }}
      onInteractOutside={(event) => {
        preventDismissForPickerPortal(event)
        onInteractOutside?.(event)
      }}
      {...props}
    >
      {children}
      {hideCloseButton ? null : (
        <DialogPrimitive.Close
          aria-label="Đóng"
          className={cn(
            "app-shell-focus absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/80 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none sm:right-4 sm:top-4",
            closeButtonClassName
          )}
        >
          <X className="h-5 w-5" aria-hidden />
          <span className="sr-only">Đóng</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
}
