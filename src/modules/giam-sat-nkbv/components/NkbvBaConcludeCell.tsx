"use client";

import React, { useMemo, useState } from "react";
import type { BaGridXnCell, BaGridCdhaCell } from "../lib/nkbv-ba-grid-engine";
import {
  resolveBelongsActiveSessionRit,
  resolveIndexEventDisposition,
  resolveInsufficientInLaterEventNote,
  type ActiveSessionRitContext,
  type IndexEventDisposition,
  type OpenSiteSessionForSbap,
  type PriorEventForDisposition,
} from "../lib/nkbv-index-event-disposition";
import {
  khongDuTcKetLuanLabel,
  resolveViSinhAnalysisStatus,
  bareViSinhIdFromMilestoneId,
  type ViSinhAnalysisDispositionRow,
} from "../lib/nkbv-vi-sinh-analysis-status";
import {
  findBaSampleConclusion,
  type BaSampleConclusion,
  type BaSampleConclusionDisposition,
} from "../lib/nkbv-ba-sample-conclusions";
import { resolveNkbvMajorType } from "../lib/nkbv-major-type";
import type { BaAnalysisMode } from "../lib/nkbv-ba-analysis-mode";
import { isManualAnalysisMode } from "../lib/nkbv-ba-analysis-mode";

function formatConcludeDetail(d: IndexEventDisposition): string {
  if (d.kind === "BELONGS_PRIOR_EVENT") {
    const doe = d.priorDoe.slice(0, 10);
    const [, m, day] = doe.split("-");
    const ddmm = `${Number(day)}/${Number(m)}`;
    return `Thuộc SK DOE ${ddmm} (${d.priorLoai})`;
  }
  if (d.kind === "SECONDARY_BSI") {
    return d.ketLuanLabel.replace(/^Nhiễm khuẩn huyết thứ phát/, "NKH thứ phát");
  }
  if (d.kind === "CLOSED_INSUFFICIENT") {
    return d.ketLuanLabel;
  }
  return "";
}

type ManualSavePayload = {
  indexId: string;
  kind: "XN" | "CDHA";
  date: string;
  disposition: BaSampleConclusionDisposition;
  label: string;
};

type Props = {
  date: string;
  xnOnDay: BaGridXnCell[];
  cdhaOnDay?: BaGridCdhaCell[];
  priorEvents: PriorEventForDisposition[];
  /** Phiên site đủ TC đang PT — rà SBAP trước Primary trên cột Kết luận. */
  openSiteSessions?: OpenSiteSessionForSbap[];
  analysisDispositions?: ViSinhAnalysisDispositionRow[];
  /** Kết luận đã chốt theo mẫu (local + DB) — luôn hiện khi PT Index khác. */
  sampleConclusions?: BaSampleConclusion[];
  /** Phiên đang PT — XN ∈ RIT cùng mẫu cấy → thuộc sự kiện này (chỉ khi đủ TC). */
  activeSessionRit?: ActiveSessionRitContext | null;
  /** Id đã bấm xác nhận trong phiên (draft.ritAttributedIds). */
  confirmedIds?: string[];
  /** Kết luận progressive khi đang phân tích Index ngày này (NEW). */
  progressiveLabel?: string | null;
  /** Không hiện kết luận RIT cho chính mẫu Index (đang phân tích). */
  excludeSampleId?: string | null;
  allowedEdit?: boolean;
  /** CDC = máy gợi ý; MANUAL = IP tự gắn nhãn. */
  analysisMode?: BaAnalysisMode;
  onConclude?: (payload: {
    indexId: string;
    kind: "XN" | "CDHA";
    date: string;
    label: string;
    /** Gắn RIT phiên hiện tại — không khóa tạo phiếu Index. */
    scope: "prior" | "session_rit" | "secondary";
  }) => void;
  /** MANUAL — lưu/xóa kết luận do IP nhập. */
  onManualSampleConclude?: (payload: ManualSavePayload) => void;
  onManualSampleClear?: (payload: { indexId: string }) => void;
};

type ManualRow = {
  id: string;
  kind: "XN" | "CDHA";
  hint: string;
};

