"use client";

import { AlertTriangle } from "lucide-react";
import type { DashboardV4TopViPhamRow } from "../../strategic-dashboard-v4.types";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

type Props = {
  rows: DashboardV4TopViPhamRow[];
};

/** Dashboard thành phần 2 — Pareto tiêu chí Không đạt. */
export function GscDashboardTopViPhamPanel({ rows }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h3 className={`${D.sectionHeadingSm} flex items-center gap-2`}>
          <AlertTriangle className="text-rose-500" size={18} />
          Top 10 tiêu chí vi phạm
        </h3>
        <p className="text-[11px] text-slate-400 font-medium">Tần suất Không đạt trên Phần 2</p>
      </div>
      <div className="overflow-x-auto min-h-[250px]">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className={`border-b border-slate-100 ${D.tableHeader}`}>
              <th className="pb-2">Hạng</th>
              <th className="pb-2">Tiêu chí</th>
              <th className="pb-2 text-right">Lần</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center text-slate-400 font-normal">
                  Không có vi phạm trong kỳ.
                </td>
              </tr>
            ) : (
              rows.map((t, idx) => (
                <tr key={t.criterion_id} className="hover:bg-slate-50">
                  <td className="py-2.5">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                        idx === 0
                          ? "bg-rose-500 text-white"
                          : idx === 1
                            ? "bg-amber-500 text-white"
                            : idx === 2
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 max-w-[280px] truncate" title={t.criterion_label}>
                    {t.criterion_label}
                  </td>
                  <td className="py-2.5 text-right font-bold text-rose-600">{t.so_lan_vi_pham}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
