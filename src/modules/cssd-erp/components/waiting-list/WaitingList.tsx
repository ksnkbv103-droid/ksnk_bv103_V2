// src/modules/cssd-erp/components/waiting-list/WaitingList.tsx
"use client";

import React from "react";
import { QrCode, Clock } from "lucide-react";
import { CSSDWaitingItem } from "../../types/cssd.types";

interface Props {
  items: CSSDWaitingItem[];
  onAction: (maQR: string) => void;
}

export default function WaitingList({ items, onAction }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <Clock size={14} className="text-[#026f17]" /> Đang chờ xử lý ({items.length})
      </h2>
      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm divide-y divide-slate-50 max-h-[300px] overflow-y-auto custom-scrollbar">
        {items.length > 0 ? items.map((item) => (
          <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#026f17]/5 flex items-center justify-center text-[#026f17]">
                <QrCode size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-700">{item.ma_vach_qr}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Cập nhật: {new Date(item.updated_at).toLocaleTimeString()}</p>
              </div>
            </div>
            <button 
              onClick={() => onAction(item.ma_vach_qr)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-blue-100"
            >
              Xử lý ngay
            </button>
          </div>
        )) : (
          <div className="py-12 text-center text-slate-300">
            <Clock size={32} className="mx-auto mb-2 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-widest italic">Trống</p>
          </div>
        )}
      </div>
    </div>
  );
}
