"use client";

import React, { useEffect, useMemo } from "react";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import {
  ssiTcCatalogWithoutSurgery,
  type BaGridActiveIndex,
  type BaGridCdhaCell,
  type BaGridColumn,
  type BaGridSymptomByDate,
  type BaGridXnCell,
} from "../lib/nkbv-ba-grid-engine";
import {
  evaluateSecondaryBsiForBlood,
  type SecondaryBsiVerdict,
} from "../lib/nkbv-secondary-bsi-gate";
import type { BaAnalysisSessionDraft } from "../lib/nkbv-ba-analysis-session";
import {
  buildSsiVerdictFromBaDraft,
  type SsiDepth,
} from "../lib/nkbv-ssi-timeline-verdict";
import { mergeLamSangByDate } from "../lib/nkbv-ba-lam-sang-merge";
import { buildSbapRitChips, isBloodSpecimen } from "../lib/nkbv-sbap-rit-chips";
import { collectRitPathogens } from "../lib/nkbv-ket-luan-smart";
import {
  depthFromSsiEventType,
  formatNhsnOptionLabel,
  getNhsnProcedure,
  NKBV_NHSN_PROCEDURES,
  NKBV_NHSN_SSI_EVENT_TYPES,
  organSpaceSitesForProcedure,
  secondaryIncisionMismatchWarning,
} from "../lib/nkbv-ssi-nhsn-catalog";
import { ssiReportingContractGaps } from "../lib/nkbv-ssi-reporting-contract";
import { baCellToneClass } from "../lib/nkbv-ba-day-row-tone";
import type { ViSinhAnalysisDispositionRow } from "../lib/nkbv-vi-sinh-analysis-status";
import type {
  OpenSiteSessionForSbap,
  PriorEventForDisposition,
} from "../lib/nkbv-index-event-disposition";
import {
  BA_DAY_COL_W_ANALYSIS,
  type BaDayGridColumnDef,
} from "./NkbvBaDayGrid";
import NkbvBaConcludeCell from "./NkbvBaConcludeCell";

type Props = {
  columns: BaGridColumn[];
  index: BaGridActiveIndex;
  indexLabel?: string;
  ngayVaoVien: string;
  xn: BaGridXnCell[];
  cdha: BaGridCdhaCell[];
  surgeryByDate: BaGridSymptomByDate;
  tieuChuanByDate: BaGridSymptomByDate;
  baLamSangByDate?: BaGridSymptomByDate;
  draft: BaAnalysisSessionDraft;
  onDraftChange: (patch: Partial<BaAnalysisSessionDraft>) => void;
  onCloseInsufficient?: () => void;
  /** Ghi TC SSI lên timeline BA (SSOT bằng chứng) */
  onPersistSsiTc?: (date: string, key: string, label: string, turnOn: boolean) => void;
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
  onOpenPrimaryBsi?: (bloodId: string) => void;
  /** Phủ quyết máu Secondary — không mở khung BSI. */
  onConfirmSecondaryBlood?: (payload: {
    sampleId: string;
    date: string;
    label: string;
  }) => void;
  colW?: number;
  labelW?: number;
  children?: (api: { analysisColumns: BaDayGridColumnDef[] }) => React.ReactNode;
};

