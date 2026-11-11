"use client";

import React from "react";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import {
  UTI_VOIDING_CRITERIA_KEYS,
  type BaGridCdhaCell,
  type BaGridXnCell,
} from "../lib/nkbv-ba-grid-engine";
import { PNEU_IC_ATOM_ROWS } from "../lib/nkbv-pneu-lab-tier";
import { baCellToneClass } from "../lib/nkbv-ba-day-row-tone";
import {
  BA_DAY_COL_W_ANALYSIS,
  BA_DAY_COL_W_NARROW,
  type BaDayGridColumnDef,
} from "./NkbvBaDayGrid";
import NkbvBaConcludeCell from "./NkbvBaConcludeCell";
import type { PriorEvent, Props } from "./nkbv-syndrome-iwp.types";
import type { useNkbvIwpVerdicts } from "../hooks/useNkbvIwpVerdicts";
import type { useNkbvIwpKetLuan } from "../hooks/useNkbvIwpKetLuan";

export type NkbvSyndromeIwpGridProps = Omit<
  Props,
  | "priorEvents"
  | "openSiteSessions"
  | "analysisDispositions"
  | "sampleConclusions"
  | "analysisMode"
  | "columns"
  | "ngayVaoVien"
> &
  Omit<ReturnType<typeof useNkbvIwpVerdicts>, "nghiNgo" | "bloodXn"> &
  ReturnType<typeof useNkbvIwpKetLuan> & {
    priorEvents: PriorEvent[];
    openSiteSessions: NonNullable<Props["openSiteSessions"]>;
    analysisDispositions: NonNullable<Props["analysisDispositions"]>;
    sampleConclusions: NonNullable<Props["sampleConclusions"]>;
    analysisMode: NonNullable<Props["analysisMode"]>;
    catalogForDate: (date: string) => ReturnType<typeof import("../lib/nkbv-ba-grid-engine").clinicalCatalogForNghiNgo>;
    toggleLamSang: (date: string, key: string, label: string) => void;
    toggleBloodPnu2: (id: string) => void;
    toggleAbutiBlood: (id: string) => void;
  };

