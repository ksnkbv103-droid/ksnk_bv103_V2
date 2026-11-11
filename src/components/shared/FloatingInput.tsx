"use client";

import React, { useId } from "react";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "placeholder"> & {
  /** Nhãn nổi trong ô: rỗng + không focus = giữa ô; có chữ hoặc focus = nhỏ phía trên. */
  label: string;
  /** Gợi ý chỉ hiện khi đang focus và ô rỗng. */
  hint?: string;
};

/** Ô nhập có nhãn nổi — cùng cao/bo/viền với ô chọn (`controlFloatingTrigger`). */
export default function FloatingInput({ label, hint, className = "", id, ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={`relative min-w-0 ${className}`}>
      <input
        id={inputId}
        placeholder={hint ?? " "}
        className={`${C.controlInput} peer px-3.5 pt-4 font-semibold text-slate-900 placeholder:font-normal placeholder:text-transparent focus:placeholder:text-slate-400`}
        {...rest}
      />
      <label
        htmlFor={inputId}
        className="pointer-events-none absolute left-3.5 top-1.5 text-xs font-medium leading-none text-slate-500 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-slate-500 peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-medium"
      >
        {label}
      </label>
    </div>
  );
}
