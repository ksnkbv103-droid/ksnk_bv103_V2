"use client";

import React, { useMemo } from "react";
import type {
  BaGridActiveIndex,
  BaGridCdhaCell,
  BaGridColumn,
  BaGridXnCell,
} from "../lib/nkbv-ba-grid-engine";
import type { BaAnalysisSessionDraft } from "../lib/nkbv-ba-analysis-session";
import type { SyndromePanelId } from "../lib/nkbv-specimen-syndrome";
import type { ViSinhAnalysisDispositionRow } from "../lib/nkbv-vi-sinh-analysis-status";
import type {
  OpenSiteSessionForSbap,
  PriorEventForDisposition,
} from "../lib/nkbv-index-event-disposition";
import { baCellToneClass } from "../lib/nkbv-ba-day-row-tone";
import { vaeEventPeriod } from "../lib/nkbv-shared-timeline";
import {
  BA_DAY_COL_W_ANALYSIS,
  type BaDayGridColumnDef,
} from "./NkbvBaDayGrid";
import NkbvBaConcludeCell from "./NkbvBaConcludeCell";

type Props = {
  panel: "VAE";
  columns: BaGridColumn[];
  index: BaGridActiveIndex | null;
  indexLabel?: string;
  draft: BaAnalysisSessionDraft;
  onDraftChange: (patch: Partial<BaAnalysisSessionDraft>) => void;
  allowedEdit: boolean;
  xn?: BaGridXnCell[];
  cdha?: BaGridCdhaCell[];
  analysisDispositions?: ViSinhAnalysisDispositionRow[];
  sampleConclusions?: import("../lib/nkbv-ba-sample-conclusions").BaSampleConclusion[];
  analysisMode?: import("../lib/nkbv-ba-analysis-mode").BaAnalysisMode;
  onManualSampleConclude?: (payload: {
    indexId: string;
    kind: "XN" | "CDHA";
    date: string;
    disposition: import("../lib/nkbv-ba-sample-conclusions").BaSampleConclusion["disposition"];
    label: string;
  }) => void;
  onManualSampleClear?: (payload: { indexId: string }) => void;
  priorEvents?: PriorEventForDisposition[];
  openSiteSessions?: OpenSiteSessionForSbap[];
  scrollRef?: (el: HTMLDivElement | null) => void;
  onScrollSync?: () => void;
  onClose: () => void;
  colW?: number;
  labelW?: number;
  children?: (api: { analysisColumns: BaDayGridColumnDef[] }) => React.ReactNode;
};

function isVaeClassLabel(label: string): boolean {
  const t = label.trim().toUpperCase();
  return t === "VAC" || t === "IVAC" || t === "PVAP" || /\b(VAC|IVAC|PVAP)\b/.test(t);
}

