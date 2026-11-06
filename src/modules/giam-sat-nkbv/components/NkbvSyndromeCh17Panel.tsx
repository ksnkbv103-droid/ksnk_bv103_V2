"use client";

import React, { useEffect, useMemo, useState } from "react";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import type {
  BaGridActiveIndex,
  BaGridCdhaCell,
  BaGridColumn,
  BaGridXnCell,
} from "../lib/nkbv-ba-grid-engine";
import type { BaAnalysisSessionDraft } from "../lib/nkbv-ba-analysis-session";
import type { ViSinhAnalysisDispositionRow } from "../lib/nkbv-vi-sinh-analysis-status";
import type {
  OpenSiteSessionForSbap,
  PriorEventForDisposition,
} from "../lib/nkbv-index-event-disposition";
import { baCellToneClass } from "../lib/nkbv-ba-day-row-tone";
import {
  clinicalIwp,
  endoExtendedIwp,
  clinicalRitEnd,
  addDays,
} from "../lib/nkbv-shared-timeline";
import {
  CH17_TYPE_DEFS,
  ch17TypeDef,
  evaluateCh17Type,
  ch17EvidenceKeysForType,
} from "../lib/nkbv-ch17-definitions";
import { ch17EvidenceLabel } from "../lib/nkbv-ch17-evidence-catalog";
import {
  BA_DAY_COL_W_ANALYSIS,
  type BaDayGridColumnDef,
} from "./NkbvBaDayGrid";
import NkbvBaConcludeCell from "./NkbvBaConcludeCell";
import { isBloodSpecimen } from "../lib/nkbv-sbap-rit-chips";
import { detectSecondaryBsiFromSbap } from "../lib/nkbv-ket-luan-smart";

type Props = {
  columns: BaGridColumn[];
  index: BaGridActiveIndex;
  indexLabel?: string;
  ngayVaoVien: string;
  ngayRaVien?: string | null;
  xn: BaGridXnCell[];
  cdha: BaGridCdhaCell[];
  draft: BaAnalysisSessionDraft;
  onDraftChange: (patch: Partial<BaAnalysisSessionDraft>) => void;
  allowedEdit: boolean;
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
  onCloseInsufficient?: () => void;
  onOpenPrimaryBsi?: (bloodId: string) => void;
  onConfirmSecondaryBlood?: (payload: {
    sampleId: string;
    date: string;
    label: string;
  }) => void;
  colW?: number;
  labelW?: number;
  children?: (api: { analysisColumns: BaDayGridColumnDef[] }) => React.ReactNode;
};

function defaultCh17TypeFromSpecimen(specimenBlob: string): string {
  const s = specimenBlob.toUpperCase();
  if (/BONE|XƯƠNG|XUONG/.test(s)) return "BONE";
  if (/JOINT|KHỚP|KHOP|DỊCH KHỚP|DICH KHOP/.test(s)) return "JNT";
  if (/CSF|NÃO TỦY|NAO TUY|DNT|MÀNG NÃO|MANG NAO/.test(s)) return "MEN";
  if (/PERICARDIAL|MÀNG NGOÀI TIM|CARDIOVASCULAR|TIM MẠCH/.test(s)) return "CARD";
  if (/PERITONEAL|PHÚC MẠC|PHUC MAC|Ổ BỤNG|O BUNG/.test(s)) return "IAB";
  if (/STOOL|PHÂN|TIÊU HÓA|TIEU HOA/.test(s)) return "GIT";
  if (/REPRODUCTIVE|SINH DỤC|SINH SAN/.test(s)) return "OREP";
  if (/URT|HÔ HẤP TRÊN|HO HAP TREN|\bUR\b/.test(s)) return "UR";
  if (/USI|MÔ THẬN|MO THAN|DỊCH THẬN|DICH THAN/.test(s)) return "USI";
  if (/DECUBITUS|LOÉT|LOET|VẾT THƯƠNG|VET THUONG/.test(s)) return "SKIN";
  return "SKIN";
}

