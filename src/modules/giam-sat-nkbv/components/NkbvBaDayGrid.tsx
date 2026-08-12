"use client";

import React from "react";
import type { BaGridColumn } from "../lib/nkbv-ba-grid-engine";

/** Cột bằng chứng chính (XN / CĐHA / LS / RIT / SBAP / kết luận) — ưu tiên diện tích. */
export const BA_DAY_COL_W_COMMON = 108;
/** Cột phân tích bằng chứng. */
export const BA_DAY_COL_W_ANALYSIS = 118;
/** Date / Hos. Day sticky — hẹp tối đa. */
export const BA_DAY_COL_W_ID = 34;
/** Khoa / Can thiệp — hẹp. */
export const BA_DAY_COL_W_NARROW = 40;

/** @deprecated dùng BA_DAY_COL_W_COMMON */
export const BA_DAY_COL_W = BA_DAY_COL_W_COMMON;

export type BaDayGridColumnDef = {
  id: string;
  header: React.ReactNode;
  sticky?: boolean;
  stickyLeft?: number;
  render: (day: BaGridColumn, rowIndex: number) => React.ReactNode;
  minWidth?: number;
  /**
   * Nền ô theo cột (IWP chỉ cột IPW-LS, RIT chỉ cột RIT, …).
   * Không tô cả hàng.
   */
  cellClassName?: (day: BaGridColumn, rowIndex: number) => string;
};

type Props = {
  days: BaGridColumn[];
  columns: BaDayGridColumnDef[];
  className?: string;
  scrollRef?: (el: HTMLDivElement | null) => void;
  onScrollSync?: () => void;
  maxHeightClass?: string;
};

/**
 * Lưới dọc: hàng = ngày; cột cố định; sticky Date/Hos.Day; highlight theo ô/cột.
 */
export default function NkbvBaDayGrid({
  days,
  columns,
  className = "",
  scrollRef,
  onScrollSync,
  maxHeightClass = "max-h-[min(62vh,640px)]",
}: Props) {
  let stickyAccum = 0;
  const stickyOffsets = columns.map((c) => {
    if (!c.sticky) return undefined;
    const w = c.minWidth ?? BA_DAY_COL_W_COMMON;
    const left = c.stickyLeft ?? stickyAccum;
    stickyAccum += w;
    return left;
  });

  return (
    <div
      ref={scrollRef}
      onScroll={onScrollSync}
      className={`overflow-auto overscroll-contain border border-slate-200 text-[10px] ${maxHeightClass} ${className}`}
    >
      <table className="w-max min-w-full border-collapse">
        <thead className="sticky top-0 z-20">
          <tr className="bg-slate-100">
            {columns.map((c, i) => {
              const w = c.minWidth ?? BA_DAY_COL_W_COMMON;
              return (
                <th
                  key={c.id}
                  className={`border-b border-r border-slate-200 px-1 py-1 text-left text-[10px] font-bold leading-tight text-slate-700 ${
                    c.sticky ? "sticky z-30 bg-slate-100" : "bg-slate-100"
                  }`}
                  style={{
                    width: w,
                    minWidth: w,
                    maxWidth: w,
                    left: c.sticky ? stickyOffsets[i] : undefined,
                  }}
                >
                  {c.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {days.map((day, rowIndex) => (
            <tr key={day.date} className="hover:bg-slate-50/80">
              {columns.map((c, i) => {
                const w = c.minWidth ?? BA_DAY_COL_W_COMMON;
                const toneCls = c.cellClassName?.(day, rowIndex) || "bg-white";
                return (
                  <td
                    key={`${day.date}-${c.id}`}
                    className={`align-top border-b border-r border-slate-100 px-0.5 py-0.5 ${toneCls} ${
                      c.sticky ? `sticky z-10 ${toneCls}` : ""
                    }`}
                    style={{
                      width: w,
                      minWidth: w,
                      maxWidth: w,
                      left: c.sticky ? stickyOffsets[i] : undefined,
                    }}
                  >
                    {c.render(day, rowIndex)}
                  </td>
                );
              })}
            </tr>
          ))}
          {!days.length ? (
            <tr>
              <td
                colSpan={Math.max(columns.length, 1)}
                className="px-2 py-4 text-center text-slate-400"
              >
                Chưa có khung ngày
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function baDayIdentityColumns(): BaDayGridColumnDef[] {
  return [
    {
      id: "date",
      header: "Date",
      sticky: true,
      stickyLeft: 0,
      minWidth: BA_DAY_COL_W_ID,
      render: (day) => (
        <span className="text-[9px] font-semibold leading-tight text-slate-800">
          {day.label}
        </span>
      ),
    },
    {
      id: "hos_day",
      header: "HD",
      sticky: true,
      stickyLeft: BA_DAY_COL_W_ID,
      minWidth: BA_DAY_COL_W_ID,
      render: (day) => (
        <span className="tabular-nums text-[9px] text-slate-700">
          {day.hd == null ? "—" : day.hd}
        </span>
      ),
    },
  ];
}
