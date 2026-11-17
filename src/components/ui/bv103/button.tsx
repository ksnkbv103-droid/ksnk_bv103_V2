import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Nút chuẩn BV103 (Lát 2, redesign UI). Cỡ sm 32 / md 40 / lg 48 (token --bv103-control-h-*),
 * bo 8px (--radius-control). Mỗi màn hình chỉ MỘT nút primary (màu --primary).
 * @see docs/ux/ui-redesign-plan.md §4.2, §4.5
 */
const base =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] bv103-type-body font-medium transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const variants = {
  primary: "bg-[var(--primary)] !text-white hover:bg-[var(--primary-hover)]",
  secondary: "border border-slate-300 bg-white !text-slate-800 hover:bg-slate-50",
  ghost: "bg-transparent !text-slate-700 hover:bg-slate-100",
  danger: "border border-red-300 bg-white !text-red-700 hover:bg-red-50",
} as const;

const sizes = {
  sm: "h-[var(--bv103-control-h-sm)] px-3",
  md: "h-[var(--bv103-control-h)] px-4",
  lg: "h-[var(--bv103-control-h-lg)] px-5",
} as const;

export type Bv103ButtonVariant = keyof typeof variants;
export type Bv103ButtonSize = keyof typeof sizes;

export interface Bv103ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Bv103ButtonVariant;
  size?: Bv103ButtonSize;
}

export const Bv103Button = React.forwardRef<HTMLButtonElement, Bv103ButtonProps>(
  ({ className, variant = "secondary", size = "md", type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  ),
);
Bv103Button.displayName = "Bv103Button";