/**
 * Ô Kết luận theo ngày — RIT (chỉ sự kiện đủ TC) / Secondary / không đủ TC + annotate.
 * Chế độ MANUAL: IP chọn/gõ nhãn, không chạy disposition CDC.
 */
export default function NkbvBaConcludeCell({
  date,
  xnOnDay,
  cdhaOnDay = [],
  priorEvents,
  openSiteSessions = [],
  analysisDispositions = [],
  sampleConclusions = [],
  activeSessionRit = null,
  confirmedIds = [],
  progressiveLabel,
  excludeSampleId = null,
  allowedEdit = true,
  analysisMode = "CDC",
  onConclude,
  onManualSampleConclude,
  onManualSampleClear,
}: Props) {
  const manual = isManualAnalysisMode(analysisMode);
  const confirmed = useMemo(() => new Set(confirmedIds.map(String)), [confirmedIds]);
  const [draftLabelById, setDraftLabelById] = useState<Record<string, string>>({});

  const manualRows = useMemo((): ManualRow[] => {
    if (!manual) return [];
    const out: ManualRow[] = [];
    for (const x of xnOnDay) {
      if (excludeSampleId && x.id === excludeSampleId) continue;
      out.push({
        id: x.id,
        kind: "XN",
        hint: [x.benh_pham, x.vi_khuan].filter(Boolean).join(" · ") || "XN",
      });
    }
    for (const c of cdhaOnDay) {
      if (excludeSampleId && c.id === excludeSampleId) continue;
      out.push({
        id: c.id,
        kind: "CDHA",
        hint: c.mo_ta_benh_ly || "CĐHA",
      });
    }
    return out;
  }, [manual, xnOnDay, cdhaOnDay, excludeSampleId]);

  const items = useMemo(() => {
    if (manual) return [];
    const out: Array<{
      id: string;
      kind: "XN" | "CDHA";
      buttonLabel: string;
      detail: string;
      annotate?: string | null;
      dispositionKind: "BELONGS_PRIOR_EVENT" | "SECONDARY_BSI" | "CLOSED_INSUFFICIENT";
      scope: "prior" | "session_rit" | "secondary" | "insufficient";
      confirmed: boolean;
      interactive: boolean;
    }> = [];

    for (const x of xnOnDay) {
      if (excludeSampleId && x.id === excludeSampleId) continue;

      const bare = bareViSinhIdFromMilestoneId(x.id) || x.id;
      const local = findBaSampleConclusion(sampleConclusions, x.id);
      const st =
        local?.disposition === "KHONG_DU_TC"
          ? ("KHONG_DU_TC" as const)
          : resolveViSinhAnalysisStatus(bare, analysisDispositions);
      const sampleMajor = resolveNkbvMajorType({ loai_benh_pham: x.benh_pham });
      const laterNote = resolveInsufficientInLaterEventNote({
        sampleId: x.id,
        sampleDate: x.ngay.slice(0, 10) || date,
        sampleMajor,
        analysisDispositions,
        activeSessionRit,
        priorEvents,
      });

      if (st === "KHONG_DU_TC") {
        out.push({
          id: x.id,
          kind: "XN",
          buttonLabel: "",
          detail: local?.label || khongDuTcKetLuanLabel(x.ngay),
          annotate: laterNote,
          dispositionKind: "CLOSED_INSUFFICIENT",
          scope: "insufficient",
          confirmed: true,
          interactive: false,
        });
        continue;
      }

      // Phủ quyết Secondary đã chốt trên mẫu — không mở / không hỏi lại khung BSI
      if (local?.disposition === "SECONDARY_BSI") {
        out.push({
          id: x.id,
          kind: "XN",
          buttonLabel: "",
          detail: local.label,
          dispositionKind: "SECONDARY_BSI",
          scope: "secondary",
          confirmed: true,
          interactive: false,
        });
        continue;
      }

      const sessionHit = resolveBelongsActiveSessionRit({
        sampleId: x.id,
        kind: "XN",
        active: activeSessionRit,
      });
      if (sessionHit) {
        out.push({
          id: x.id,
          kind: "XN",
          buttonLabel: confirmed.has(x.id) ? "Đã xác nhận" : "Xác nhận · Đã phân tích",
          detail: formatConcludeDetail(sessionHit),
          dispositionKind: "BELONGS_PRIOR_EVENT",
          scope: "session_rit",
          confirmed: confirmed.has(x.id),
          interactive: true,
        });
        continue;
      }

      const d = resolveIndexEventDisposition({
        indexId: x.id,
        indexDate: x.ngay.slice(0, 10) || date,
        specimenOrLabel: x.benh_pham,
        organism: x.vi_khuan,
        priorEvents,
        openSiteSessions,
        analysisDispositions,
      });
      if (d.kind === "CLOSED_INSUFFICIENT") {
        out.push({
          id: x.id,
          kind: "XN",
          buttonLabel: "",
          detail: formatConcludeDetail(d),
          annotate: laterNote,
          dispositionKind: "CLOSED_INSUFFICIENT",
          scope: "insufficient",
          confirmed: true,
          interactive: false,
        });
        continue;
      }
      if (d.kind === "BELONGS_PRIOR_EVENT" || d.kind === "SECONDARY_BSI") {
        out.push({
          id: x.id,
          kind: "XN",
          buttonLabel: confirmed.has(x.id) ? "Đã xác nhận" : "Đã phân tích",
          detail: formatConcludeDetail(d),
          dispositionKind: d.kind,
          scope: d.kind === "SECONDARY_BSI" ? "secondary" : "prior",
          confirmed: confirmed.has(x.id),
          interactive: true,
        });
      }
    }

    for (const c of cdhaOnDay) {
      if (excludeSampleId && c.id === excludeSampleId) continue;

      const localCdha = findBaSampleConclusion(sampleConclusions, c.id);
      if (localCdha?.disposition === "KHONG_DU_TC") {
        out.push({
          id: c.id,
          kind: "CDHA",
          buttonLabel: "",
          detail: localCdha.label || khongDuTcKetLuanLabel(c.ngay),
          dispositionKind: "CLOSED_INSUFFICIENT",
          scope: "insufficient",
          confirmed: true,
          interactive: false,
        });
        continue;
      }

      const sessionHit = resolveBelongsActiveSessionRit({
        sampleId: c.id,
        kind: "CDHA",
        active: activeSessionRit,
      });
      if (sessionHit) {
        out.push({
          id: c.id,
          kind: "CDHA",
          buttonLabel: confirmed.has(c.id) ? "Đã xác nhận" : "Xác nhận · Đã phân tích",
          detail: formatConcludeDetail(sessionHit),
          dispositionKind: "BELONGS_PRIOR_EVENT",
          scope: "session_rit",
          confirmed: confirmed.has(c.id),
          interactive: true,
        });
        continue;
      }

      const d = resolveIndexEventDisposition({
        indexId: c.id,
        indexDate: c.ngay.slice(0, 10) || date,
        specimenOrLabel: c.mo_ta_benh_ly || "XQ phổi",
        isImaging: true,
        priorEvents,
        openSiteSessions,
        analysisDispositions,
      });
      if (d.kind === "BELONGS_PRIOR_EVENT") {
        out.push({
          id: c.id,
          kind: "CDHA",
          buttonLabel: confirmed.has(c.id) ? "Đã xác nhận" : "Đã phân tích",
          detail: formatConcludeDetail(d),
          dispositionKind: d.kind,
          scope: "prior",
          confirmed: confirmed.has(c.id),
          interactive: true,
        });
      }
    }

    return out;
  }, [
    manual,
    xnOnDay,
    cdhaOnDay,
    date,
    priorEvents,
    openSiteSessions,
    analysisDispositions,
    sampleConclusions,
    activeSessionRit,
    confirmed,
    excludeSampleId,
  ]);

  if (manual) {
    if (!manualRows.length) {
      return <span className="text-slate-300">—</span>;
    }
    return (
      <div className="flex flex-col gap-1.5">
        {manualRows.map((row) => {
          const local = findBaSampleConclusion(sampleConclusions, row.id);
          const draft =
            draftLabelById[row.id] ??
            local?.label ??
            "";
          return (
            <div
              key={`${row.kind}-${row.id}`}
              className="rounded border border-violet-200 bg-violet-50 px-1 py-0.5 text-violet-950"
            >
              <span className="block bv103-type-label font-semibold leading-snug text-violet-800">
                {row.hint}
              </span>
              {local ? (
                <div className="mt-0.5 flex flex-col gap-0.5">
                  <span className="bv103-type-label font-semibold leading-snug">{local.label}</span>
                  {allowedEdit ? (
                    <button
                      type="button"
                      className="text-left bv103-type-label font-semibold text-violet-700 underline"
                      onClick={() => onManualSampleClear?.({ indexId: row.id })}
                    >
                      Xóa KL
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="mt-0.5 flex flex-col gap-0.5">
                  <input
                    type="text"
                    disabled={!allowedEdit}
                    value={draft}
                    placeholder="Gõ kết luận…"
                    className="w-full rounded border border-violet-200 bg-white px-1 py-0.5 bv103-type-label"
                    onChange={(e) =>
                      setDraftLabelById((prev) => ({
                        ...prev,
                        [row.id]: e.target.value,
                      }))
                    }
                  />
                  <div className="flex flex-wrap gap-0.5">
                    {(
                      [
                        ["MANUAL", "Lưu"],
                        ["KHONG_DU_TC", "Không đủ TC"],
                        ["SECONDARY_BSI", "Secondary"],
                      ] as const
                    ).map(([disp, btn]) => (
                      <button
                        key={disp}
                        type="button"
                        disabled={!allowedEdit || !String(draft).trim()}
                        className="rounded border border-violet-300 bg-white px-1 py-0.5 bv103-type-label font-semibold disabled:opacity-40"
                        onClick={() => {
                          const label =
                            disp === "KHONG_DU_TC" && !String(draft).trim()
                              ? khongDuTcKetLuanLabel(date)
                              : String(draft).trim();
                          if (!label) return;
                          onManualSampleConclude?.({
                            indexId: row.id,
                            kind: row.kind,
                            date,
                            disposition: disp,
                            label,
                          });
                          setDraftLabelById((prev) => {
                            const next = { ...prev };
                            delete next[row.id];
                            return next;
                          });
                        }}
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (!items.length && !progressiveLabel) {
    return <span className="text-slate-300">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((it) => (
        <div
          key={`${it.kind}-${it.id}`}
          className={`rounded border px-1 py-0.5 ${
            it.dispositionKind === "SECONDARY_BSI"
              ? "border-sky-300 bg-sky-50 text-sky-950"
              : it.dispositionKind === "CLOSED_INSUFFICIENT"
                ? "border-amber-300 bg-amber-50 text-amber-950"
                : it.confirmed
                  ? "border-emerald-500 bg-emerald-100 text-emerald-950"
                  : "border-emerald-300 bg-emerald-50 text-emerald-950"
          }`}
        >
          <button
            type="button"
            disabled={!allowedEdit || it.confirmed || !it.interactive}
            title={it.detail}
            onClick={() => {
              if (
                it.scope !== "prior" &&
                it.scope !== "session_rit" &&
                it.scope !== "secondary"
              ) {
                return;
              }
              onConclude?.({
                indexId: it.id,
                kind: it.kind,
                date,
                label: it.detail,
                scope: it.scope,
              });
            }}
            className="w-full text-left disabled:cursor-default"
          >
            {it.buttonLabel ? (
              <span className="block bv103-type-label font-semibold uppercase tracking-wide">
                {it.buttonLabel}
              </span>
            ) : null}
            <span
              className={`block bv103-type-label leading-snug ${
                it.dispositionKind === "CLOSED_INSUFFICIENT" ? "font-semibold" : ""
              }`}
            >
              {it.detail}
            </span>
            {it.annotate ? (
              <span className="mt-0.5 block bv103-type-label font-semibold leading-snug text-emerald-800">
                {it.annotate}
              </span>
            ) : null}
          </button>
        </div>
      ))}
      {progressiveLabel && !items.length ? (
        <span className="bv103-type-label leading-snug text-slate-600">{progressiveLabel}</span>
      ) : null}
    </div>
  );
}
