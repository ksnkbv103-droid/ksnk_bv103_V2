"use client";

import { cn } from "@/lib/utils";

export type MdmActiveToggleProps = {
  active: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/** Công tắc Tắt/Bật dùng chung cho danh mục quản trị (bảng + form). */
export function MdmActiveToggle({
  active,
  onToggle,
  disabled = false,
  size = "sm",
  className,
}: MdmActiveToggleProps) {
  const interactive = Boolean(onToggle) && !disabled;
  const sizing = size === "sm" ? "h-[28px] min-w-[148px]" : "h-[34px] min-w-[168px]";
  const textSize = size === "sm" ? "text-[11px]" : "text-[10px]";

  const track = cn(
    "inline-flex shrink-0 select-none items-center gap-0.5 rounded-lg bg-slate-100/95 p-[3px] ring-1 ring-slate-200/90 [-webkit-tap-highlight-color:transparent]",
    sizing,
    interactive && "cursor-pointer touch-manipulation app-shell-focus hover:ring-slate-300",
    disabled && "opacity-65",
    !interactive && "cursor-default",
    className,
  );

  const left = cn(
    "flex min-w-0 flex-1 items-center justify-center rounded-md px-1 py-1 font-semibold uppercase tracking-wide transition-colors duration-150",
    textSize,
    !active
      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/75"
      : "text-slate-500",
  );
  const right = cn(
    "flex min-w-0 flex-1 items-center justify-center rounded-md px-1 py-1 font-semibold uppercase tracking-wide transition-colors duration-150",
    textSize,
    active
      ? "bg-[var(--primary)] text-white shadow-sm ring-1 ring-black/10"
      : "text-slate-500",
  );

  if (interactive) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={active ? "Đang hoạt động — nhấn để chuyển sang không hoạt động" : "Đang không hoạt động — nhấn để bật"}
        className={track}
        onClick={() => onToggle?.()}
      >
        <span className={left}>Tắt</span>
        <span className={right}>Bật</span>
      </button>
    );
  }

  return (
    <div
      role="status"
      aria-label={active ? "Trạng thái: đang hoạt động" : "Trạng thái: đang không hoạt động"}
      className={track}
    >
      <span className={left}>Tắt</span>
      <span className={right}>Bật</span>
    </div>
  );
}

const defaultFormFootnote = "Khi Tắt, mục thường không còn trong lựa chọn mặc định.";

/** Khối trường form: nhãn + công tắc đồng bộ với bảng. */
export function MdmFormActiveToggleRow({
  active,
  onChange,
  footnote,
  disabled = false,
}: {
  active: boolean;
  onChange: (next: boolean) => void;
  /** Ghi chú ngắn dưới công tắc (mặc định theo DM). */
  footnote?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Trạng thái hoạt động</div>
      <MdmActiveToggle
        active={active}
        onToggle={disabled ? undefined : () => onChange(!active)}
        disabled={disabled}
        size="md"
      />
      <p className="text-[11px] leading-relaxed text-slate-500">{footnote ?? defaultFormFootnote}</p>
    </div>
  );
}
