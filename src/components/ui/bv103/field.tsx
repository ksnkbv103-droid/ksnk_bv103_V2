import * as React from "react";
import { cn } from "@/lib/utils";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

/**
 * Nhãn + control + gợi ý/lỗi. `error` chỉ truyền sau khi người dùng chạm vào ô hoặc bấm lưu
 * (quy tắc §4.5) — component không tự quyết lúc nào hiện lỗi.
 */
export function Bv103Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={htmlFor} className={bv103LayoutChrome.labelBlock}>
        {label}
        {required ? <span className="ml-0.5 text-red-700">*</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p className="bv103-type-note mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

/** Ô nhập chuẩn (cao theo --bv103-control-h, bo 8px). */
export const Bv103Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(bv103LayoutChrome.controlInput, className)} {...props} />
  ),
);
Bv103Input.displayName = "Bv103Input";
