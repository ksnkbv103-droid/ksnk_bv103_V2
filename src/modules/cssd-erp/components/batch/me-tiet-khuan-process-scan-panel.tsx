"use client";

import {
  CSSD_UI_ACTION_PRIMARY,
  CSSD_UI_PANEL_CHROME as UI,
} from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

import React, { useEffect, useRef } from "react";
import { CheckCircle2, Scan } from "lucide-react";
import QrScanInput from "@/components/shared/QrScanInput";
import InlineEntityQrThumb from "@/components/shared/InlineEntityQrThumb";

export type MeTkItemRow = {
  id: string;
  ma_vach_qr?: string;
  bo?: { ten_bo?: string | null };
  trang_thai_hien_tai?: string;
};

export default function MeTietKhuanProcessScanPanel({
  items,
  onAddItemByCode,
  napLocked,
  prefillToken,
  onPrefillConsumed,
}: {
  items: MeTkItemRow[];
  onAddItemByCode: (code: string) => void;
  napLocked: boolean;
  prefillToken?: string;
  onPrefillConsumed?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = String(prefillToken || "").trim();
    if (!raw || !inputRef.current) return;
    const pipe = raw.indexOf("|");
    const code = pipe >= 0 ? raw.slice(pipe + 1) : raw;
    if (!code.trim()) return;
    inputRef.current.value = code.trim();
    inputRef.current.focus();
    onPrefillConsumed?.();
  }, [prefillToken, onPrefillConsumed]);

  const submitCurrent = () => {
    if (napLocked) return;
    const code = String(inputRef.current?.value || "").trim();
    if (!code) return;
    onAddItemByCode(code);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={`flex h-full min-h-[280px] flex-col bv103-pad-panel ${UI.shell}`}>
      <div className="mb-3 flex items-center gap-2">
        <Scan className="text-[var(--primary)]" />
        <h3 className={UI.panelTitle}>Đưa bộ vào phiếu TK</h3>
      </div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <QrScanInput
          inputRef={inputRef}
          disabled={napLocked}
          autoFocus={!napLocked}
          placeholder={napLocked ? "Đã chốt nạp — không quét thêm" : "Quét mã QR bộ dụng cụ..."}
          cameraTitle="Quét QR bộ vào mẻ tiệt khuẩn"
          className="min-w-0 flex-1"
          inputClassName="bv103-control-h w-full rounded-[var(--radius-control)] border border-emerald-200 bg-emerald-50/40 px-3 text-sm font-semibold uppercase outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 disabled:cursor-not-allowed disabled:opacity-60"
          onEnter={submitCurrent}
          onCameraScan={(code) => {
            if (napLocked) return;
            onAddItemByCode(code);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        <button
          type="button"
          disabled={napLocked}
          onClick={submitCurrent}
          className={`${CSSD_UI_ACTION_PRIMARY} h-auto min-h-[var(--control-h,2.5rem)] shrink-0 px-5`}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Xác nhận
        </button>
      </div>
      <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto pr-2">
        {items.map((it) => {
          const st = String(it.trang_thai_hien_tai || "").trim();
          const label =
            st === "TIET_KHUAN" ? "Đang TK" : st === "DONG_GOI" ? "Trong phiếu (chờ TK)" : st.replace(/_/g, " ");
          const tone =
            st === "TIET_KHUAN" ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-600";
          const code = String(it.ma_vach_qr || "").trim();
          return (
            <div key={it.id} className="flex items-center justify-between gap-2 rounded-[var(--radius-shell)] border border-slate-100 bg-slate-50 p-2.5">
              <div className="flex min-w-0 items-center gap-2">
                {code ? <InlineEntityQrThumb code={code} size={36} /> : null}
                <div className="min-w-0">
                  <span className="block truncate font-mono text-[11px] font-medium text-[var(--primary)]">
                    {code || "—"}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">{it.bo?.ten_bo || "Bộ dụng cụ"}</span>
                </div>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${tone}`}>
                {label}
              </span>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="flex h-full items-center justify-center opacity-50">
            <p className="text-xs font-semibold uppercase tracking-wide">Chưa có dụng cụ trong phiếu</p>
          </div>
        )}
      </div>
    </div>
  );
}
