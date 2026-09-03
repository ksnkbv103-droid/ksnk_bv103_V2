"use client";

import React, { useState } from "react";
import { Camera } from "lucide-react";
import QrCameraModal from "./QrCameraModal";

type Props = {
  onScan: (code: string) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  label?: string;
};

/** Nút mở camera quét QR — dùng cạnh ô nhập mã trên mobile/tablet. */
export default function QrCameraButton({
  onScan,
  disabled,
  className = "",
  title = "Quét mã QR",
  label = "Quét QR",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={
          className?.trim() ||
          "inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-600 px-3 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
        }
        aria-label={label}
        title={title}
      >
        <Camera size={18} aria-hidden />
        <span className="hidden sm:inline">{label}</span>
      </button>
      <QrCameraModal
        open={open}
        onClose={() => setOpen(false)}
        onScan={onScan}
        title={title}
      />
    </>
  );
}
