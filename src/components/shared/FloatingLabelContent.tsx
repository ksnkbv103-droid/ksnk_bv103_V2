import React from "react";

/** Nội dung ô chọn có nhãn nổi: rỗng = nhãn giữa ô; có giá trị = nhãn nhỏ trên, giá trị dưới. */
export default function FloatingLabelContent({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 leading-tight">
        {value ? (
          <>
            <span className="truncate text-xs font-medium text-slate-500">{label}</span>
            <span className="truncate font-semibold text-slate-900">{value}</span>
          </>
        ) : (
          <span className="truncate text-slate-500">{label}</span>
        )}
      </span>
      <ChevronDown />
    </>
  );
}

export function ChevronDown() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
