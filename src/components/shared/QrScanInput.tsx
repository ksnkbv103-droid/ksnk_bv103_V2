"use client";

import React, { useRef } from "react";
import QrCameraButton from "./QrCameraButton";

type Props = {
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
  inputClassName?: string;
  cameraTitle?: string;
  onEnter?: (code: string) => void;
  onCameraScan?: (code: string) => void;
};

/** Ô nhập mã QR kèm nút camera — dùng chung CSSD và báo sự cố. */
export default function QrScanInput({
  disabled,
  placeholder = "Quét hoặc gõ mã QR…",
  autoFocus,
  inputRef: externalRef,
  className = "",
  inputClassName = "",
  cameraTitle,
  onEnter,
  onCameraScan,
}: Props) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;

  const applyCode = (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code || disabled) return;
    if (inputRef.current) inputRef.current.value = code;
    onCameraScan?.(code);
    onEnter?.(code);
  };

  return (
    <div className={`flex w-full items-center gap-2 ${className}`}>
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        autoCapitalize="characters"
        onKeyDown={(e) => {
          if (e.key === "Enter") applyCode(e.currentTarget.value);
        }}
        className={
          inputClassName ||
          "h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-800 outline-none transition-all placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        }
      />
      <QrCameraButton
        disabled={disabled}
        title={cameraTitle}
        onScan={applyCode}
      />
    </div>
  );
}
