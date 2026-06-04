"use client";

import React from "react";
import { Beaker } from "lucide-react";
import type { CSSDHoaChat } from "../types/catalog.types";

export function CSSDCatalogHoaChatTab({ hoaChatRows }: { hoaChatRows: CSSDHoaChat[] }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase text-[#026f17] tracking-wider flex items-center gap-1.5">
          <Beaker size={16} /> Danh mục Hóa chất &amp; Vật tư ({hoaChatRows.length})
        </h3>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[520px] overflow-y-auto no-scrollbar p-1">
        {hoaChatRows.map((x) => (
          <div 
            key={x.id} 
            className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 hover:bg-white hover:shadow-md hover:border-emerald-100 transition-all flex flex-col justify-between"
          >
            <div>
              <span className="font-mono text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                {x.ma_hoa_chat || "UNNAMED"}
              </span>
              <h4 className="mt-2 text-xs font-bold text-slate-800 uppercase tracking-wide leading-tight line-clamp-2">
                {x.ten_hoa_chat || "—"}
              </h4>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-100/60 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
              <span>{x.loai_hoa_chat || "Vật tư"}</span>
              {x.don_vi_tinh && (
                <span className="bg-emerald-50 text-[#026f17] px-2 py-0.5 rounded-lg border border-emerald-100 font-black">
                  ĐVT: {x.don_vi_tinh}
                </span>
              )}
            </div>
          </div>
        ))}
        {hoaChatRows.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm font-medium text-slate-500">
            Không có dữ liệu hóa chất vật tư.
          </div>
        )}
      </div>
    </div>
  );
}
