"use client";

import type { MomentWhoRow } from "./vst-dashboard-panel-derive";
import { formatPctOneDecimal } from "./vst-dashboard-math";

/** Bảng một: 5 thời điểm WHO — cột bỏ sót + tuân thủ (cùng cách tách dấu phẩy như RPC). */
export function MomentWhoMergedTable({ rows, hint }: { rows: MomentWhoRow[]; hint?: string }) {
  const totalBoSot = rows.reduce((s, r) => s + r.n_bo_sot, 0);
  const totalDat = rows.reduce((s, r) => s + r.n_dat, 0);

  return (
    <div>
      {hint ? <p className="mb-3 text-[11px] text-slate-500 leading-snug">{hint}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-100/90 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <th className="px-3 py-3 text-left" rowSpan={2}>
                Thời điểm (WHO)
              </th>
              <th className="px-3 py-2 text-center text-red-600 border-l border-slate-200" colSpan={2}>
                Bỏ sót
              </th>
              <th className="px-3 py-2 text-center text-[#026f17] border-l border-slate-200" colSpan={2}>
                Tuân thủ
              </th>
            </tr>
            <tr className="bg-slate-50/90 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <th className="px-3 py-2 text-center text-red-600 border-l border-slate-200">Số lần</th>
              <th className="px-3 py-2 text-center text-red-600">Tỉ lệ</th>
              <th className="px-3 py-2 text-center text-[#026f17] border-l border-slate-200">Số lần</th>
              <th className="px-3 py-2 text-center text-[#026f17]">Tỉ lệ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((m) => (
              <tr key={m.ten} className="hover:bg-slate-50/50">
                <td className="px-3 py-3 font-bold text-slate-700">{m.ten}</td>
                <td className="px-3 py-3 text-center font-semibold tabular-nums text-red-600 border-l border-slate-100">
                  {m.n_bo_sot}
                </td>
                <td className="px-3 py-3 text-center font-black tabular-nums text-red-600">
                  {formatPctOneDecimal(m.ty_le_bo_sot)}
                </td>
                <td className="px-3 py-3 text-center font-semibold tabular-nums text-[#026f17] border-l border-slate-100">
                  {m.n_dat}
                </td>
                <td className="px-3 py-3 text-center font-black tabular-nums text-[#026f17]">
                  {formatPctOneDecimal(m.ty_le_tuan_thu)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50/90 text-xs text-slate-600">
              <td className="px-3 py-3 font-bold">Tổng (lượt ghi nhận theo mốc)</td>
              <td className="px-3 py-3 text-center font-black tabular-nums text-red-600 border-l border-slate-200">
                {totalBoSot}
              </td>
              <td className="px-3 py-3 text-center font-black tabular-nums text-red-600">
                {totalBoSot > 0 ? "100%" : "—"}
              </td>
              <td className="px-3 py-3 text-center font-black tabular-nums text-[#026f17] border-l border-slate-200">
                {totalDat}
              </td>
              <td className="px-3 py-3 text-center font-black tabular-nums text-[#026f17]">
                {totalDat > 0 ? "100%" : "—"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
