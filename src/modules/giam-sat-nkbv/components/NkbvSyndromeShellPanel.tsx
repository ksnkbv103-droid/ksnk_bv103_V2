"use client";

import React from "react";
import type { BaGridActiveIndex, BaGridColumn } from "../lib/nkbv-ba-grid-engine";
import type { BaAnalysisSessionDraft } from "../lib/nkbv-ba-analysis-session";
import type { SyndromePanelId } from "../lib/nkbv-specimen-syndrome";

type Props = {
  panel: "VAE";
  columns: BaGridColumn[];
  index: BaGridActiveIndex | null;
  indexLabel?: string;
  draft: BaAnalysisSessionDraft;
  onDraftChange: (patch: Partial<BaAnalysisSessionDraft>) => void;
  allowedEdit: boolean;
  scrollRef?: (el: HTMLDivElement | null) => void;
  onScrollSync?: () => void;
  onClose: () => void;
  colW?: number;
  labelW?: number;
};

/**
 * Shell VAE — cùng trục cột với bảng chung; Event Period đầy đủ = Wave 2.
 * SSI đã có NkbvSyndromeSsiPanel (timeline chuẩn).
 */
export default function NkbvSyndromeShellPanel({
  panel,
  columns,
  index,
  indexLabel,
  draft,
  onDraftChange,
  allowedEdit,
  scrollRef,
  onScrollSync,
  onClose,
  colW = 100,
  labelW = 128,
}: Props) {
  const title = "VAE — Event Period (không IWP)";
  const windowLabel = "Event Period";
  const indexDate = index?.date.slice(0, 10) || null;
  void panel;

  return (
    <section className="mt-3 rounded-xl border border-violet-200 bg-violet-50/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-violet-950">{title}</h3>
          <p className="mt-0.5 text-[11px] text-violet-800">
            Index {indexDate || "—"}
            {indexLabel ? ` · ${indexLabel}` : ""} · Wave này: đủ hàng Index / kết luận / ghi chú —
            thuật toán PEEP đầy đủ Wave 2.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-2 py-1 text-[11px] font-semibold text-violet-800 hover:bg-violet-100"
        >
          Đóng bảng
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScrollSync}
        className="mt-3 overflow-x-auto overscroll-contain border border-violet-100 bg-white text-[10px]"
      >
        <div style={{ minWidth: labelW + Math.max(columns.length, 1) * colW }}>
          <ShellRow label="Ngày lịch" labelW={labelW}>
            {columns.map((c) => (
              <div
                key={`d-${c.date}`}
                className="flex shrink-0 items-center justify-center border-b border-r bg-slate-50 font-semibold"
                style={{ width: colW, minWidth: colW, minHeight: 26 }}
              >
                {c.label}
              </div>
            ))}
          </ShellRow>
          <ShellRow label="Ngày (HD)" labelW={labelW}>
            {columns.map((c) => (
              <div
                key={`hd-${c.date}`}
                className="flex shrink-0 items-center justify-center border-b border-r"
                style={{ width: colW, minWidth: colW, minHeight: 22 }}
              >
                {c.hd == null ? "—" : c.hd}
              </div>
            ))}
          </ShellRow>
          <ShellRow label="Index XN / CĐHA" labelW={labelW}>
            {columns.map((c) => {
              const isIx = indexDate === c.date;
              return (
                <div
                  key={`ix-${c.date}`}
                  className={`flex shrink-0 items-center justify-center border-b border-r p-0.5 ${
                    isIx ? "bg-violet-100 font-semibold text-violet-950" : "bg-white"
                  }`}
                  style={{ width: colW, minWidth: colW, minHeight: 40 }}
                >
                  {isIx ? (
                    <span className="line-clamp-3 text-center text-[9px]">
                      {indexLabel || "Index"}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </div>
              );
            })}
          </ShellRow>
          <ShellRow label={windowLabel} labelW={labelW}>
            {columns.map((c) => (
              <div
                key={`w-${c.date}`}
                className={`flex shrink-0 items-center justify-center border-b border-r ${
                  indexDate === c.date ? "bg-violet-50 text-violet-800" : "bg-white text-slate-300"
                }`}
                style={{ width: colW, minWidth: colW, minHeight: 24 }}
              >
                {indexDate === c.date ? "DOE?" : "·"}
              </div>
            ))}
          </ShellRow>
          <ShellRow label="Kết luận" labelW={labelW}>
            {columns.map((c) => {
              const isIx = indexDate === c.date;
              return (
                <div
                  key={`kl-${c.date}`}
                  className={`flex shrink-0 items-center border-b border-r px-0.5 ${isIx ? "bg-amber-50" : "bg-white"}`}
                  style={{ width: colW, minWidth: colW, minHeight: 36 }}
                >
                  {isIx ? (
                    <input
                      className="w-full bg-transparent text-center text-[9px] font-semibold outline-none"
                      value={draft.ketLuan}
                      disabled={!allowedEdit}
                      placeholder="VAC/IVAC/PVAP"
                      onChange={(e) => onDraftChange({ ketLuan: e.target.value })}
                    />
                  ) : (
                    <span className="w-full text-center text-slate-300">—</span>
                  )}
                </div>
              );
            })}
          </ShellRow>
          <ShellRow label="Ghi chú" labelW={labelW}>
            {columns.map((c) => (
              <div
                key={`gc-${c.date}`}
                className="flex shrink-0 items-center border-b border-r bg-white p-0.5"
                style={{ width: colW, minWidth: colW, minHeight: 28 }}
              >
                <input
                  className="w-full bg-transparent text-center text-[10px] outline-none"
                  value={draft.notesByDate[c.date] || ""}
                  disabled={!allowedEdit}
                  onChange={(e) =>
                    onDraftChange({
                      notesByDate: { ...draft.notesByDate, [c.date]: e.target.value },
                    })
                  }
                />
              </div>
            ))}
          </ShellRow>
        </div>
      </div>
    </section>
  );
}

function ShellRow({
  label,
  labelW,
  children,
}: {
  label: string;
  labelW: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center border-b border-r bg-violet-50/80 px-1 font-semibold text-violet-800"
        style={{ width: labelW, minWidth: labelW }}
      >
        <span className="truncate">{label}</span>
      </div>
      {children}
    </div>
  );
}

export function isShellPanel(p: SyndromePanelId): p is "VAE" {
  return p === "VAE";
}
