import React from "react";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
  required?: boolean;
  disabled?: boolean;
}

/** Ô nhập một dòng — dùng trong modal Bộ dụng cụ. */
export default function BoDungCuTextField({ label, value, onChange, type = "text", required, disabled }: Props) {
  return (
    <div className="space-y-1">
      <label className={`${C.labelField} ml-1`}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={C.controlInput}
      />
    </div>
  );
}
