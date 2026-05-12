"use client";

import React from "react";
import { Scan } from "lucide-react";

export type MeTkItemRow = { id: string; ma_vach_qr?: string; bo?: { ten_bo?: string } };

export default function MeTietKhuanProcessScanPanel({
  items,
  onAddItemByCode,
}: {
  items: MeTkItemRow[];
  onAddItemByCode: (code: string) => void;
}) {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col h-[600px]">
      <div className="mb-4 flex items-center gap-3">
        <Scan className="text-[#026f17]" />
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">2. Đưa bộ vào phiếu TK</h3>
      </div>
      <p className="mb-3 text-[9px] font-bold uppercase leading-relaxed text-slate-500">
        Chỉ quét bộ đang ở <span className="text-[#026f17]">ĐÓNG GÓI</span> (sau khi đã tạo phiếu mẻ tại bước trên). Bộ
        &quot;tiệt khuẩn&quot; mà chưa có <span className="text-red-600">phiếu mẻ trên hệ thống</span> sẽ bị từ chối —
        không quét TK từ trang 6 trạm.
      </p>
      <input
        autoFocus
        placeholder="Quét mã QR bộ dụng cụ..."
        className="mb-4 h-16 w-full rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 px-6 text-lg font-black outline-none focus:border-[#026f17]"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onAddItemByCode(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
      />
      <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto pr-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase text-[#026f17]">{it.ma_vach_qr}</span>
              <span className="text-xs font-bold uppercase text-slate-700">{it.bo?.ten_bo || "Bộ dụng cụ"}</span>
            </div>
            <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-600">
              Trong mẻ
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <div className="h-full flex items-center justify-center opacity-50">
            <p className="text-xs font-black uppercase tracking-widest">Chưa có dụng cụ</p>
          </div>
        )}
      </div>
    </div>
  );
}