export default function NkbvSyndromeIwpGrid({
  panel,
  xn,
  cdha,
  index,
  allowedEdit,
  draft,
  onDraftChange,
  onCloseInsufficient,
  onClose,
  onOpenPrimaryBsi,
  onConfirmSecondaryBlood,
  priorEvents,
  openSiteSessions,
  analysisDispositions,
  sampleConclusions,
  analysisMode,
  onManualSampleConclude,
  onManualSampleClear,
  children,
  ageYears,
  showCdha,
  canThiepDates,
  indexXn,
  indexCdha,
  sessionBase,
  session,
  utiVerdict,
  pneuVerdict,
  bsiVerdict,
  bloodInIwp,
  bloodInSbap,
  sbapRitChips,
  activeSessionRit,
  sbsiVerdicts,
  ketLuanDisplay,
  ketLuanLocked,
  priorRitAlert,
  criteriaMetForKetLuan,
  catalogForDate,
  toggleLamSang,
  toggleBloodPnu2,
  toggleAbutiBlood,
}: NkbvSyndromeIwpGridProps) {
  return (
    <section className={`mt-3 ${C.inset} border-rose-200 bg-rose-50/30 p-3`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className={`${C.sectionTitle} text-rose-950`}>
            {panel === "UTI"
              ? "Bảng UTI/CAUTI — Ngày X · IPW · DOE · RIT · SBAP · Foley"
              : panel === "PNEU"
                ? "Bảng PNEU/VAP/HAP — Ngày X · IPW · DOE · RIT · SBAP · Vent"
                : panel === "BSI"
                  ? "Bảng Primary BSI/CLABSI — Ngày X · IPW · DOE · RIT · SBAP · CVC"
                  : `Bảng ${panel} — Ngày X · IPW · DOE · RIT · SBAP`}
          </h3>
          <p className="mt-0.5 text-xs text-rose-800">
            Ngày X {session.indexDate || "—"}
            {session.nsk ? ` · DOE/NSK ${session.nsk}` : ""}
            {panel === "UTI" && utiVerdict
              ? ` · ${utiVerdict.result.classification}`
              : panel === "PNEU" && pneuVerdict
                ? ` · ${pneuVerdict.result.classification}`
                : panel === "BSI" && bsiVerdict
                  ? ` · ${bsiVerdict.result.classification}`
                  : session.ketLuan
                    ? ` · ${session.ketLuan.summary}`
                    : ""}
            {session.ketLuan?.is_secondary_bsi ? " · Secondary BSI" : null}
            {panel === "UTI" && ageYears == null
              ? " · Nhánh người lớn (chưa có ngày sinh)"
              : null}
            
            {panel === "PNEU" && ageYears != null && ageYears >= 70
              ? " · AMS ≥70 khả dụng"
              : null}
            {panel === "BSI" && draft.bsiLocalizedSite?.criteriaMet
              ? ` · Site ${draft.bsiLocalizedSite.majorType} (Secondary gate)`
              : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {panel === "PNEU" ? (
            <div className="flex max-w-[28rem] flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-700">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={Boolean(draft.hasCardiopulmonaryDisease)}
                  disabled={!allowedEdit}
                  onChange={(e) =>
                    onDraftChange({ hasCardiopulmonaryDisease: e.target.checked })
                  }
                />
                Tim phổi nền (≥2 phim)
              </label>
              {PNEU_IC_ATOM_ROWS.map((row) => (
                <label key={row.field} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.pneuIcAtoms?.[row.field])}
                    disabled={!allowedEdit}
                    onChange={(e) =>
                      onDraftChange({
                        pneuIcAtoms: {
                          ...(draft.pneuIcAtoms || {}),
                          [row.field]: e.target.checked,
                        },
                      })
                    }
                  />
                  {row.label}
                </label>
              ))}
            </div>
          ) : null}
          {panel === "BSI" ? (
            <div className="flex max-w-[28rem] flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-700">
              <span className="font-semibold text-rose-900">MBI:</span>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={Boolean(draft.bsiMbi?.anc_wbc_lt_500_ge_2d)}
                  disabled={!allowedEdit}
                  onChange={(e) =>
                    onDraftChange({
                      bsiMbi: {
                        ...(draft.bsiMbi || {}),
                        anc_wbc_lt_500_ge_2d: e.target.checked,
                      },
                    })
                  }
                />
                ANC/WBC &lt;500 ≥2d (máu±3)
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={Boolean(draft.bsiMbi?.has_hsct_or_gvhd)}
                  disabled={!allowedEdit}
                  onChange={(e) =>
                    onDraftChange({
                      bsiMbi: {
                        ...(draft.bsiMbi || {}),
                        has_hsct_or_gvhd: e.target.checked,
                      },
                    })
                  }
                />
                Allo HSCT + GVHD III/IV
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={Boolean(draft.bsiMbi?.has_severe_diarrhea_mbi)}
                  disabled={!allowedEdit}
                  onChange={(e) =>
                    onDraftChange({
                      bsiMbi: {
                        ...(draft.bsiMbi || {}),
                        has_severe_diarrhea_mbi: e.target.checked,
                      },
                    })
                  }
                />
                Tiêu chảy (≥ cần HSCT)
              </label>
            </div>
          ) : null}
          {!criteriaMetForKetLuan &&
          draft.eventDisposition?.kind !== "BELONGS_PRIOR_EVENT" &&
          draft.eventDisposition?.kind !== "SECONDARY_BSI" ? (
            <button
              type="button"
              disabled={!allowedEdit}
              onClick={() => onCloseInsufficient?.()}
              className="rounded-full border border-amber-400 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
              title="Chốt Index không đủ tạo sự kiện — không tô RIT/SBAP; cho phân tích XN tiếp"
            >
              Đã phân tích xong
            </button>
          ) : null}
          {criteriaMetForKetLuan ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 bv103-type-label font-semibold text-emerald-900">
              Đủ TC sự kiện
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100"
          >
            Đóng bảng
          </button>
        </div>
      </div>

      {draft.eventDisposition?.kind === "BELONGS_PRIOR_EVENT" ? (
        <div className="mt-2 rounded-lg border border-emerald-400 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-950">
          <strong>Thuộc sự kiện trước:</strong>{" "}
          {draft.eventDisposition.label || draft.ketLuan}
          <span className="ml-1 text-emerald-800">
            — không tạo phiếu mới; gộp tác nhân vào ca DOE đã có.
          </span>
        </div>
      ) : null}

      {draft.eventDisposition?.kind === "SECONDARY_BSI" ? (
        <div className="mt-2 rounded-lg border border-sky-400 bg-sky-50 px-2 py-1.5 text-xs text-sky-950">
          <strong>Nhiễm khuẩn huyết thứ phát:</strong>{" "}
          {draft.eventDisposition.label || draft.ketLuan}
          {draft.eventDisposition.secondarySites?.length ? (
            <span className="ml-1">
              · site: {draft.eventDisposition.secondarySites.join("; ")}
            </span>
          ) : null}
        </div>
      ) : null}

      {priorRitAlert && draft.eventDisposition?.kind !== "BELONGS_PRIOR_EVENT" ? (
        <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
          <strong>Cảnh báo RIT:</strong> {priorRitAlert.message}
        </div>
      ) : null}

      {panel === "UTI" && utiVerdict?.lab.warnings.length ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
          <strong>Gate Index nước tiểu:</strong>{" "}
          {utiVerdict.lab.warnings.join(" · ")}
          {!utiVerdict.criteriaMet ? (
            <span className="ml-1 font-semibold text-rose-800">
              — chưa đủ chốt ({utiVerdict.result.classification})
            </span>
          ) : null}
        </div>
      ) : null}

      {panel === "PNEU" && pneuVerdict?.gate.warnings.length ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
          <strong>Gate PNEU (IWP):</strong> {pneuVerdict.gate.warnings.join(" · ")}
          {!pneuVerdict.criteriaMet ? (
            <span className="ml-1 font-semibold text-rose-800">
              — chưa đủ chốt ({pneuVerdict.result.classification})
            </span>
          ) : null}
        </div>
      ) : null}

      {panel === "BSI" && bsiVerdict?.gate.warnings.length ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
          <strong>Gate Primary BSI:</strong> {bsiVerdict.gate.warnings.join(" · ")}
          {!bsiVerdict.criteriaMet ? (
            <span className="ml-1 font-semibold text-rose-800">
              — {bsiVerdict.result.classification}
            </span>
          ) : null}
        </div>
      ) : null}

      {panel === "BSI" && bsiVerdict?.result.classification === "SECONDARY_BSI" ? (
        <p className="mt-2 text-xs font-semibold text-emerald-800">
          Secondary BSI từ ổ khu trú — không ghi CLABSI trên bảng này.
        </p>
      ) : null}

      {panel === "PNEU" && bloodInIwp.length > 0 ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
          <strong>Cấy máu ∈ IWP — có thể gắn PNU2:</strong>
          <ul className="mt-1 space-y-1">
            {bloodInIwp.map((b) => {
              const on = draft.bloodCriterionIds.includes(b.id);
              const v = sbsiVerdicts.find((x) => x.bloodId === b.id);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!allowedEdit}
                      onChange={() => toggleBloodPnu2(b.id)}
                    />
                    <span>
                      {b.ngay} · {b.vi_khuan}
                      {b.so_luong ? ` · SL ${b.so_luong}` : ""}
                    </span>
                  </label>
                  {v ? (
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-xs font-semibold">
                      {v.outcome === "SECONDARY"
                        ? `Secondary ${v.scenario}`
                        : v.outcome === "EXCLUDED_PRIMARY"
                          ? "Exclusion → Primary"
                          : "Ứng viên Primary"}
                    </span>
                  ) : null}
                  {v &&
                  (v.outcome === "PRIMARY_CANDIDATE" || v.outcome === "EXCLUDED_PRIMARY") &&
                  onOpenPrimaryBsi ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-sky-800 underline"
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

      {panel === "UTI" && (bloodInIwp.length > 0 || bloodInSbap.length > 0) ? (
        <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1.5 text-xs text-sky-950">
          {bloodInIwp.length > 0 ? (
            <strong>Cấy máu ∈ IWP — ABUTI (không nấm):</strong>
          ) : (
            <strong>Cấy máu ∈ SBAP ngoài IWP — chỉ xét Secondary sau SUTI, không đủ ABUTI:</strong>
          )}
          <ul className="mt-1 space-y-1">
            {(bloodInIwp.length > 0 ? bloodInIwp : bloodInSbap).map((b) => {
              const inIwp = session.iwpDates.has(b.ngay.slice(0, 10));
              const on = draft.bloodCriterionIds.includes(b.id);
              const v = sbsiVerdicts.find((x) => x.bloodId === b.id);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!allowedEdit || !inIwp}
                      onChange={() => toggleAbutiBlood(b.id)}
                    />
                    <span>
                      {b.ngay} · {b.vi_khuan}
                      {b.so_luong ? ` · SL ${b.so_luong}` : ""}
                      {!inIwp ? " · ngoài IWP" : ""}
                    </span>
                  </label>
                  {v ? (
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-xs font-semibold">
                      {v.outcome === "SECONDARY"
                        ? `Secondary ${v.scenario}`
                        : v.outcome === "EXCLUDED_PRIMARY"
                          ? "Yeast → Primary BSI"
                          : "Ứng viên Primary"}
                    </span>
                  ) : null}
                  {v &&
                  (v.outcome === "PRIMARY_CANDIDATE" || v.outcome === "EXCLUDED_PRIMARY") &&
                  onOpenPrimaryBsi ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-sky-800 underline"
                      onClick={() => onOpenPrimaryBsi(b.id)}
                    >
                      Mở bảng BSI
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {bloodInIwp.length > 0 &&
          bloodInSbap.some((b) => !session.iwpDates.has(b.ngay.slice(0, 10))) ? (
            <p className="mt-1 text-xs text-sky-900">
              Máu ∈ SBAP ngoài IWP chỉ xét Secondary sau SUTI — không tick ABUTI.
            </p>
          ) : null}
        </div>
      ) : null}

      {panel !== "BSI" && sbsiVerdicts.some((v) => v.outcome === "SECONDARY") ? (
        <p className="mt-2 text-xs font-semibold text-emerald-800">
          Secondary BSI:{" "}
          {sbsiVerdicts
            .filter((v) => v.outcome === "SECONDARY")
            .map((v) => v.reason)
            .join(" · ")}
        </p>
      ) : null}

      <p className="mt-2 text-xs text-rose-800/90">
        Cột phân tích cùng hàng bảng chung. XN cùng mẫu ∈ RIT (ứng viên) → Kết luận «Thuộc SK»
        khi đủ TC + nút xác nhận. Cấy máu ∈ SBAP: badge «≈» khi trùng VK. Highlight IPW / RIT / SBAP.
      </p>

      {(() => {
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
            id: "ax_index",
            header: "Index x",
            minWidth: aw,
            cellClassName: (day) =>
              baCellToneClass(
                index.date.slice(0, 10) === day.date ? "index" : "none",
              ),
            render: (day) => {
              const isIx = index.date.slice(0, 10) === day.date;
              if (!isIx) return <span className="text-slate-300">—</span>;
              const dayXn = xn.filter((x) => x.ngay.slice(0, 10) === day.date);
              if (indexXn || dayXn.length) {
                return (
                  <div className="flex flex-col gap-0.5 leading-snug">
                    {indexXn ? (
                      <div>
                        <span className="font-bold">X · {indexXn.benh_pham}</span>
                        <span className="block">{indexXn.vi_khuan}</span>
                        {panel === "UTI" && utiVerdict && !utiVerdict.lab.cfuOk ? (
                          <span className="font-semibold">Gate!</span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="font-bold">X</span>
                    )}
                    {dayXn
                      .filter((x) => x.id !== indexXn?.id)
                      .map((x) => (
                        <span key={x.id} className="block bv103-type-label text-slate-700">
                          {x.benh_pham}
                          {x.vi_khuan ? ` · ${x.vi_khuan}` : ""}
                        </span>
                      ))}
                  </div>
                );
              }
              if (indexCdha) {
                return (
                  <span className="line-clamp-3 font-semibold">
                    X · {indexCdha.mo_ta_benh_ly}
                  </span>
                );
              }
              return <span className="font-bold">X</span>;
            },
          },
          {
            id: "ax_ls",
            header: "Iwp · ls",
            minWidth: aw,
            cellClassName: (day) => {
              const isDoe = Boolean(session.nsk && session.nsk === day.date);
              if (isDoe) return baCellToneClass("doe");
              if (session.iwpDates.has(day.date)) return baCellToneClass("iwp");
              return baCellToneClass("none");
            },
            render: (day) => {
              const items = (sessionBase.lamSang[day.date] || []).filter((it) => {
                if (panel !== "UTI") return true;
                if (
                  UTI_VOIDING_CRITERIA_KEYS.has(it.key) &&
                  canThiepDates.some((d) => d.slice(0, 10) === day.date)
                ) {
                  return false;
                }
                return true;
              });
              const inIwp = session.iwpDates.has(day.date);
              const isDoe = Boolean(session.nsk && session.nsk === day.date);
              const cat = catalogForDate(day.date);
              return (
                <div className="relative flex flex-col gap-0.5">
                  {isDoe ? (
                    <span className="text-center bv103-type-label font-semibold tracking-wide">DOE</span>
                  ) : null}
                  {items.map((it) => (
                    <span key={it.key} className="line-clamp-2 bv103-type-label font-semibold">
                      {it.label}
                    </span>
                  ))}
                  {allowedEdit && inIwp ? (
                    <details className="mt-auto">
                      <summary className="cursor-pointer bv103-type-label font-semibold text-sky-700">
                        + LS
                      </summary>
                      <ul className="absolute z-30 mt-0.5 max-h-40 w-56 overflow-auto rounded border bg-white p-1 shadow-lg">
                        {cat.map((entry) => (
                          <li key={entry.criteriaKey}>
                            <label className="flex cursor-pointer gap-1 px-1 py-0.5 text-xs hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={items.some((x) => x.key === entry.criteriaKey)}
                                onChange={() =>
                                  toggleLamSang(day.date, entry.criteriaKey, entry.title)
                                }
                              />
                              {entry.title}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {!items.length && !inIwp ? (
                    <span className="text-slate-300">—</span>
                  ) : null}
                </div>
              );
            },
          },
          {
            id: "ax_rit",
            header: session.ritDates.size
              ? "RIT · ứng viên"
              : "RIT",
            minWidth: aw,
            cellClassName: (day) =>
              baCellToneClass(session.ritDates.has(day.date) ? "rit" : "none"),
            render: (day) => {
              const chips = sbapRitChips.ritByDate[day.date] || [];
              const cdhaChips = sbapRitChips.ritCdhaByDate[day.date] || [];
              if (!chips.length && !cdhaChips.length) {
                return session.ritDates.has(day.date) ? (
                  <span className="text-center bv103-type-label">·</span>
                ) : (
                  <span className="text-slate-300">—</span>
                );
              }
              return (
                <div className="flex flex-col gap-0.5">
                  {chips.map((x) => (
                    <span
                      key={x.id}
                      className="truncate rounded bg-emerald-200/80 px-0.5 bv103-type-label font-semibold text-emerald-950"
                      title={`${x.benh_pham} · ${x.vi_khuan} — RIT (cùng bệnh phẩm)`}
                    >
                      +{x.vi_khuan || x.benh_pham}
                    </span>
                  ))}
                  {cdhaChips.map((c) => (
                    <span
                      key={c.id}
                      className="truncate rounded bg-emerald-100 px-0.5 bv103-type-label font-semibold text-emerald-900"
                      title={`${c.mo_ta_benh_ly || "CĐHA"} — RIT`}
                    >
                      XQ · {c.mo_ta_benh_ly || c.loai || "CĐHA"}
                    </span>
                  ))}
                </div>
              );
            },
          },
          {
            id: "ax_sbap",
            header: session.sbapLabel
              ? `${session.sbapLabel} · ứng viên`
              : "SBAP · ứng viên",
            minWidth: aw,
            cellClassName: (day) =>
              baCellToneClass(session.sbapDates.has(day.date) ? "sbap" : "none"),
            render: (day) => {
              const chips = sbapRitChips.sbapByDate[day.date] || [];
              if (!chips.length) {
                return session.sbapDates.has(day.date) ? (
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
                      className={`truncate rounded px-0.5 text-left bv103-type-label font-semibold hover:opacity-90 ${
                        b.organismMatched
                          ? "bg-sky-400/90 text-sky-950 ring-1 ring-sky-600"
                          : "bg-sky-200/80 text-sky-950"
                      }`}
                      title={
                        b.organismMatched
                          ? `Cấy máu trùng VK ổ tại chỗ — ứng viên Secondary · ${b.vi_khuan}`
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
            id: "ax_ket_luan",
            header: "Kết luận",
            minWidth: aw,
            cellClassName: (day) =>
              baCellToneClass(
                index.date.slice(0, 10) === day.date ? "index" : "none",
              ),
            render: (day) => {
              const isIx = index.date.slice(0, 10) === day.date;
              return (
                <div className="flex flex-col gap-0.5">
                  <NkbvBaConcludeCell
                    date={day.date}
                    xnOnDay={xnByDate[day.date] || []}
                    cdhaOnDay={showCdha ? cdhaByDate[day.date] || [] : []}
                    priorEvents={priorEvents}
                    openSiteSessions={openSiteSessions}
                    analysisDispositions={analysisDispositions}
                    sampleConclusions={sampleConclusions}
                    activeSessionRit={activeSessionRit}
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
                          : panel === "UTI"
                            ? utiVerdict?.result.classification || "SUTI / CAUTI"
                            : panel === "PNEU"
                              ? pneuVerdict?.result.classification || "PNU / HAP"
                              : panel === "BSI"
                                ? bsiVerdict?.result.classification || "LCBI / BSI"
                                : "Kết luận"
                      }
                      onChange={(e) => onDraftChange({ ketLuan: e.target.value })}
                    />
                  ) : null}
                </div>
              );
            },
          },
          {
            id: "ax_ghi_chu",
            header: "Ghi chú",
            minWidth: BA_DAY_COL_W_NARROW,
            render: (day) => (
              <input
                className="w-full bg-transparent bv103-type-label outline-none"
                value={draft.notesByDate[day.date] || ""}
                disabled={!allowedEdit}
                title={draft.notesByDate[day.date] || "Ghi chú"}
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
          <p className="mt-2 text-xs text-amber-800">
            Thiếu slot bảng chung — truyền children để gắn cột phân tích.
          </p>
        );
      })()}

    </section>
  );
}
