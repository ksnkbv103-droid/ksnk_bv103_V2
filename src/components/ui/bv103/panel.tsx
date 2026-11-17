import * as React from "react";
import { cn } from "@/lib/utils";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

/**
 * Lớp nội dung chuẩn: nền trắng, bóng nhẹ, không viền (`bv103-layer-panel`).
 * Không lồng Panel trong Panel — nhóm con dùng `PanelDivider` hoặc khoảng cách.
 */
export function Bv103Panel({
  className,
  padded = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return <div className={cn(bv103LayoutChrome.panelSurface, padded && "bv103-pad-panel", className)} {...props} />;
}

/** Nhóm trong panel: chỉ khoảng cách + vạch mảnh phía trên (`bv103-layer-inset`). */
export function Bv103PanelDivider({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(bv103LayoutChrome.panelInset, "pt-[var(--bv103-space-3)]", className)} {...props} />;
}

/** Tiêu đề khối: tên + mô tả ngắn (trái), nút hành động (phải). */
export function Bv103SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <h2 className="bv103-type-section">{title}</h2>
        {description ? <p className="bv103-type-label mt-0.5">{description}</p> : null}
      </div>
      {actions ? <div className="bv103-action-row">{actions}</div> : null}
    </div>
  );
}
