"use client";

import React, { useEffect, useRef } from "react";
import { Scan } from "lucide-react";

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

  return (
    <div className="flex h-full min-h-[320px] flex-col rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <Scan className="text-[#026f17]" />
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Đưa bộ vào phiếu TK</h3>
      </div>
      <p className="mb-3 text-[11px] font-bold uppercase leading-relaxed text-slate-500">
        Chỉ quét bộ đang ở <span className="text-[#026f17]">ĐÓNG GÓI</span> và chưa gán mẻ khác. Sau khi{" "}
        <span className="text-red-600">xác nhận bắt đầu tiệt khuẩn</span> hệ thống khóa, không nạp thêm được.
      </p>
      <input
        ref={inputRef}
        disabled={napLocked}
        autoFocus={!napLocked}
        placeholder={napLocked ? "Đã chốt nạp — không quét thêm" : "Quét mã QR bộ dụng cụ..."}
        className="mb-4 h-16 w-full rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 px-6 text-lg font-black outline-none focus:border-[#026f17] disabled:cursor-not-allowed disabled:opacity-60"
        onKeyDown={(e) => {
          if (napLocked) return;
          if (e.key === "Enter") {
            onAddItemByCode(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
      />
      <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto pr-2">
        {items.map((it) => {
          const st = String(it.trang_thai_hien_tai || "").trim();
          const label =
            st === "TIET_KHUAN" ? "Đang TK" : st === "DONG_GOI" ? "Trong phiếu (chờ TK)" : st.replace(/_/g, " ");
          const tone =
            st === "TIET_KHUAN" ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-600";
          return (
            <div key={it.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="min-w-0">
                <span className="block truncate text-[10px] font-black uppercase text-[#026f17]">{it.ma_vach_qr}</span>
                <span className="text-xs font-bold uppercase text-slate-700">{it.bo?.ten_bo || "Bộ dụng cụ"}</span>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-black uppercase ${tone}`}>{label}</span>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="flex h-full items-center justify-center opacity-50">
            <p className="text-xs font-black uppercase tracking-widest">Chưa có dụng cụ trong phiếu</p>
          </div>
        )}
      </div>
    </div>
  );
}
