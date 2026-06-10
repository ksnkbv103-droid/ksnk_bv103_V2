// src/modules/cssd-erp/components/scan/WorkflowStationQrEntry.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, QrCode } from "lucide-react";
import type { CSSDWaitingItem } from "../../types/cssd.types";
import { CSSD_UI_ACTION_PRIMARY } from "../../shared/ui/cssd-ui-chrome";

type Props = {
  waitingItems: CSSDWaitingItem[];
  disabled?: boolean;
  onConfirm: (code: string) => void;
};

/** Ô quét QR + dropdown chọn bộ đang chờ tại trạm (khi máy quét hỏng). */
export default function WorkflowStationQrEntry({ waitingItems, disabled, onConfirm }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickId, setPickId] = useState("");

  useEffect(() => {
    if (!pickId) return;
    if (!waitingItems.some((x) => x.id === pickId)) setPickId("");
  }, [waitingItems, pickId]);

  const submitCode = (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code || disabled) return;
    onConfirm(code);
    if (inputRef.current) inputRef.current.value = "";
    setPickId("");
  };

  const handlePick = (id: string) => {
    setPickId(id);
    if (!id) return;
    const row = waitingItems.find((x) => x.id === id);
    if (!row?.ma_vach_qr) return;
    if (inputRef.current) inputRef.current.value = row.ma_vach_qr;
    submitCode(row.ma_vach_qr);
  };

  return (
    <div className="space-y-3">
      <div className="flex w-full items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-2">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          placeholder={disabled ? "Chọn trạm trước" : "Quét hoặc gõ mã QR bộ…"}
          autoCapitalize="characters"
          onKeyDown={(e) => {
            if (e.key === "Enter") submitCode(e.currentTarget.value);
          }}
          className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-800 outline-none transition-all placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => submitCode(inputRef.current?.value || "")}
          className={`${CSSD_UI_ACTION_PRIMARY} h-12 shrink-0 px-5 sm:px-6 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Xác nhận
        </button>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="cssd-waiting-qr-pick"
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
        >
          <QrCode size={12} className="text-[var(--primary)]" aria-hidden />
          Hoặc chọn bộ đang chờ ({waitingItems.length})
        </label>
        <div className="relative">
          <select
            id="cssd-waiting-qr-pick"
            value={pickId}
            disabled={disabled || waitingItems.length === 0}
            onChange={(e) => handlePick(e.target.value)}
            className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-4 pr-10 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">
              {waitingItems.length === 0 ? "— Không có bộ chờ tại trạm —" : "— Chọn mã QR trong danh sách chờ —"}
            </option>
            {waitingItems.map((item) => {
              const shortLabel = item.ma_vach_qr.startsWith("CATALOG::")
                ? `CAT:${item.ma_vach_qr.replace("CATALOG::", "").slice(0, 6)}…`
                : item.ma_vach_qr.length > 16
                  ? `${item.ma_vach_qr.slice(0, 8)}…${item.ma_vach_qr.slice(-4)}`
                  : item.ma_vach_qr;
              return (
                <option key={item.id} value={item.id}>
                  {item.ten_bo ? `${item.ten_bo} · ${shortLabel}` : shortLabel}
                </option>
              );
            })}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        </div>
        <p className="text-[11px] leading-snug text-slate-500">
          Dùng khi máy quét QR hỏng: chọn một dòng sẽ xác nhận xử lý ngay (cùng danh sách bên trái).
        </p>
      </div>
    </div>
  );
}
