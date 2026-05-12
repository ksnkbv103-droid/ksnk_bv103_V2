"use client";

import type { CSSDHoaChat } from "../types/catalog.types";

export function CSSDCatalogHoaChatTab({ hoaChatRows }: { hoaChatRows: CSSDHoaChat[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <h3 className="mb-3 text-xs font-black uppercase text-[#026f17]">Hóa chất vật tư ({hoaChatRows.length})</h3>
      <div className="max-h-[520px] overflow-auto space-y-2">
        {hoaChatRows.map((x) => (
          <div key={x.id} className="rounded-xl border border-slate-100 p-3">
            <p className="text-[10px] font-black text-slate-400">{x.ma_hoa_chat || "—"}</p>
            <p className="text-sm font-bold text-slate-800">{x.ten_hoa_chat || "—"}</p>
            <p className="text-[10px] text-slate-500">
              Loại: {x.loai_hoa_chat || "—"} {x.don_vi_tinh ? `· ĐVT: ${x.don_vi_tinh}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
