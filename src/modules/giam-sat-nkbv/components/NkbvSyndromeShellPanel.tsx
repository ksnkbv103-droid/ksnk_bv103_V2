import React, { useEffect, useMemo } from "react";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import type {
  BaGridActiveIndex,
  BaGridCdhaCell,
  BaGridColumn,
  BaGridXnCell,
} from "../lib/nkbv-ba-grid-engine";
import type { BaAnalysisSessionDraft } from "../lib/nkbv-ba-analysis-session";
import { isVaeClassLabel } from "../lib/nkbv-syndrome-shell-helpers";
import type { ViSinhAnalysisDispositionRow } from "../lib/nkbv-vi-sinh-analysis-status";
import type {
  OpenSiteSessionForSbap,
  PriorEventForDisposition,
} from "../lib/nkbv-index-event-disposition";
import { baCellToneClass } from "../lib/nkbv-ba-day-row-tone";
import { vaeEventPeriod } from "../lib/nkbv-shared-timeline";
import {
  computeVacFromDailyVent,
  type VaeVentDailyRow,
} from "../lib/nkbv-vae-vent-compute";
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
  const title = "VAE — Giám sát Biến cố Thở máy (CDC/NHSN Ch.10)";
  const indexDate = index?.date.slice(0, 10) || null;

  // Bảng thông số thở máy theo ngày
  const dailyRows = useMemo<VaeVentDailyRow[]>(
    () => draft.vaeVentDailyParams || [],
    [draft.vaeVentDailyParams],
  );

  const dailyMap = useMemo(() => {
    const m = new Map<string, VaeVentDailyRow>();
    for (const r of dailyRows) {
      if (r.date) m.set(r.date.slice(0, 10), r);
    }
    return m;
  }, [dailyRows]);

  const updateDailyCell = (date: string, patch: Partial<VaeVentDailyRow>) => {
    const existing = dailyMap.get(date) || { date, peep_min: null, fio2_min: null };
    const updated: VaeVentDailyRow = { ...existing, ...patch, date };
    const nextList = [
      ...dailyRows.filter((r) => r.date !== date),
      updated,
    ].sort((a, b) => a.date.localeCompare(b.date));
    onDraftChange({ vaeVentDailyParams: nextList });
  };

  // Tính toán VAC
  const vacResult = useMemo(() => {
    return computeVacFromDailyVent(dailyRows, {
      on_ecmo: draft.vaeOnEcmo,
      on_hfv: draft.vaeOnHfv,
      on_aprv: draft.vaeOnAprv,
    });
  }, [dailyRows, draft.vaeOnEcmo, draft.vaeOnHfv, draft.vaeOnAprv]);

  const hasVac =
    vacResult.has_stable_baseline &&
    (vacResult.peep_increase_ge_3 || vacResult.fio2_increase_ge_20);

  /** DOE = ngày suy giảm đầu tiên khi đạt VAC, hoặc draft.nsk, hoặc indexDate */
  const doe = (hasVac && vacResult.suggested_doe) || draft.nsk || indexDate || null;
  const ep = useMemo(() => (doe ? vaeEventPeriod(doe) : null), [doe]);

  // Kiểm tra IVAC: Sốt / Hạ thân nhiệt / Bạch cầu + Kháng sinh ≥ 4 QAD
  const tempOrWbcInWindow = useMemo(() => {
    if (draft.vaeTempOrWbcAbnormal) return true;
    if (!doe) return false;
    // Kiểm tra trong ±2 ngày quanh DOE
    const dObj = new Date(`${doe}T12:00:00`);
    for (let i = -2; i <= 2; i++) {
      const cur = new Date(dObj);
      cur.setDate(cur.getDate() + i);
      const ds = cur.toISOString().slice(0, 10);
      const items = draft.lamSang[ds] || [];
      if (items.some((it) => it.key === "fever" || it.key === "fever_or_wbc")) {
        return true;
      }
    }
    return false;
  }, [draft.vaeTempOrWbcAbnormal, draft.lamSang, doe]);

  const hasIvac = Boolean(hasVac && tempOrWbcInWindow && draft.vaeNewAntimicrobial4d);

  // Kiểm tra PVAP: IVAC + Đờm mủ hoặc cấy định lượng dịch hô hấp (+)
  const hasRespiratoryOrganism = useMemo(() => {
    if (draft.vaePurulentSputum) return true;
    if (index && index.kind === "XN") {
      const x = xn.find((it) => it.id === index.id);
      return Boolean(x && x.vi_khuan && x.vi_khuan.trim() !== "");
    }
    return false;
  }, [draft.vaePurulentSputum, index, xn]);

  const hasPvap = Boolean(hasIvac && hasRespiratoryOrganism);

  // Phân cấp hội chứng VAE
  const computedClassification = hasPvap
    ? "PVAP"
    : hasIvac
      ? "IVAC"
      : hasVac
        ? "VAC"
        : "";

  // Tự động đồng bộ kết quả tính toán vào draft phiên khi theo dõi CDC
  useEffect(() => {
    if (analysisMode === "MANUAL") return;
    if (!hasVac || !vacResult.suggested_doe) return;
    const nextDoe = vacResult.suggested_doe;
    const nextTier = computedClassification;
    if (
      draft.nsk !== nextDoe ||
      draft.ketLuan !== nextTier ||
      !draft.eventEstablished
    ) {
      onDraftChange({
        nsk: nextDoe,
        ketLuan: nextTier,
        eventEstablished: Boolean(nextTier),
      });
    }
  }, [
    analysisMode,
    hasVac,
    vacResult.suggested_doe,
    computedClassification,
    draft.nsk,
    draft.ketLuan,
    draft.eventEstablished,
    onDraftChange,
  ]);

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
          <span className="line-clamp-3 text-center bv103-type-label font-semibold">
            {indexLabel || "Index"}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      id: "vae_peep",
      header: "PEEP min",
      minWidth: 54,
      render: (day) => {
        const row = dailyMap.get(day.date);
        return (
          <input
            type="number"
            step="0.5"
            min="0"
            max="30"
            disabled={!allowedEdit}
            placeholder="cm"
            className="w-full text-center bg-transparent bv103-type-label font-mono font-medium outline-none border-b border-transparent focus:border-violet-400"
            value={row?.peep_min ?? ""}
            onChange={(e) => {
              const val = e.target.value === "" ? null : Number(e.target.value);
              updateDailyCell(day.date, { peep_min: val });
            }}
          />
        );
      },
    },
    {
      id: "vae_fio2",
      header: "FiO₂ min",
      minWidth: 54,
      render: (day) => {
        const row = dailyMap.get(day.date);
        return (
          <input
            type="number"
            step="1"
            min="21"
            max="100"
            disabled={!allowedEdit}
            placeholder="%"
            className="w-full text-center bg-transparent bv103-type-label font-mono font-medium outline-none border-b border-transparent focus:border-violet-400"
            value={row?.fio2_min ?? ""}
            onChange={(e) => {
              const val = e.target.value === "" ? null : Number(e.target.value);
              updateDailyCell(day.date, { fio2_min: val });
            }}
          />
        );
      },
    },
    {
      id: "vae_ep",
      header: "Event period",
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
          return (
            <span className="bv103-type-label font-bold text-rose-700 bg-rose-100 px-1 py-0.5 rounded">
              DOE
            </span>
          );
        }
        if (day.date >= ep.start && day.date <= ep.end) {
          return <span className="bv103-type-label text-violet-800 font-medium">EP</span>;
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
                className="w-full border-t border-amber-200/60 bg-transparent pt-0.5 bv103-type-label font-semibold outline-none text-violet-950"
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
    <section className={`mt-3 ${C.inset} border-violet-200 bg-violet-50/40 p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`${C.sectionTitle} text-violet-950`}>{title}</h3>
            {computedClassification ? (
              <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 text-xs border border-emerald-300">
                🎯 {computedClassification} Đạt chuẩn CDC/NHSN
              </span>
            ) : hasVac ? (
              <span className="rounded-full bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 text-xs border border-amber-300">
                Đạt VAC (chờ IVAC/PVAP)
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs border border-slate-200">
                Chưa đạt VAC
              </span>
            )}
          </div>

          <p className="text-xs text-violet-900 leading-relaxed">
            Index {indexDate || "—"}
            {indexLabel ? ` · ${indexLabel}` : ""}
            {doe ? ` · DOE gợi ý: ${doe}` : ""}
            {ep ? ` · Event Period (14d): ${ep.start} → ${ep.end}` : ""}
          </p>

          {/* Reasoning banner */}
          <div
            className={`rounded p-2 text-xs leading-snug border ${
              hasVac
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                : "bg-amber-50/80 border-amber-200 text-amber-900"
            }`}
          >
            <div className="font-medium">{vacResult.reason}</div>
            <div className="mt-1 text-xs text-slate-600">
              Nhập PEEP tối thiểu (cmH₂O) và FiO₂ tối thiểu (%) trên các cột ngày bên dưới. CDC tự quét chuỗi ≥2 ngày ổn định rồi ≥2 ngày suy giảm (ΔPEEP ≥ 3 hoặc ΔFiO₂ ≥ 20%).
            </div>
          </div>

          {/* Tiêu chí phân cấp IVAC & PVAP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            <div className="bg-white/80 rounded border border-violet-150 p-2 text-xs space-y-1.5">
              <span className="font-semibold text-violet-950 block">
                Cấp 2 — IVAC (Infection-related VAC):
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-800">
                <input
                  type="checkbox"
                  disabled={!allowedEdit}
                  checked={tempOrWbcInWindow}
                  onChange={(e) =>
                    onDraftChange({ vaeTempOrWbcAbnormal: e.target.checked })
                  }
                  className="rounded text-violet-600 focus:ring-violet-500"
                />
                <span>Sốt (&gt;38°C) / Hạ nhiệt (&lt;36°C) hoặc Bạch cầu bất thường (±2 ngày quanh DOE)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-800">
                <input
                  type="checkbox"
                  disabled={!allowedEdit}
                  checked={Boolean(draft.vaeNewAntimicrobial4d)}
                  onChange={(e) =>
                    onDraftChange({ vaeNewAntimicrobial4d: e.target.checked })
                  }
                  className="rounded text-violet-600 focus:ring-violet-500"
                />
                <span>Bắt đầu kháng sinh mới dùng liên tục ≥ 4 ngày (QAD)</span>
              </label>
            </div>

            <div className="bg-white/80 rounded border border-violet-150 p-2 text-xs space-y-1.5">
              <span className="font-semibold text-violet-950 block">
                Cấp 3 — PVAP (Possible VAP) &amp; Ngoại lệ:
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-800">
                <input
                  type="checkbox"
                  disabled={!allowedEdit}
                  checked={Boolean(draft.vaePurulentSputum || hasRespiratoryOrganism)}
                  onChange={(e) =>
                    onDraftChange({ vaePurulentSputum: e.target.checked })
                  }
                  className="rounded text-violet-600 focus:ring-violet-500"
                />
                <span>Đờm mủ (≥25 BCĐN và ≤10 TBBM / vi trường) hoặc cấy định lượng dịch hô hấp (+)</span>
              </label>

              <div className="flex items-center gap-3 pt-0.5 text-xs text-slate-700">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!allowedEdit}
                    checked={Boolean(draft.vaeOnEcmo)}
                    onChange={(e) => onDraftChange({ vaeOnEcmo: e.target.checked })}
                  />
                  <span>ECMO</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!allowedEdit}
                    checked={Boolean(draft.vaeOnHfv)}
                    onChange={(e) => onDraftChange({ vaeOnHfv: e.target.checked })}
                  />
                  <span>HFV (Cao tần)</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!allowedEdit}
                    checked={Boolean(draft.vaeOnAprv)}
                    onChange={(e) => onDraftChange({ vaeOnAprv: e.target.checked })}
                  />
                  <span>APRV (FiO₂-only)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-2.5 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-100 border border-violet-200 shrink-0"
        >
          Đóng bảng
        </button>
      </div>

      {typeof children === "function" ? (
        children({ analysisColumns })
      ) : (
        <p className="mt-2 text-xs text-amber-800">Thiếu slot bảng chung.</p>
      )}
    </section>
  );
}

export { isShellPanel, vaeBaReadyToCreatePhieu } from "../lib/nkbv-syndrome-shell-helpers";
