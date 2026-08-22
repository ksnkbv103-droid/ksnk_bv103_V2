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
  /** Lọc khi gõ (tên/mã) — không ép IN HOA. */
  value?: string;
  onChange?: (value: string) => void;
};

/** Một ô: gõ tên/mã hoặc quét QR (camera + Enter). */
export default function QrScanInput({
  disabled,
  placeholder = "Tìm tên, mã hoặc quét QR…",
  autoFocus,
  inputRef: externalRef,
  className = "",
  inputClassName = "",
  cameraTitle,
  onEnter,
  onCameraScan,
  value,
  onChange,
}: Props) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;
  const controlled = value !== undefined;

  const commit = (raw: string, source: "enter" | "camera") => {
    const code = raw.trim();
    if (!code || disabled) return;
    if (controlled) onChange?.(code);
    else if (inputRef.current) inputRef.current.value = code.toUpperCase();
    if (source === "camera") (onCameraScan ?? onEnter)?.(code);
    else onEnter?.(code);
  };

  return (
    <div className={`flex w-full items-center gap-2 ${className}`}>
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize={controlled ? "none" : "characters"}
        value={controlled ? value : undefined}
        onChange={controlled ? (e) => onChange?.(e.target.value) : undefined}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          commit(e.currentTarget.value, "enter");
        }}
        className={
          inputClassName ||
          `h-12 w-full touch-manipulation rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:font-normal placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 ${
            controlled ? "" : "uppercase"
          }`
        }
      />
      <QrCameraButton
        disabled={disabled}
        title={cameraTitle}
        onScan={(code) => commit(code, "camera")}
      />
    </div>
  );
}