export default function NkbvSyndromeSsiPanel({
  columns,
  index,
  indexLabel,
  ngayVaoVien,
  xn,
  cdha,
  surgeryByDate,
  tieuChuanByDate,
  baLamSangByDate = {},
  draft,
  onDraftChange,
  onCloseInsufficient,
  onPersistSsiTc,
  allowedEdit,
  analysisDispositions = [],
  sampleConclusions = [],
  analysisMode = "CDC",
  onManualSampleConclude,
  onManualSampleClear,
  priorEvents = [],
  openSiteSessions = [],
  scrollRef,
  onScrollSync,
  onClose,
  onOpenPrimaryBsi,
  onConfirmSecondaryBlood,
  colW = 100,
  labelW = 128,
  children,
}: Props) {
  void colW;
  void labelW;
  void scrollRef;
  void onScrollSync;
  const surgeryDate = useMemo(() => {
    const keys = Object.keys(surgeryByDate).sort();
    if (keys.length) return keys[0];
    if (index.kind === "TIEU_CHUAN" && /surg|mổ|mo /i.test(indexLabel || "")) {
      return index.date.slice(0, 10);
    }
    // Index từ ngày mổ
    if (keys.length === 0 && index.kind === "TIEU_CHUAN") {
      const surgHit = Object.entries(surgeryByDate).find(([, items]) =>
        items.some((it) => it.id === index.id),
      );
      if (surgHit) return surgHit[0];
    }
    return keys[0] || null;
  }, [surgeryByDate, index, indexLabel]);

  const resolvedSurgery = useMemo(() => {
    if (surgeryDate) return surgeryDate;
    // Index là hàng mổ: id nằm trong surgeryByDate
    for (const [d, items] of Object.entries(surgeryByDate)) {
      if (items.some((it) => it.id === index.id)) return d.slice(0, 10);
    }
    // Fallback: ngày Index nếu mở từ mổ manual
    const firstSurg = Object.keys(surgeryByDate).sort()[0];
    return firstSurg || index.date.slice(0, 10);
  }, [surgeryDate, surgeryByDate, index]);

  const eventDepth = depthFromSsiEventType(draft.ssiEventType);
  const depth: SsiDepth = eventDepth || draft.ssiDepth || "SUPERFICIAL";
  const procedureCode = draft.loaiPhauThuatNhsn || "";
  const siteOptions = useMemo(
    () => organSpaceSitesForProcedure(procedureCode),
    [procedureCode],
  );
  const tcCatalog = useMemo(() => ssiTcCatalogWithoutSurgery(), []);

  const woundOrg = useMemo(() => {
    const woundXn = xn.find(
      (x) =>
        /VẾT MỔ|VET MO|WOUND|MỔ|DỊCH MỔ/i.test(x.benh_pham) &&
        x.vi_khuan &&
        x.vi_khuan !== "—",
    );
    return woundXn?.vi_khuan || null;
  }, [xn]);

  const bloodXn = useMemo(() => xn.filter((x) => isBloodSpecimen(x.benh_pham)), [xn]);

  const verdict = useMemo(
    () =>
      buildSsiVerdictFromBaDraft({
        draft,
        surgeryDate: resolvedSurgery,
        indexDate: index.date,
        tieuChuanByDate,
        cdha,
        bloodXn,
        woundOrganism: woundOrg,
      }),
    [draft, resolvedSurgery, index.date, tieuChuanByDate, cdha, bloodXn, woundOrg],
  );
  const reportingGaps = useMemo(
    () => ssiReportingContractGaps(verdict.data),
    [verdict.data],
  );
  const secondaryWarn = secondaryIncisionMismatchWarning(
    draft.ssiEventType,
    procedureCode,
  );

  const sbsiVerdicts: SecondaryBsiVerdict[] = useMemo(() => {
    const sbap = [...verdict.gate.sbapDates];
    const siteOrgs = [
      ...(woundOrg ? [woundOrg] : []),
      ...collectRitPathogens({
        nsk: (verdict.gate.doe || index.date).slice(0, 10),
        majorType: "SSI",
        xn,
        excludeBlood: true,
      }),
    ];
    const uniq = [...new Set(siteOrgs.map((o) => o.trim()).filter(Boolean))];
    return bloodXn.map((b) =>
      evaluateSecondaryBsiForBlood({
        blood: { id: b.id, date: b.ngay, organism: b.vi_khuan },
        sites: [
          {
            id: "site-SSI",
            majorType: "SSI",
            criteriaMet: verdict.criteriaMet,
            sbapDates: sbap,
            criteriaWindowDates: sbap,
            siteOrganism: uniq[0] || woundOrg,
            siteOrganisms: uniq,
            bloodCriterionIds: draft.bloodCriterionIds,
          },
        ],
      }),
    );
  }, [
    bloodXn,
    verdict.gate.sbapDates,
    verdict.gate.doe,
    verdict.criteriaMet,
    draft.bloodCriterionIds,
    woundOrg,
    xn,
    index.date,
  ]);

  useEffect(() => {
    const established = Boolean(verdict.criteriaMet);
    if (Boolean(draft.eventEstablished) === established) return;
    onDraftChange({ eventEstablished: established });
  }, [verdict.criteriaMet, draft.eventEstablished, onDraftChange]);

  const sbapRitChips = useMemo(() => {
    const doe = (verdict.gate.doe || index.date).slice(0, 10);
    const primaries = [
      ...(woundOrg ? [woundOrg] : []),
      ...collectRitPathogens({
        nsk: doe,
        majorType: "SSI",
        xn,
        excludeBlood: true,
      }),
    ];
    return buildSbapRitChips({
      xn,
      indexId: index.id,
      indexSpecimen: "Dịch vết mổ",
      ritDates: new Set<string>(),
      sbapDates: verdict.gate.sbapDates,
      primaryOrganisms: [...new Set(primaries.map((o) => o.trim()).filter(Boolean))],
    });
  }, [xn, index.id, index.date, woundOrg, verdict.gate.doe, verdict.gate.sbapDates]);

  const bloodInSbap = useMemo(
    () => Object.values(sbapRitChips.sbapByDate).flat(),
    [sbapRitChips.sbapByDate],
  );

  const toggleTc = (date: string, key: string, label: string) => {
    if (!allowedEdit) return;
    const merged = mergeLamSangByDate(baLamSangByDate, draft.lamSang);
    const cur = merged[date] || [];
    // TC SSI chẩn đoán nằm ở giỏ tieuChuanByDate (bảng chung) — phải xét cả 2 giỏ,
    // nếu không untick từ panel bị hiểu nhầm là tick mới rồi no-op.
    const wasOn =
      cur.some((x) => x.key === key) ||
      (tieuChuanByDate[date] || []).some((x) => x.key === key);
    const next: BaGridSymptomByDate = { ...draft.lamSang };
    if (wasOn) {
      next[date] = (draft.lamSang[date] || []).filter((x) => x.key !== key);
    } else {
      next[date] = [...(draft.lamSang[date] || []), { key, label }];
    }
    onDraftChange({ lamSang: next });
    onPersistSsiTc?.(date, key, label, !wasOn);
  };

  const tcOnDate = (date: string) => {
    const ba = tieuChuanByDate[date] || [];
    const draftItems = draft.lamSang[date] || [];
    const map = new Map<string, { key: string; label: string }>();
    for (const it of [...ba, ...draftItems]) {
      if (
        it.key === "purulent_drainage" ||
        it.key === "wound_opened" ||
        it.key === "wound_culture" ||
        it.key === "abscess_imaging" ||
        it.key === "physician_diagnosis"
      ) {
        map.set(it.key, { key: it.key, label: it.label });
      }
    }
    return [...map.values()];
  };

  const ketLuanDisplay =
    analysisMode === "MANUAL" || draft.analysisMode === "MANUAL"
      ? draft.ketLuan || ""
      : draft.ketLuan || verdict.ketLuanLabel || "";
  const ketLuanLocked =
    analysisMode !== "MANUAL" &&
    draft.analysisMode !== "MANUAL" &&
    (draft.eventDisposition?.kind === "BELONGS_PRIOR_EVENT" ||
      draft.eventDisposition?.kind === "SECONDARY_BSI");
  const indexDate = index.date.slice(0, 10);
  const doe = verdict.gate.doe;

  return (
    <section className={`mt-3 ${C.inset} border-violet-200 bg-violet-50/40 p-3`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className={`${C.sectionTitle} text-violet-950`}>
            Bảng SSI — SP 30/90 · DOE · SBAP 17d (không IWP)
          </h3>
          <p className="mt-0.5 text-[11px] text-violet-800">
            Mổ {verdict.gate.surgeryDate || "—"}
            {doe ? ` · DOE/NSK ${doe}` : ""}
            {verdict.result.classification
              ? ` · ${verdict.result.classification}`
              : ""}
            {indexLabel ? ` · ${indexLabel}` : ""}
            {" · "}
            {verdict.gate.noteImplantProxy}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-[11px] text-slate-700">
            Mã PT
            <select
              className="max-w-[11rem] rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px]"
              disabled={!allowedEdit}
              value={procedureCode}
              onChange={(e) => {
                const code = e.target.value;
                const okSite =
                  draft.organSpaceSite &&
                  organSpaceSitesForProcedure(code).some(
                    (s) => s.code === draft.organSpaceSite,
                  );
                onDraftChange({
                  loaiPhauThuatNhsn: code || undefined,
                  organSpaceSite: okSite ? draft.organSpaceSite : undefined,
                });
              }}
            >
              <option value="">—</option>
              {NKBV_NHSN_PROCEDURES.map((p) => (
                <option key={p.code} value={p.code} title={p.name_en}>
                  {p.code}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1 text-[11px] text-slate-700">
            Sự kiện
            <select
              className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px]"
              disabled={!allowedEdit}
              value={draft.ssiEventType || ""}
              onChange={(e) => {
                const code = e.target.value;
                const d = depthFromSsiEventType(code);
                onDraftChange({
                  ssiEventType: code || undefined,
                  ssiDepth: (d || draft.ssiDepth) as SsiDepth,
                  organSpaceSite: d === "ORGAN_SPACE" ? draft.organSpaceSite : undefined,
                });
              }}
            >
              <option value="">—</option>
              {NKBV_NHSN_SSI_EVENT_TYPES.map((ev) => (
                <option key={ev.code} value={ev.code} title={ev.name_en}>
                  {ev.code}
                </option>
              ))}
            </select>
          </label>
          {depth === "ORGAN_SPACE" ? (
            <label className="flex items-center gap-1 text-[11px] text-slate-700">
              Site
              <select
                className="max-w-[9rem] rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px]"
                disabled={!allowedEdit}
                value={draft.organSpaceSite || ""}
                onChange={(e) =>
                  onDraftChange({ organSpaceSite: e.target.value || undefined })
                }
              >
                <option value="">—</option>
                {siteOptions.map((s) => (
                  <option key={s.code} value={s.code} title={formatNhsnOptionLabel(s)}>
                    {s.code}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex items-center gap-1 text-[11px] text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(draft.hasImplant)}
              disabled={!allowedEdit}
              onChange={(e) => onDraftChange({ hasImplant: e.target.checked })}
            />
            Implant
          </label>
          <label className="flex items-center gap-1 text-[11px] text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(draft.isPatos)}
              disabled={!allowedEdit}
              onChange={(e) => onDraftChange({ isPatos: e.target.checked })}
            />
            PATOS
          </label>
          {!verdict.criteriaMet ? (
            <button
              type="button"
              disabled={!allowedEdit}
              onClick={() => onCloseInsufficient?.()}
              className="rounded-full border border-amber-400 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
            >
              Đã phân tích xong
            </button>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 bv103-type-label font-semibold text-emerald-900">
              Đủ TC sự kiện
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-[11px] font-semibold text-violet-800 hover:bg-violet-100"
          >
            Đóng bảng
          </button>
        </div>
      </div>

      {verdict.gate.warnings.length ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">
          <strong>Gate SSI:</strong> {verdict.gate.warnings.join(" · ")}
          {!verdict.criteriaMet ? (
            <span className="ml-1 font-semibold text-rose-800">
              — {verdict.result.classification}
            </span>
          ) : null}
        </div>
      ) : null}

      <p className="mt-1 text-[11px] text-violet-700">
        NHSN: mã PT · loại sự kiện (SIP/SIS/DIP/DIS/Organ) · site Ch.17 khi Organ/Space.
        {(() => {
          const p = getNhsnProcedure(procedureCode);
          return p ? ` · ${formatNhsnOptionLabel(p)}` : "";
        })()}
      </p>
      {secondaryWarn ? (
        <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-950">
          {secondaryWarn}
        </p>
      ) : null}
      {verdict.criteriaMet && reportingGaps.length ? (
        <p className="mt-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-900">
          Thiếu khóa báo cáo trước khi chốt: {reportingGaps.join(", ")}
        </p>
      ) : null}

      {bloodInSbap.length > 0 ? (
        <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1.5 text-[11px] text-sky-950">
          <strong>Cấy máu ∈ SBAP SSI [DOE−3, DOE+13]:</strong>
          <ul className="mt-1 space-y-1">
            {bloodInSbap.map((b) => {
              const v = sbsiVerdicts.find((x) => x.bloodId === b.id);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-2">
                  <span>
                    {b.ngay} · {b.vi_khuan}
                    {b.organismMatched ? " · trùng VK" : ""}
                  </span>
                  {v ? (
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-semibold">
                      {v.outcome === "SECONDARY"
                        ? `Secondary ${v.scenario}`
                        : v.outcome === "EXCLUDED_PRIMARY"
                          ? "Exclusion → Primary"
                          : "Ứng viên Primary"}
                    </span>
                  ) : null}
                  {v &&
                  (v.outcome === "PRIMARY_CANDIDATE" ||
                    v.outcome === "EXCLUDED_PRIMARY") &&
                  onOpenPrimaryBsi ? (
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-sky-800 underline"
                      onClick={() => onOpenPrimaryBsi(b.id)}
                    >
                      Mở bảng BSI
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {sbsiVerdicts.some((v) => v.outcome === "SECONDARY") ? (
        <p className="mt-2 text-[11px] font-semibold text-emerald-800">
          Secondary BSI:{" "}
          {sbsiVerdicts
            .filter((v) => v.outcome === "SECONDARY")
            .map((v) => v.reason)
            .join(" · ")}
        </p>
      ) : null}

      <p className="mt-2 text-[11px] text-violet-800/90">
        Cột SSI (SP · TC · SBAP · kết luận) gắn cùng hàng bảng chung; highlight theo cột.
      </p>

      {(() => {
        const aw = BA_DAY_COL_W_ANALYSIS;
        const xnByDate: Record<string, BaGridXnCell[]> = {};
        for (const x of xn) {
          const d = x.ngay.slice(0, 10);
          (xnByDate[d] ||= []).push(x);
        }
        const analysisColumns: BaDayGridColumnDef[] = [
          {
            id: "ssi_index",
            header: "Index",
            minWidth: aw,
            cellClassName: (day) => {
              const isIx = indexDate === day.date;
              const isSurg = Boolean(surgeryByDate[day.date]?.length);
              return baCellToneClass(isIx || isSurg ? "index" : "none");
            },
            render: (day) => {
              const isIx = indexDate === day.date;
              const isSurg = Boolean(surgeryByDate[day.date]?.length);
              if (isIx) {
                return (
                  <span className="line-clamp-3 bv103-type-label font-semibold">
                    {indexLabel || "Index"}
                  </span>
                );
              }
              if (isSurg) {
                return <span className="bv103-type-label font-semibold text-violet-800">Mổ</span>;
              }
              return <span className="text-slate-300">—</span>;
            },
          },
          {
            id: "ssi_sp",
            header: `SP ${verdict.gate.spDays}d`,
            minWidth: Math.min(aw, 64),
            cellClassName: (day) =>
              baCellToneClass(verdict.gate.spDates.has(day.date) ? "iwp" : "none"),
            render: (day) =>
              verdict.gate.spDates.has(day.date) ? (
                <span className="font-bold">·</span>
              ) : (
                <span className="text-slate-300">—</span>
              ),
          },
          {
            /** Khác id `ssi_tc` của bảng chung (NkbvBaCommonDayGrid) — tránh key trùng khi merge extraColumns. */
            id: "ssi_panel_tc",
            header: "Tc",
            minWidth: aw,
            cellClassName: (day) =>
              baCellToneClass(verdict.gate.spDates.has(day.date) ? "iwp" : "none"),
            render: (day) => {
              const items = tcOnDate(day.date);
              const inSp = verdict.gate.spDates.has(day.date);
              return (
                <div className="relative flex flex-col gap-0.5">
                  {items.map((it) => (
                    <span
                      key={it.key}
                      className="line-clamp-2 bv103-type-label font-semibold text-violet-950"
                    >
                      {it.label}
                    </span>
                  ))}
                  {allowedEdit && inSp ? (
                    <details className="mt-auto">
                      <summary className="cursor-pointer bv103-type-label font-semibold text-violet-600">
                        + TC
                      </summary>
                      <ul className="absolute z-30 mt-0.5 max-h-40 w-56 overflow-auto rounded border bg-white p-1 shadow-lg">
                        {tcCatalog.map((entry) => (
                          <li key={entry.criteriaKey}>
                            <label className="flex cursor-pointer gap-1 px-1 py-0.5 text-[11px] hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={items.some((x) => x.key === entry.criteriaKey)}
                                onChange={() =>
                                  toggleTc(day.date, entry.criteriaKey, entry.title)
                                }
                              />
                              {entry.title}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {!items.length && !inSp ? (
                    <span className="text-slate-300">—</span>
                  ) : null}
                </div>
              );
            },
          },
          {
            id: "ssi_sbap",
            header: "Sbap · ứng viên",
            minWidth: aw,
            cellClassName: (day) =>
              baCellToneClass(verdict.gate.sbapDates.has(day.date) ? "sbap" : "none"),
            render: (day) => {
              const chips = sbapRitChips.sbapByDate[day.date] || [];
              if (!chips.length) {
                return verdict.gate.sbapDates.has(day.date) ? (
                  <span className="text-center bv103-type-label">·</span>
                ) : (
                  <span className="text-slate-300">—</span>
                );
              }
              return (
                <div className="flex flex-col gap-0.5">
                  {chips.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      disabled={!onOpenPrimaryBsi}
                      onClick={() => onOpenPrimaryBsi?.(b.id)}
                      className={`truncate rounded px-0.5 text-left bv103-type-label font-semibold ${
                        b.organismMatched
                          ? "bg-sky-400/90 text-sky-950 ring-1 ring-sky-600"
                          : "bg-sky-200/80 text-sky-950"
                      }`}
                      title={
                        b.organismMatched
                          ? `Cấy máu trùng VK vết mổ — ứng viên Secondary · ${b.vi_khuan}`
                          : `Cấy máu (+) ∈ SBAP · ${b.vi_khuan}`
                      }
                    >
                      {b.organismMatched ? "≈ " : ""}
                      Máu · {b.vi_khuan || "+"}
                    </button>
                  ))}
                </div>
              );
            },
          },
          {
            id: "ssi_ket_luan",
            header: "Kết luận",
            minWidth: aw,
            cellClassName: (day) =>
              baCellToneClass(
                indexDate === day.date || doe === day.date ? "index" : "none",
              ),
            render: (day) => {
              const isIx = indexDate === day.date || doe === day.date;
              return (
                <div className="flex flex-col gap-0.5">
                  <NkbvBaConcludeCell
                    date={day.date}
                    xnOnDay={xnByDate[day.date] || []}
                    priorEvents={priorEvents}
                    openSiteSessions={openSiteSessions}
                    analysisDispositions={analysisDispositions}
                    sampleConclusions={sampleConclusions}
                    confirmedIds={draft.ritAttributedIds || []}
                    excludeSampleId={index.id}
                    progressiveLabel={null}
                    allowedEdit={allowedEdit}
                    analysisMode={analysisMode}
                    onManualSampleConclude={onManualSampleConclude}
                    onManualSampleClear={onManualSampleClear}
                    onConclude={(payload) => {
                      if (payload.scope === "session_rit" || payload.scope === "prior") {
                        const prev = draft.ritAttributedIds || [];
                        if (!prev.includes(payload.indexId)) {
                          onDraftChange({
                            ritAttributedIds: [...prev, payload.indexId],
                          });
                        }
                        return;
                      }
                      if (payload.scope === "secondary") {
                        const prev = draft.ritAttributedIds || [];
                        if (!prev.includes(payload.indexId)) {
                          onDraftChange({
                            ritAttributedIds: [...prev, payload.indexId],
                          });
                        }
                        onConfirmSecondaryBlood?.({
                          sampleId: payload.indexId,
                          date: day.date,
                          label: payload.label,
                        });
                      }
                    }}
                  />
                  {isIx ? (
                    <input
                      className="w-full border-t border-amber-200/60 bg-transparent pt-0.5 bv103-type-label font-semibold outline-none"
                      value={ketLuanDisplay}
                      disabled={!allowedEdit || ketLuanLocked}
                      placeholder={
                        analysisMode === "MANUAL"
                          ? "Gõ kết luận sự kiện…"
                          : verdict.result.classification || "SSI"
                      }
                      onChange={(e) => onDraftChange({ ketLuan: e.target.value })}
                    />
                  ) : null}
                </div>
              );
            },
          },
          {
            id: "ssi_ghi_chu",
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

        if (typeof children === "function") {
          return children({ analysisColumns });
        }
        return (
          <p className="mt-2 text-[11px] text-amber-800">
            Thiếu slot bảng chung — truyền children để gắn cột SSI.
          </p>
        );
      })()}

    </section>
  );
}