export default function NkbvSyndromeCh17Panel({
  columns: _columns,
  index,
  indexLabel,
  ngayVaoVien,
  ngayRaVien: _ngayRaVien,
  xn = [],
  cdha = [],
  draft,
  onDraftChange,
  allowedEdit,
  analysisDispositions = [],
  sampleConclusions = [],
  analysisMode = "CDC",
  onManualSampleConclude,
  onManualSampleClear,
  priorEvents = [],
  openSiteSessions = [],
  onClose,
  onCloseInsufficient,
  onOpenPrimaryBsi,
  onConfirmSecondaryBlood,
  children,
}: Props) {
  const indexDate = index.date.slice(0, 10);
  const indexXn = useMemo(
    () => (index.kind === "XN" ? xn.find((x) => x.id === index.id) || null : null),
    [index, xn],
  );

  // Suy đoán loại Chương 17 mặc định từ bệnh phẩm
  const defaultTypeCode = useMemo(() => {
    const raw = [
      indexXn?.benh_pham,
      indexXn?.loai_benh_pham_chuan,
      indexLabel,
    ].filter(Boolean).join(" ");
    return defaultCh17TypeFromSpecimen(raw);
  }, [indexXn, indexLabel]);

  const activeTypeCode = (draft.ch17TypeCode || defaultTypeCode).toUpperCase();
  const currentDef = ch17TypeDef(activeTypeCode) || ch17TypeDef("SKIN")!;

  // Cửa sổ IWP: ENDO = ±10 ngày (21 ngày lịch), các loại khác = ±3 ngày (7 ngày lịch)
  const iwp = useMemo(() => {
    return activeTypeCode === "ENDO"
      ? endoExtendedIwp(indexDate)
      : clinicalIwp(indexDate);
  }, [activeTypeCode, indexDate]);

  const iwpDateSet = useMemo(() => {
    const s = new Set<string>();
    let cur = iwp.start;
    while (cur <= iwp.end) {
      s.add(cur);
      cur = addDays(cur, 1);
    }
    return s;
  }, [iwp]);

  // Cờ bằng chứng tiêu chuẩn Chương 17
  const currentFlags = useMemo(() => {
    const flags: Record<string, boolean> = { ...(draft.ch17Flags || {}) };
    // Nếu có cấy vi sinh dương tính tại mốc Index, tự động tích cờ vi sinh tương ứng
    if (indexXn && indexXn.vi_khuan && indexXn.vi_khuan.trim() !== "") {
      flags.organism_culture_positive = true;
      flags.site_culture_positive = true;
      flags.pathogen_culture_positive = true;
      flags.blood_culture_positive = true;
    }
    return flags;
  }, [draft.ch17Flags, indexXn]);

  const toggleFlag = (key: string, checked: boolean) => {
    const next = { ...currentFlags, [key]: checked };
    onDraftChange({ ch17Flags: next });
  };

  // Đánh giá tiêu chuẩn bằng chứng theo cây logic CDC Chapter 17
  const evalResult = useMemo(() => {
    return evaluateCh17Type({
      typeCode: currentDef.code,
      evidence: currentFlags,
    });
  }, [currentDef.code, currentFlags]);

  // Xác định Ngày X / Ngày sự kiện (DOE): phần tử sớm nhất trong IWP
  const doe = indexDate;
  const hospitalDayOfDoe = useMemo(() => {
    const dAdmission = new Date(`${ngayVaoVien.slice(0, 10)}T12:00:00`);
    const dDoe = new Date(`${doe}T12:00:00`);
    const diff = Math.round((dDoe.getTime() - dAdmission.getTime()) / 86400000);
    return diff + 1;
  }, [ngayVaoVien, doe]);

  const isHai = hospitalDayOfDoe >= 3;
  const classificationLabel = `${currentDef.name_vi} (${currentDef.code}) — ${
    isHai ? "NKBV (HAI)" : "Hiện diện khi nhập viện (POA)"
  }`;

  // Cửa sổ RIT (14 ngày lịch)
  const ritEnd = useMemo(() => clinicalRitEnd(doe), [doe]);

  // Phát hiện Secondary BSI qua cấy máu trong SBAP trùng tác nhân
  const bloodXn = useMemo(() => xn.filter((x) => isBloodSpecimen(x.benh_pham)), [xn]);
  const secondaryVerdict = useMemo(() => {
    if (!evalResult.met) return null;
    const siteOrganisms = (indexXn?.vi_khuan || "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    return detectSecondaryBsiFromSbap({
      primarySite: "OTHER",
      sbapStart: iwp.start,
      sbapEnd: iwp.end,
      xn,
      primaryOrganisms: siteOrganisms,
    });
  }, [evalResult.met, indexXn?.vi_khuan, iwp.start, iwp.end, xn]);

  // Tự động đồng bộ kết quả vào draft phiên khi theo dõi CDC
  useEffect(() => {
    if (analysisMode === "MANUAL") return;
    if (evalResult.met) {
      if (
        draft.nsk !== doe ||
        draft.ketLuan !== classificationLabel ||
        !draft.eventEstablished ||
        draft.ch17TypeCode !== currentDef.code
      ) {
        onDraftChange({
          nsk: doe,
          ketLuan: classificationLabel,
          eventEstablished: true,
          ch17TypeCode: currentDef.code,
        });
      }
    } else {
      if (draft.eventEstablished || draft.ch17TypeCode !== currentDef.code) {
        onDraftChange({
          eventEstablished: false,
          ch17TypeCode: currentDef.code,
        });
      }
    }
  }, [
    analysisMode,
    evalResult.met,
    doe,
    classificationLabel,
    currentDef.code,
    draft.nsk,
    draft.ketLuan,
    draft.eventEstablished,
    draft.ch17TypeCode,
    onDraftChange,
  ]);

  const evidenceKeys = useMemo(
    () => ch17EvidenceKeysForType(currentDef.code),
    [currentDef.code],
  );

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
      id: "ch17_index",
      header: "Index",
      minWidth: aw,
      cellClassName: (day) =>
        baCellToneClass(indexDate === day.date ? "index" : "none"),
      render: (day) =>
        indexDate === day.date ? (
          <span className="line-clamp-3 text-center bv103-type-label font-semibold">
            {indexLabel || "Index"}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      id: "ch17_iwp",
      header: "Cửa sổ IWP / RIT",
      minWidth: aw,
      cellClassName: (day) => {
        if (doe === day.date) return baCellToneClass("index");
        if (iwpDateSet.has(day.date)) return baCellToneClass("iwp");
        if (evalResult.met && day.date >= doe && day.date <= ritEnd) {
          return baCellToneClass("rit");
        }
        return baCellToneClass("none");
      },
      render: (day) => {
        if (doe === day.date) {
          return (
            <span className="bv103-type-label font-bold text-rose-700 bg-rose-100 px-1 py-0.5 rounded">
              DOE
            </span>
          );
        }
        if (iwpDateSet.has(day.date)) {
          return <span className="bv103-type-label text-violet-800 font-medium">IWP</span>;
        }
        if (evalResult.met && day.date >= doe && day.date <= ritEnd) {
          return <span className="bv103-type-label text-emerald-800 font-medium">RIT</span>;
        }
        return <span className="text-slate-300">·</span>;
      },
    },
    {
      id: "ch17_ket_luan",
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
                className="w-full border-t border-amber-200/60 bg-transparent pt-0.5 bv103-type-label font-semibold outline-none text-emerald-950"
                value={draft.ketLuan}
                disabled={
                  !allowedEdit ||
                  (analysisMode !== "MANUAL" &&
                    (draft.eventDisposition?.kind === "BELONGS_PRIOR_EVENT" ||
                      draft.eventDisposition?.kind === "SECONDARY_BSI"))
                }
                placeholder={
                  analysisMode === "MANUAL"
                    ? "Gõ kết luận Ch.17…"
                    : "Kết luận tự động từ tiêu chuẩn"
                }
                onChange={(e) => {
                  const ketLuan = e.target.value;
                  onDraftChange({
                    ketLuan,
                    eventEstablished: Boolean(ketLuan.trim()),
                  });
                }}
              />
            ) : null}
          </div>
        );
      },
    },
    {
      id: "ch17_ghi_chu",
      header: "Ghi chú",
      minWidth: 72,
      render: (day) => (
        <input
          className="w-full bg-transparent bv103-type-label outline-none"
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
    <section className={`mt-3 ${C.inset} border-emerald-200 bg-emerald-50/30 p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`${C.sectionTitle} text-emerald-950`}>
              Chương 17 — Nhiễm khuẩn Khu trú (CDC/NHSN Ch.17)
            </h3>
            {evalResult.met ? (
              <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 text-[11px] border border-emerald-300">
                🎯 {classificationLabel}
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 text-[11px] border border-amber-300">
                Chưa đủ tiêu chuẩn xác định sự kiện
              </span>
            )}
          </div>

          {/* Chọn site Chương 17 */}
          <div className="flex items-center gap-3 flex-wrap text-[11px] bg-white/80 p-2 rounded border border-emerald-150">
            <span className="font-semibold text-emerald-950">Vị trí nhiễm khuẩn (Site Ch.17):</span>
            <select
              disabled={!allowedEdit}
              value={currentDef.code}
              onChange={(e) => {
                const newCode = e.target.value;
                onDraftChange({ ch17TypeCode: newCode });
              }}
              className="rounded border border-emerald-300 bg-white px-2 py-1 font-semibold text-emerald-900 outline-none text-[11px]"
            >
              {CH17_TYPE_DEFS.map((d) => (
                <option key={d.code} value={d.code}>
                  [{d.group}] {d.name_vi} ({d.code})
                </option>
              ))}
            </select>

            <span className="text-slate-600 text-[11px]">
              Index: <b>{indexDate}</b> · Cửa sổ IWP: <b>{iwp.start} → {iwp.end}</b> ({activeTypeCode === "ENDO" ? "21d" : "7d"}) · Ngày nằm viện: <b>HD {hospitalDayOfDoe}</b> ({isHai ? "HAI" : "POA"})
            </span>
          </div>

          {/* Reasoning & Criteria Checklist */}
          <div className="bg-white/80 rounded border border-emerald-150 p-2 text-[11px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-950">
                Tiêu chuẩn chẩn đoán {currentDef.name_vi} ({currentDef.code}):
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {evalResult.reason}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 pt-1">
              {evidenceKeys.map((k) => (
                <label
                  key={k}
                  className={`flex items-start gap-1.5 p-1 rounded cursor-pointer transition-colors ${
                    currentFlags[k] ? "bg-emerald-50 text-emerald-950 font-medium" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!allowedEdit}
                    checked={Boolean(currentFlags[k])}
                    onChange={(e) => toggleFlag(k, e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="leading-tight text-[11px]">
                    {ch17EvidenceLabel(k)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Secondary BSI Banner */}
          {secondaryVerdict && secondaryVerdict.isSecondary ? (
            <div className="rounded p-2 text-[11px] bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between">
              <div>
                <b>Cảnh báo Secondary BSI:</b> Tìm thấy cấy máu dương tính trong cửa sổ SBAP trùng tác nhân ({secondaryVerdict.bloodOrganisms.join(", ")}). Máu này là nhiễm khuẩn huyết thứ phát từ ổ {currentDef.code}.
              </div>
              {onConfirmSecondaryBlood && secondaryVerdict.matchedBloodIds[0] ? (
                <button
                  type="button"
                  onClick={() =>
                    onConfirmSecondaryBlood({
                      sampleId: secondaryVerdict.matchedBloodIds[0],
                      date: indexDate,
                      label: `Secondary BSI (${currentDef.code})`,
                    })
                  }
                  className="rounded-full bg-rose-600 px-2 py-0.5 text-white font-semibold text-[11px] hover:bg-rose-700 shrink-0 ml-2"
                >
                  Xác nhận Secondary
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
          >
            Đóng bảng
          </button>
          {onCloseInsufficient && !evalResult.met ? (
            <button
              type="button"
              onClick={onCloseInsufficient}
              className="rounded-full px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200"
            >
              Đóng (chưa đủ TC)
            </button>
          ) : null}
        </div>
      </div>

      {typeof children === "function" ? (
        children({ analysisColumns })
      ) : (
        <p className="mt-2 text-[11px] text-amber-800">Thiếu slot bảng chung.</p>
      )}
    </section>
  );
}
