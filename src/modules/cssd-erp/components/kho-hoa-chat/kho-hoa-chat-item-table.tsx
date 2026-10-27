"use client";

import React from "react";
import { isHoaChatLoai } from "@/lib/domain/cssd-hoa-chat-loai";
import type { DmStockSummary } from "@/lib/domain/cssd-kho-hoa-chat-summary";
import { formatDateVi } from "@/lib/format-datetime-vi";
import type { MoveMode } from "./kho-hoa-chat-move-sheet";

const BADGE = "bv103-type-label inline-flex items-center rounded border px-1.5 py-0.5 font-semibold";
const BTN = "bv103-type-label rounded-md border border-slate-200 px-2 py-0.5 font-semibold text-slate-700 hover:bg-slate-50";

type Props = {
  rows: DmStockSummary[];
  loading: boolean;
  canEdit: boolean;
  choDuyetByDm: ReadonlyMap<string, number>;
  onOpen: (dmId: string) => void;
  onMove: (mode: MoveMode, dmId: string) => void;
};

export default function KhoHoaChatItemTable({ rows, loading, canEdit, choDuyetByDm, onOpen, onMove }: Props) {
  if (loading) return <p className="bv103-type-label py-6 text-center text-slate-500">Đang tải...</p>;
  if (!rows.length) return <p className="bv103-type-label py-6 text-center text-slate-500">Không có mặt hàng phù hợp.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left">
        <thead className="bv103-type-label bg-slate-50 text-slate-500">
          <tr>
            <th className="px-3 py-2">Mặt hàng</th>
            <th className="px-3 py-2">Nhóm</th>
            <th className="px-3 py-2">Tồn</th>
            <th className="px-3 py-2">Định mức</th>
            <th className="px-3 py-2">Hạn gần nhất</th>
            <th className="px-3 py-2">Trạng thái</th>
            {canEdit ? <th className="px-3 py-2 text-right">Thao tác</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const cd = choDuyetByDm.get(r.id) ?? 0;
            return (
              <tr key={r.id} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => onOpen(r.id)}>
                <td className="bv103-type-label px-3 py-2 font-semibold text-slate-800">
                  <span className="font-mono text-[var(--primary)]">{r.ma_hoa_chat}</span> {r.ten_hoa_chat}
                </td>
                <td className="bv103-type-label px-3 py-2 text-slate-600">{isHoaChatLoai(r.loai_hoa_chat) ? "Hóa chất" : "Vật tư"}</td>
                <td className="bv103-type-label px-3 py-2 font-semibold tabular-nums">{r.tong_ton} {r.don_vi_tinh || ""}</td>
                <td className="bv103-type-label px-3 py-2 tabular-nums text-slate-600">{r.nguong_ton_toi_thieu ?? "—"}</td>
                <td className="bv103-type-label px-3 py-2 text-slate-600">{r.han_gan_nhat ? formatDateVi(r.han_gan_nhat) : "—"}</td>
                <td className="px-3 py-2">
                  <span className="flex flex-wrap gap-1">
                    {r.duoi_dinh_muc ? <span className={`${BADGE} border-red-200 bg-red-50 text-red-700`}>Dưới định mức</span> : null}
                    {r.qua_han ? <span className={`${BADGE} border-red-200 bg-red-50 text-red-700`}>Quá hạn</span> : null}
                    {r.sap_het_han ? <span className={`${BADGE} border-amber-200 bg-amber-50 text-amber-800`}>Sắp hết hạn</span> : null}
                    {cd ? <span className={`${BADGE} border-amber-200 bg-amber-50 text-amber-800`}>Chờ duyệt {cd}</span> : null}
                  </span>
                </td>
                {canEdit ? (
                  <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-flex items-center gap-1">
                      <button type="button" className={BTN} onClick={() => onMove("NHAP", r.id)}>Nhập</button>
                      <button type="button" className={BTN} onClick={() => onMove("XUAT", r.id)}>Xuất</button>
                      <details className="relative">
                        <summary className={`${BTN} cursor-pointer list-none`} aria-label="Thêm thao tác">⋯</summary>
                        <div className="absolute right-0 z-10 mt-1 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
                          <button type="button" className={`${BTN} whitespace-nowrap border-0`} onClick={() => onMove("DIEU", r.id)}>
                            Điều chỉnh
                          </button>
                        </div>
                      </details>
                    </span>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