export default function NkbvSyndromeShellPanel({
  panel,
  columns,
  index,
  indexLabel,
  draft,
  onDraftChange,
  allowedEdit,
  xn = [],
  cdha = [],
  analysisDispositions = [],
  sampleConclusions = [],
  analysisMode = "CDC",
  onManualSampleConclude,
  onManualSampleClear,
  priorEvents = [],
  openSiteSessions = [],
  onClose,
  children,
}: Props) {
  void panel;
  void columns;
  const title = "VAE — Event Period (không IWP ±3)";
  const indexDate = index?.date.slice(0, 10) || null;
  /** DOE = draft.nsk (ngày xấu đi) hoặc Index khi chưa có. */
  const doe = (draft.nsk || indexDate || "").slice(0, 10) || null;
  const ep = useMemo(() => (doe ? vaeEventPeriod(doe) : null), [doe]);
  const aw = BA_DAY_COL_W_ANALYSIS;

  const xnByDate: Record<string, BaGridXnCell[]> = {};
  for (const x of xn) {
    const d = x.ngay.slice(0, 10);
    (xnByDate[d] ||= []).push(x);
  }
  const cdhaByDate: Record<string, BaGridCdhaCell[]> = {};
  for (const c of cdha) {
    const d = c.ngay.slice(0, 10);
    (cdhaByDate[d] ||= []).push(c);
  }

  const analysisColumns: BaDayGridColumnDef[] = [
    {
      id: "vae_index",
      header: "Index",
      minWidth: aw,
      cellClassName: (day) =>
        baCellToneClass(indexDate === day.date ? "index" : "none"),
      render: (day) =>
        indexDate === day.date ? (
          <span className="line-clamp-3 text-center text-[10px] font-semibold">
            {indexLabel || "Index"}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      id: "vae_ep",
      header: "Event Period",
      minWidth: aw,
      cellClassName: (day) => {
        if (!ep) return baCellToneClass("none");
        if (doe === day.date) return baCellToneClass("index");
        if (day.date >= ep.start && day.date <= ep.end) return baCellToneClass("iwp");
        return baCellToneClass("none");
      },
      render: (day) => {
        if (!ep) return <span className="text-slate-300">·</span>;
        if (doe === day.date) {
          return <span className="text-[10px] font-semibold">DOE</span>;
        }
        if (day.date >= ep.start && day.date <= ep.end) {
          return <span className="text-[9px] text-violet-800">EP</span>;
        }
        return <span className="text-slate-300">·</span>;
      },
    },
    {
      id: "vae_ket_luan",
      header: "Kết luận",
      minWidth: aw,
      cellClassName: (day) =>
        baCellToneClass(indexDate === day.date ? "index" : "none"),
      render: (day) => {
        const isIx = indexDate === day.date;
        return (
          <div className="flex flex-col gap-0.5">
            <NkbvBaConcludeCell
              date={day.date}
              xnOnDay={xnByDate[day.date] || []}
              cdhaOnDay={cdhaByDate[day.date] || []}
              priorEvents={priorEvents}
              openSiteSessions={openSiteSessions}
              analysisDispositions={analysisDispositions}
              sampleConclusions={sampleConclusions}
              progressiveLabel={null}
              allowedEdit={allowedEdit}
              analysisMode={analysisMode}
              onManualSampleConclude={onManualSampleConclude}
              onManualSampleClear={onManualSampleClear}
              onConclude={(payload) => {
                if (analysisMode === "MANUAL") return;
                onDraftChange({
                  ketLuan: payload.label,
                  eventDisposition: {
                    kind: payload.label.includes("thứ phát")
                      ? "SECONDARY_BSI"
                      : "BELONGS_PRIOR_EVENT",
                    label: payload.label,
                  },
                });
              }}
            />
            {isIx ? (
              <input
                className="w-full border-t border-amber-200/60 bg-transparent pt-0.5 text-[9px] font-semibold outline-none"
                value={draft.ketLuan}
                disabled={
                  !allowedEdit ||
                  (analysisMode !== "MANUAL" &&
                    (draft.eventDisposition?.kind === "BELONGS_PRIOR_EVENT" ||
                      draft.eventDisposition?.kind === "SECONDARY_BSI"))
                }
                placeholder={
                  analysisMode === "MANUAL"
                    ? "Gõ kết luận (VAC/IVAC/PVAP hoặc tự do)…"
                    : "VAC / IVAC / PVAP"
                }
                onChange={(e) => {
                  const ketLuan = e.target.value;
                  onDraftChange({
                    ketLuan,
                    eventEstablished:
                      analysisMode === "MANUAL"
                        ? Boolean(ketLuan.trim())
                        : isVaeClassLabel(ketLuan),
                  });
                }}
              />
            ) : null}
          </div>
        );
      },
    },
    {
      id: "vae_ghi_chu",
      header: "Ghi chú",
      minWidth: 72,
      render: (day) => (
        <input
          className="w-full bg-transparent text-[10px] outline-none"
          value={draft.notesByDate[day.date] || ""}
          disabled={!allowedEdit}
          onChange={(e) =>
            onDraftChange({
              notesByDate: { ...draft.notesByDate, [day.date]: e.target.value },
            })
          }
        />
      ),
    },
  ];

  return (
    <section className="mt-3 rounded-xl border border-violet-200 bg-violet-50/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-violet-950">{title}</h3>
          <p className="mt-0.5 text-[11px] text-violet-800">
            Index {indexDate || "—"}
            {indexLabel ? ` · ${indexLabel}` : ""}
            {doe ? ` · DOE ${doe}` : ""}
            {ep ? ` · EP ${ep.start} → ${ep.end}` : ""}
          </p>
          <p className="mt-1 text-[10px] text-violet-700/90">
            Ghi VAC / IVAC / PVAP ở kết luận Index để mở «Tạo phiếu» (bảng vent đầy đủ trên form).
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

      {typeof children === "function" ? (
        children({ analysisColumns })
      ) : (
        <p className="mt-2 text-[11px] text-amber-800">Thiếu slot bảng chung.</p>
      )}
    </section>
  );
}

export function isShellPanel(panel: SyndromePanelId): panel is "VAE" {
  return panel === "VAE";
}

/** Tạo phiếu VAE chỉ khi đã chọn lớp VAC/IVAC/PVAP trên lưới. */
export function vaeBaReadyToCreatePhieu(draft: BaAnalysisSessionDraft): boolean {
  return Boolean(draft.eventEstablished) || isVaeClassLabel(draft.ketLuan || "");
}
