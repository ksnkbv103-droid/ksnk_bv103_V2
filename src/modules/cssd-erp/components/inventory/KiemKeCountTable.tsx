"use client";

import React from "react";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";
import type { KiemKeBoLine } from "../../actions/cssd-kiem-ke.actions";

const INPUT =
  "bv103-control-h w-20 rounded-[var(--radius-control)] border border-slate-200 bg-white px-2 text-center text-sm tabular-nums outline-none focus:border-[var(--primary)]/50";

export type KiemKeDraft = { dem: string; kho: string };

export function KiemKeCountTable({
  rows,
  drafts,
  onPatch,
}: {
  rows: { line: KiemKeBoLine; tonLoai: number | string }[];
  drafts: Record<string, KiemKeDraft>;
  onPatch: (loaiId: string, patch: Partial<KiemKeDraft>, line: KiemKeBoLine) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[52rem] border-collapse text-left text-sm text-slate-700">
        <thead className={L.theadRow}>
          <tr>
            <th className={L.th}>Mã loại</th>
            <th className={L.th}>Tên</th>
            <th className={`${L.th} text-center`}>Chuẩn</th>
            <th className={`${L.th} text-center`}>Tồn bộ</th>
            <th className={`${L.th} text-center`}>Số đếm bộ</th>
            <th className={`${L.th} text-center`}>Kho lẻ</th>
            <th className={`${L.th} text-center`}>Số đếm kho</th>
            <th className={`${L.th} text-center`}>Tổng loại</th>
          </tr>
        </thead>
        <tbody className={L.tbody}>
          {rows.map(({ line, tonLoai }) => {
            const draft = drafts[line.loaiDungCuId] || { dem: String(line.soLuongThucTe), kho: "" };
            return (
              <tr key={line.loaiDungCuId} className={L.row}>
                <td className={`${L.td} font-mono text-[11px]`}>{line.maLoai || "—"}</td>
                <td className={L.td}>{line.tenLoai}</td>
                <td className={`${L.td} text-center tabular-nums`}>{line.soLuongChuan}</td>
                <td className={`${L.td} text-center tabular-nums`}>{line.soLuongThucTe}</td>
                <td className={`${L.td} text-center`}>
                  <input
                    inputMode="numeric"
                    className={INPUT}
                    aria-label={`Số đếm bộ ${line.maLoai}`}
                    value={draft.dem}
                    onChange={(e) => onPatch(line.loaiDungCuId, { dem: e.target.value.replace(/[^\d]/g, "") }, line)}
                  />
                </td>
                <td className={`${L.td} text-center tabular-nums`}>{line.soLuongKho}</td>
                <td className={`${L.td} text-center`}>
                  <input
                    inputMode="numeric"
                    className={INPUT}
                    placeholder="Giữ"
                    aria-label={`Số đếm kho ${line.maLoai}`}
                    value={draft.kho}
                    onChange={(e) => onPatch(line.loaiDungCuId, { kho: e.target.value.replace(/[^\d]/g, "") }, line)}
                  />
                </td>
                <td className={`${L.td} text-center font-semibold tabular-nums`}>{tonLoai}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
