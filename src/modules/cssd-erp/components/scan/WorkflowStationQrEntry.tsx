// src/modules/cssd-erp/components/scan/WorkflowStationQrEntry.tsx
"use client";

import React, { useRef } from "react";
import { CSSD_UI_ACTION_PRIMARY } from "../../shared/ui/cssd-ui-chrome";
import QrScanInput from "@/components/shared/QrScanInput";
import { CssdQrLabelKindsNotice } from "../catalog/CssdQrLabelKindsNotice";

type Props = {
  disabled?: boolean;
  onConfirm: (code: string) => void;
};

/** Một ô quét: tiến đúng 1 bước theo trạng thái bộ. */
export default function WorkflowStationQrEntry({ disabled, onConfirm }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const submitCode = (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code || disabled) return;
    onConfirm(code);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <CssdQrLabelKindsNotice />
      <p className="text-[11px] font-medium text-slate-500">Quét mã hoặc bấm Xử lý trên hàng chờ.</p>

      <div className="flex w-full items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-2">
        <QrScanInput
          inputRef={inputRef}
          disabled={disabled}
          placeholder={disabled ? "Đang xử lý…" : "Quét hoặc gõ mã bộ"}
          cameraTitle="Quét QR bộ dụng cụ"
          onEnter={submitCode}
          onCameraScan={submitCode}
          className="min-w-0 flex-1"
          inputClassName="h-12 w-full min-w-0 touch-manipulation rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-800 outline-none transition-all placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => submitCode(inputRef.current?.value || "")}
          className={`${CSSD_UI_ACTION_PRIMARY} h-12 shrink-0 touch-manipulation px-5 sm:px-6 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Xác nhận
        </button>
      </div>
    </div>
  );
}
