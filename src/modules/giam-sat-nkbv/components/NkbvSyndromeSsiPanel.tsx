"use client";

import React, { useMemo } from "react";
import {
  hospitalDayNumber,
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
import { isBloodSpecimen } from "../lib/nkbv-sbap-rit-chips";
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
  /** Ghi TC SSI lên timeline BA (SSOT bằng chứng) */
  onPersistSsiTc?: (date: string, key: string, label: string, turnOn: boolean) => void;
  allowedEdit: boolean;
  scrollRef?: (el: HTMLDivElement | null) => void;
  onScrollSync?: () => void;
  onClose: () => void;
  onOpenPrimaryBsi?: (bloodId: string) => void;
  colW?: number;
  labelW?: number;
};

function cellTone(on: boolean, kind: "sp" | "sbap" | "nsk" | "ix") {
  if (!on) return "bg-white";
  if (kind === "sp") return "bg-violet-100";
  if (kind === "sbap") return "bg-sky-100";
  if (kind === "nsk") return "bg-rose-300 font-bold";
  return "bg-violet-200 font-black text-violet-950";
}

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
  onPersistSsiTc,
  allowedEdit,
  scrollRef,
  onScrollSync,
  onClose,
  onOpenPrimaryBsi,
  colW = 100,
  labelW = 128,
}: Props) {
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
    return bloodXn.map((b) =>
      evaluateSecondaryBsiForBlood({
        blood: { id: b.id, date: b.ngay, organism: b.vi_khuan },
        sites: [
          {
            id: "site-SSI",
            majorType: "SSI",
            criteriaMet: verdict.criteriaMet || draft.readyToChot,
            sbapDates: sbap,
            criteriaWindowDates: sbap,
            siteOrganism: woundOrg,
            bloodCriterionIds: draft.bloodCriterionIds,
          },
        ],
      }),
    );
  }, [
    bloodXn,
    verdict.gate.sbapDates,
    verdict.criteriaMet,
    draft.readyToChot,
    draft.bloodCriterionIds,
    woundOrg,
  ]);

  const bloodInSbap = useMemo(
    () => bloodXn.filter((b) => verdict.gate.sbapDates.has(b.ngay.slice(0, 10))),
    [bloodXn, verdict.gate.sbapDates],
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

  const ketLuanDisplay = draft.ketLuan || verdict.ketLuanLabel || "";
  const indexDate = index.date.slice(0, 10);
  const doe = verdict.gate.doe;

  return (
    <section className="mt-3 rounded-xl border border-violet-200 bg-violet-50/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-violet-950">
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
          <label className="flex items-center gap-1 text-[11px] text-slate-700">
            <input
              type="checkbox"
              checked={draft.readyToChot || verdict.criteriaMet}
              onChange={(e) => onDraftChange({ readyToChot: e.target.checked })}
            />
            Đủ TC / sẵn sàng chốt
          </label>
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

      <p className="mt-1 text-[10px] text-violet-700">
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
      {draft.readyToChot && reportingGaps.length ? (
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
                  </span>
                  {v ? (
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold">
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
                      className="text-[10px] font-semibold text-sky-800 underline"
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

      <div
        ref={scrollRef}
        onScroll={onScrollSync}
        className="mt-3 overflow-x-auto overscroll-contain border border-violet-100 bg-white text-[10px]"
      >
        <div style={{ minWidth: labelW + Math.max(columns.length, 1) * colW }}>
          <Row label="Ngày lịch" labelW={labelW}>
            {columns.map((c) => (
              <div
                key={`d-${c.date}`}
                className="flex shrink-0 items-center justify-center border-b border-r bg-slate-50 font-semibold"
                style={{ width: colW, minWidth: colW, minHeight: 26 }}
              >
                {c.label}
              </div>
            ))}
          </Row>
          <Row label="Ngày (HD)" labelW={labelW}>
            {columns.map((c) => {
              const hd =
                c.hd ??
                hospitalDayNumber(ngayVaoVien, c.date);
              return (
                <div
                  key={`hd-${c.date}`}
                  className="flex shrink-0 items-center justify-center border-b border-r"
                  style={{ width: colW, minWidth: colW, minHeight: 22 }}
                >
                  {hd == null ? "—" : hd}
                </div>
              );
            })}
          </Row>
          <Row label="Index (mổ / TC)" labelW={labelW}>
            {columns.map((c) => {
              const isIx = indexDate === c.date;
              const isSurg = Boolean(surgeryByDate[c.date]?.length);
              return (
                <div
                  key={`ix-${c.date}`}
                  className={`flex shrink-0 items-center justify-center border-b border-r p-0.5 ${cellTone(isIx || isSurg, "ix")}`}
                  style={{ width: colW, minWidth: colW, minHeight: 40 }}
                >
                  {isIx ? (
                    <span className="line-clamp-3 text-center text-[9px] font-semibold">
                      {indexLabel || "Index"}
                    </span>
                  ) : isSurg ? (
                    <span className="text-[9px] font-semibold text-violet-800">Mổ</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </div>
              );
            })}
          </Row>
          <Row label={`SP ${verdict.gate.spDays}d`} labelW={labelW}>
            {columns.map((c) => (
              <div
                key={`sp-${c.date}`}
                className={`flex shrink-0 items-center justify-center border-b border-r ${cellTone(verdict.gate.spDates.has(c.date), "sp")}`}
                style={{ width: colW, minWidth: colW, minHeight: 22 }}
              >
                {verdict.gate.spDates.has(c.date) ? "·" : ""}
              </div>
            ))}
          </Row>
          <Row label="TC / criteria" labelW={labelW}>
            {columns.map((c) => {
              const items = tcOnDate(c.date);
              const inSp = verdict.gate.spDates.has(c.date);
              return (
                <div
                  key={`tc-${c.date}`}
                  className={`relative flex shrink-0 flex-col gap-0.5 border-b border-r p-0.5 ${inSp ? "bg-violet-50/50" : "bg-white"}`}
                  style={{ width: colW, minWidth: colW, minHeight: 48 }}
                >
                  {items.map((it) => (
                    <span
                      key={it.key}
                      className="line-clamp-2 text-[9px] font-semibold text-violet-950"
                    >
                      {it.label}
                    </span>
                  ))}
                  {allowedEdit && inSp ? (
                    <details className="mt-auto">
                      <summary className="cursor-pointer text-[9px] font-semibold text-violet-600">
                        + TC
                      </summary>
                      <ul className="absolute z-30 mt-0.5 max-h-40 w-56 overflow-auto rounded border bg-white p-1 shadow-lg">
                        {tcCatalog.map((entry) => (
                          <li key={entry.criteriaKey}>
                            <label className="flex cursor-pointer gap-1 px-1 py-0.5 text-[10px] hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={items.some((x) => x.key === entry.criteriaKey)}
                                onChange={() =>
                                  toggleTc(c.date, entry.criteriaKey, entry.title)
                                }
                              />
                              {entry.title}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              );
            })}
          </Row>
          <Row label="DOE / NSK" labelW={labelW}>
            {columns.map((c) => (
              <div
                key={`doe-${c.date}`}
                className={`flex shrink-0 items-center justify-center border-b border-r ${cellTone(doe === c.date, "nsk")}`}
                style={{ width: colW, minWidth: colW, minHeight: 26 }}
              >
                {doe === c.date ? "DOE" : ""}
              </div>
            ))}
          </Row>
          <Row label="SBAP 17d" labelW={labelW}>
            {columns.map((c) => {
              const chips = bloodInSbap.filter((b) => b.ngay.slice(0, 10) === c.date);
              return (
                <div
                  key={`sbap-${c.date}`}
                  className={`flex shrink-0 flex-col items-center justify-center gap-0.5 border-b border-r p-0.5 ${cellTone(verdict.gate.sbapDates.has(c.date), "sbap")}`}
                  style={{ width: colW, minWidth: colW, minHeight: 20 }}
                >
                  {chips.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      disabled={!onOpenPrimaryBsi}
                      onClick={() => onOpenPrimaryBsi?.(b.id)}
                      className="max-w-full truncate rounded bg-sky-200/80 px-1 text-[9px] font-semibold text-sky-950 hover:bg-sky-300"
                      title={`Cấy máu (+) ${b.vi_khuan} — click xét Secondary BSI`}
                    >
                      🩸 {b.vi_khuan || "Máu (+)"}
                    </button>
                  ))}
                </div>
              );
            })}
          </Row>
          <Row label="Kết luận" labelW={labelW}>
            {columns.map((c) => {
              const isIx = indexDate === c.date || doe === c.date;
              return (
                <div
                  key={`kl-${c.date}`}
                  className={`flex shrink-0 items-center border-b border-r px-0.5 ${isIx ? "bg-amber-50" : "bg-white"}`}
                  style={{ width: colW, minWidth: colW, minHeight: 36 }}
                >
                  {isIx ? (
                    <input
                      className="w-full bg-transparent text-center text-[9px] font-semibold outline-none"
                      value={ketLuanDisplay}
                      disabled={!allowedEdit}
                      placeholder={verdict.result.classification || "SSI"}
                      onChange={(e) => onDraftChange({ ketLuan: e.target.value })}
                    />
                  ) : (
                    <span className="w-full text-center text-slate-300">—</span>
                  )}
                </div>
              );
            })}
          </Row>
          <Row label="Ghi chú" labelW={labelW}>
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
          </Row>
        </div>
      </div>
    </section>
  );
}

function Row({
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
        <span className="truncate" title={label}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
