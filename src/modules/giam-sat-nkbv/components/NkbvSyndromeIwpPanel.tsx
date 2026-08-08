"use client";

import React, { useMemo } from "react";
import {
  clinicalCatalogForNghiNgo,
  computeBaGridSession,
  imagingCatalogForNghiNgo,
  UTI_INFANT_CRITERIA_KEYS,
  UTI_VOIDING_CRITERIA_KEYS,
  type BaGridActiveIndex,
  type BaGridCdhaCell,
  type BaGridColumn,
  type BaGridNghiNgo,
  type BaGridSymptomByDate,
  type BaGridXnCell,
} from "../lib/nkbv-ba-grid-engine";
import {
  evaluateSecondaryBsiForBlood,
  type SecondaryBsiVerdict,
} from "../lib/nkbv-secondary-bsi-gate";
import type { BaAnalysisSessionDraft } from "../lib/nkbv-ba-analysis-session";
import type { SyndromePanelId } from "../lib/nkbv-specimen-syndrome";
import {
  ageYearsFromNgaySinh,
  buildUtiTimelineVerdict,
  isInfantLe1FromAge,
  stripUtiVoidingFromLamSang,
} from "../lib/nkbv-uti-timeline-verdict";
import {
  buildPneuTimelineVerdict,
  PNEU_AMS_CRITERIA_KEY,
  shouldShowPneuAmsInCatalog,
} from "../lib/nkbv-pneu-timeline-verdict";
import { buildBsiTimelineVerdict } from "../lib/nkbv-bsi-timeline-verdict";
import { mergeLamSangByDate } from "../lib/nkbv-ba-lam-sang-merge";
import { buildSbapRitChips, isBloodSpecimen } from "../lib/nkbv-sbap-rit-chips";

type Device = {
  id: string;
  device_type: string;
  insertion_date: string;
  removal_date: string | null;
};

type Props = {
  panel: "PNEU" | "UTI" | "BSI";
  ngayVaoVien: string;
  ngayRaVien?: string | null;
  ngaySinh?: string | null;
  /** Trục cột ngày SSOT từ parent — không tự build. */
  columns: BaGridColumn[];
  index: BaGridActiveIndex;
  xn: BaGridXnCell[];
  cdha: BaGridCdhaCell[];
  devices?: Device[];
  defaultKhoa?: string | null;
  allowedEdit: boolean;
  draft: BaAnalysisSessionDraft;
  /** LS đã lưu trên bảng chung BA — merge với draft phiên. */
  baLamSangByDate?: BaGridSymptomByDate;
  onDraftChange: (patch: Partial<BaAnalysisSessionDraft>) => void;
  /** Đồng bộ tick LS panel → milestone bảng chung. */
  onPersistLamSang?: (
    date: string,
    criteriaKey: string,
    title: string,
    turnOn: boolean,
  ) => void;
  scrollRef?: (el: HTMLDivElement | null) => void;
  onScrollSync?: () => void;
  onClose: () => void;
  onOpenPrimaryBsi?: (bloodId: string) => void;
  colW?: number;
  labelW?: number;
};

function cellTone(on: boolean, kind: "iwp" | "rit" | "sbap" | "nsk" | "x") {
  if (!on) return "bg-white";
  if (kind === "iwp") return "bg-rose-100";
  if (kind === "rit") return "bg-emerald-100";
  if (kind === "sbap") return "bg-sky-100";
  if (kind === "nsk") return "bg-rose-300 font-bold";
  return "bg-rose-200 font-black text-rose-900";
}

export function deviceDatesForPanel(
  panel: "PNEU" | "UTI" | "BSI",
  devices: Device[],
  ngayRaVien?: string | null,
): string[] {
  const want =
    panel === "BSI"
      ? /CVC|CENTRAL|LINE/i
      : panel === "UTI"
        ? /FOLEY|URINARY|CATHETER/i
        : /VENT|THỞ MÁY|THO MAY/i;
  const dates: string[] = [];
  for (const d of devices) {
    if (!want.test(d.device_type)) continue;
    const start = d.insertion_date.slice(0, 10);
    const end = (d.removal_date || ngayRaVien || start).slice(0, 10);
    let c = start;
    let g = 0;
    while (c <= end && g < 90) {
      dates.push(c);
      const x = new Date(`${c}T12:00:00`);
      x.setDate(x.getDate() + 1);
      c = x.toISOString().slice(0, 10);
      g += 1;
    }
  }
  return dates;
}

export default function NkbvSyndromeIwpPanel({
  panel,
  ngayVaoVien,
  ngayRaVien,
  ngaySinh,
  columns,
  index,
  xn,
  cdha,
  devices = [],
  defaultKhoa,
  allowedEdit,
  draft,
  baLamSangByDate = {},
  onDraftChange,
  onPersistLamSang,
  scrollRef,
  onScrollSync,
  onClose,
  onOpenPrimaryBsi,
  colW = 100,
  labelW = 128,
}: Props) {
  const nghiNgo = panel as BaGridNghiNgo;
  const ageYears = useMemo(
    () => ageYearsFromNgaySinh(ngaySinh, index.date),
    [ngaySinh, index.date],
  );
  const isInfant = isInfantLe1FromAge(ageYears);

  const imagingCat = useMemo(() => imagingCatalogForNghiNgo(nghiNgo), [nghiNgo]);
  const showCdha = panel !== "UTI";

  const bloodXn = useMemo(() => xn.filter((x) => isBloodSpecimen(x.benh_pham)), [xn]);

  const deviceCanThiep = useMemo(
    () => deviceDatesForPanel(panel, devices, ngayRaVien),
    [panel, devices, ngayRaVien],
  );

  const canThiepDates = draft.canThiepDates.length ? draft.canThiepDates : deviceCanThiep;

  const foleyDevice = useMemo(() => {
    if (panel !== "UTI") return null;
    return (
      devices.find((d) => /FOLEY|URINARY|CATHETER/i.test(d.device_type)) || null
    );
  }, [panel, devices]);

  const ventDevice = useMemo(() => {
    if (panel !== "PNEU") return null;
    return (
      devices.find((d) => /VENT|THỞ MÁY|THO MAY/i.test(d.device_type)) || null
    );
  }, [panel, devices]);

  const cvcDevice = useMemo(() => {
    if (panel !== "BSI") return null;
    return (
      devices.find((d) => /CVC|CENTRAL|LINE/i.test(d.device_type)) || null
    );
  }, [panel, devices]);

  const indexXn = useMemo(() => {
    if (index.kind !== "XN") return null;
    return xn.find((x) => x.id === index.id) || null;
  }, [index, xn]);

  const indexCdha = useMemo(() => {
    if (index.kind !== "CDHA") return null;
    return cdha.find((c) => c.id === index.id) || null;
  }, [index, cdha]);

  /** Session grid trước — UTI verdict cần iwp/nsk. */
  const sessionBase = useMemo(() => {
    const merged = mergeLamSangByDate(baLamSangByDate, draft.lamSang);
    const lamSang = stripUtiVoidingFromLamSang(merged, canThiepDates);
    const tieuChuan: BaGridSymptomByDate = { ...lamSang };
    if (panel === "PNEU") {
      for (const id of draft.bloodCriterionIds) {
        const b = bloodXn.find((x) => x.id === id);
        if (!b) continue;
        const d = b.ngay.slice(0, 10);
        const cur = tieuChuan[d] || [];
        if (!cur.some((c) => c.key === `blood:${id}`)) {
          tieuChuan[d] = [
            ...cur,
            { key: `blood:${id}`, label: `Cấy máu (+) ${b.vi_khuan}`, id },
          ];
        }
      }
    }
    const khoaByDate: Record<string, string> = {};
    if (defaultKhoa) khoaByDate[index.date.slice(0, 10)] = defaultKhoa;
    return { lamSang, tieuChuan, khoaByDate };
  }, [
    baLamSangByDate,
    draft.lamSang,
    draft.bloodCriterionIds,
    bloodXn,
    panel,
    canThiepDates,
    defaultKhoa,
    index.date,
  ]);

  const provisionalIwp = useMemo(() => {
    const ix = index.date.slice(0, 10);
    const iwp = new Set<string>();
    for (let i = -3; i <= 3; i += 1) {
      const d = new Date(`${ix}T12:00:00`);
      d.setDate(d.getDate() + i);
      iwp.add(d.toISOString().slice(0, 10));
    }
    return iwp;
  }, [index.date]);

  const utiVerdictPreview = useMemo(() => {
    if (panel !== "UTI") return null;
    return buildUtiTimelineVerdict({
      indexXn,
      lamSang: sessionBase.lamSang,
      canThiepDates,
      iwpDates: provisionalIwp,
      nsk: null,
      bloodXn,
      abutiBloodIds: draft.bloodCriterionIds,
      isInfantLe1: isInfant,
      devicePlacedDate: foleyDevice?.insertion_date,
      deviceRemovedDate: foleyDevice?.removal_date,
    });
  }, [
    panel,
    indexXn,
    sessionBase.lamSang,
    canThiepDates,
    provisionalIwp,
    bloodXn,
    draft.bloodCriterionIds,
    isInfant,
    foleyDevice,
  ]);

  const pneuVerdictPreview = useMemo(() => {
    if (panel !== "PNEU") return null;
    return buildPneuTimelineVerdict({
      indexKind: index.kind,
      indexXn,
      indexCdha,
      cdha,
      lamSang: sessionBase.lamSang,
      canThiepDates,
      iwpDates: provisionalIwp,
      nsk: null,
      bloodCriterionIds: draft.bloodCriterionIds,
      bloodXn,
      patientAge: ageYears,
      devicePlacedDate: ventDevice?.insertion_date,
      deviceRemovedDate: ventDevice?.removal_date,
      hasCardiopulmonaryDisease: Boolean(draft.hasCardiopulmonaryDisease),
    });
  }, [
    panel,
    index.kind,
    indexXn,
    indexCdha,
    cdha,
    sessionBase.lamSang,
    canThiepDates,
    provisionalIwp,
    draft.bloodCriterionIds,
    draft.hasCardiopulmonaryDisease,
    bloodXn,
    ageYears,
    ventDevice,
  ]);

  const bsiVerdictPreview = useMemo(() => {
    if (panel !== "BSI") return null;
    return buildBsiTimelineVerdict({
      indexXn,
      bloodXn,
      lamSang: sessionBase.lamSang,
      canThiepDates,
      iwpDates: provisionalIwp,
      nsk: null,
      isInfantLe1: isInfant,
      devicePlacedDate: cvcDevice?.insertion_date,
      deviceRemovedDate: cvcDevice?.removal_date,
      localizedSite: draft.bsiLocalizedSite,
    });
  }, [
    panel,
    indexXn,
    bloodXn,
    sessionBase.lamSang,
    canThiepDates,
    provisionalIwp,
    isInfant,
    cvcDevice,
    draft.bsiLocalizedSite,
  ]);

  const session = useMemo(() => {
    const criteriaMet =
      panel === "UTI"
        ? Boolean(utiVerdictPreview?.criteriaMet || draft.readyToChot)
        : panel === "PNEU"
          ? Boolean(pneuVerdictPreview?.criteriaMet || draft.readyToChot)
          : panel === "BSI"
            ? Boolean(bsiVerdictPreview?.criteriaMet || draft.readyToChot)
            : draft.readyToChot;
    const ketOverride =
      panel === "UTI"
        ? draft.ketLuan || utiVerdictPreview?.ketLuanLabel || null
        : panel === "PNEU"
          ? draft.ketLuan || pneuVerdictPreview?.ketLuanLabel || null
          : panel === "BSI"
            ? draft.ketLuan || bsiVerdictPreview?.ketLuanLabel || null
            : draft.ketLuan || null;
    return computeBaGridSession({
      ngayVaoVien,
      ngayRaVien,
      xn,
      cdha,
      activeIndex: index,
      nghiNgo,
      symptomDates: {},
      tieuChuanByDate: sessionBase.tieuChuan,
      trieuChungLamSangByDate: sessionBase.lamSang,
      khoaByDate: sessionBase.khoaByDate,
      canThiepDates,
      criteriaMetPreview: criteriaMet,
      ketLuanOverride: ketOverride,
    });
  }, [
    panel,
    utiVerdictPreview,
    pneuVerdictPreview,
    bsiVerdictPreview,
    draft.readyToChot,
    draft.ketLuan,
    ngayVaoVien,
    ngayRaVien,
    xn,
    cdha,
    index,
    nghiNgo,
    sessionBase,
    canThiepDates,
  ]);

  const utiVerdict = useMemo(() => {
    if (panel !== "UTI") return null;
    return buildUtiTimelineVerdict({
      indexXn,
      lamSang: sessionBase.lamSang,
      canThiepDates,
      iwpDates: session.iwpDates,
      nsk: session.nsk,
      bloodXn,
      abutiBloodIds: draft.bloodCriterionIds,
      isInfantLe1: isInfant,
      devicePlacedDate: foleyDevice?.insertion_date,
      deviceRemovedDate: foleyDevice?.removal_date,
    });
  }, [
    panel,
    indexXn,
    sessionBase.lamSang,
    canThiepDates,
    session.iwpDates,
    session.nsk,
    bloodXn,
    draft.bloodCriterionIds,
    isInfant,
    foleyDevice,
  ]);

  const pneuVerdict = useMemo(() => {
    if (panel !== "PNEU") return null;
    return buildPneuTimelineVerdict({
      indexKind: index.kind,
      indexXn,
      indexCdha,
      cdha,
      lamSang: sessionBase.lamSang,
      canThiepDates,
      iwpDates: session.iwpDates,
      nsk: session.nsk,
      bloodCriterionIds: draft.bloodCriterionIds,
      bloodXn,
      patientAge: ageYears,
      devicePlacedDate: ventDevice?.insertion_date,
      deviceRemovedDate: ventDevice?.removal_date,
      hasCardiopulmonaryDisease: Boolean(draft.hasCardiopulmonaryDisease),
    });
  }, [
    panel,
    index.kind,
    indexXn,
    indexCdha,
    cdha,
    sessionBase.lamSang,
    canThiepDates,
    session.iwpDates,
    session.nsk,
    draft.bloodCriterionIds,
    draft.hasCardiopulmonaryDisease,
    bloodXn,
    ageYears,
    ventDevice,
  ]);

  const bsiVerdict = useMemo(() => {
    if (panel !== "BSI") return null;
    return buildBsiTimelineVerdict({
      indexXn,
      bloodXn,
      lamSang: sessionBase.lamSang,
      canThiepDates,
      iwpDates: session.iwpDates,
      nsk: session.nsk,
      isInfantLe1: isInfant,
      devicePlacedDate: cvcDevice?.insertion_date,
      deviceRemovedDate: cvcDevice?.removal_date,
      localizedSite: draft.bsiLocalizedSite,
    });
  }, [
    panel,
    indexXn,
    bloodXn,
    sessionBase.lamSang,
    canThiepDates,
    session.iwpDates,
    session.nsk,
    isInfant,
    cvcDevice,
    draft.bsiLocalizedSite,
  ]);

  const bloodInIwp = useMemo(() => {
    return bloodXn.filter((b) => session.iwpDates.has(b.ngay.slice(0, 10)));
  }, [bloodXn, session.iwpDates]);

  const bloodInSbap = useMemo(() => {
    return bloodXn.filter((b) => session.sbapDates.has(b.ngay.slice(0, 10)));
  }, [bloodXn, session.sbapDates]);

  /** Chip dữ liệu thật trên hàng SBAP (cấy máu) / RIT (cấy cùng bệnh phẩm) */
  const sbapRitChips = useMemo(
    () =>
      buildSbapRitChips({
        xn,
        indexId: index.kind === "XN" ? index.id : null,
        indexSpecimen: indexXn?.benh_pham || null,
        ritDates: session.ritDates,
        sbapDates: session.sbapDates,
      }),
    [xn, index, indexXn, session.ritDates, session.sbapDates],
  );

  const sbsiVerdicts: SecondaryBsiVerdict[] = useMemo(() => {
    if (panel === "BSI") return [];
    const sbap = [...session.sbapDates];
    const iwp = [...session.iwpDates];
    const siteOrg =
      xn.find((x) => x.id === index.id)?.vi_khuan ||
      xn.find((x) => !/MÁU|MAU|BLOOD/i.test(x.benh_pham))?.vi_khuan ||
      null;
    const criteriaMet =
      panel === "UTI"
        ? Boolean(utiVerdict?.criteriaMet || draft.readyToChot)
        : panel === "PNEU"
          ? Boolean(pneuVerdict?.criteriaMet || draft.readyToChot)
          : draft.readyToChot || Boolean(session.nsk);
    return bloodXn.map((b) =>
      evaluateSecondaryBsiForBlood({
        blood: { id: b.id, date: b.ngay, organism: b.vi_khuan },
        sites: [
          {
            id: `site-${panel}`,
            majorType: panel,
            criteriaMet,
            sbapDates: sbap,
            criteriaWindowDates: iwp,
            siteOrganism: siteOrg,
            bloodCriterionIds: draft.bloodCriterionIds,
          },
        ],
      }),
    );
  }, [
    panel,
    session.sbapDates,
    session.iwpDates,
    session.nsk,
    bloodXn,
    index.id,
    xn,
    draft.readyToChot,
    draft.bloodCriterionIds,
    utiVerdict,
    pneuVerdict,
  ]);

  const catalogForDate = (date: string) => {
    const base = clinicalCatalogForNghiNgo(nghiNgo);
    const foleyOn = canThiepDates.some((d) => d.slice(0, 10) === date);
    return base.filter((cat) => {
      if (panel === "UTI" && foleyOn && UTI_VOIDING_CRITERIA_KEYS.has(cat.criteriaKey)) {
        return false;
      }
      if (
        panel === "UTI" &&
        UTI_INFANT_CRITERIA_KEYS.has(cat.criteriaKey) &&
        !isInfant
      ) {
        return false;
      }
      if (
        panel === "PNEU" &&
        cat.criteriaKey === PNEU_AMS_CRITERIA_KEY &&
        !shouldShowPneuAmsInCatalog(ageYears)
      ) {
        return false;
      }
      return true;
    });
  };

  const toggleLamSang = (date: string, key: string, label: string) => {
    if (!allowedEdit) return;
    if (
      panel === "UTI" &&
      UTI_VOIDING_CRITERIA_KEYS.has(key) &&
      canThiepDates.some((d) => d.slice(0, 10) === date)
    ) {
      return;
    }
    const merged = mergeLamSangByDate(baLamSangByDate, draft.lamSang);
    const cur = merged[date] || [];
    const wasOn = cur.some((x) => x.key === key);
    const next: BaGridSymptomByDate = { ...draft.lamSang };
    if (wasOn) {
      next[date] = (draft.lamSang[date] || []).filter((x) => x.key !== key);
    } else {
      next[date] = [...(draft.lamSang[date] || []), { key, label }];
    }
    onDraftChange({
      lamSang:
        panel === "UTI" ? stripUtiVoidingFromLamSang(next, canThiepDates) : next,
    });
    onPersistLamSang?.(date, key, label, !wasOn);
  };

  const toggleBloodPnu2 = (id: string) => {
    if (!allowedEdit || panel !== "PNEU") return;
    const ids = draft.bloodCriterionIds.includes(id)
      ? draft.bloodCriterionIds.filter((x) => x !== id)
      : [...draft.bloodCriterionIds, id];
    onDraftChange({ bloodCriterionIds: ids });
  };

  const toggleAbutiBlood = (id: string) => {
    if (!allowedEdit || panel !== "UTI") return;
    const ids = draft.bloodCriterionIds.includes(id)
      ? draft.bloodCriterionIds.filter((x) => x !== id)
      : [...draft.bloodCriterionIds, id];
    onDraftChange({ bloodCriterionIds: ids });
  };

  const toggleCanThiep = (date: string) => {
    if (!allowedEdit) return;
    const base = [...canThiepDates];
    const on = base.some((d) => d.slice(0, 10) === date);
    const next = on
      ? base.filter((d) => d.slice(0, 10) !== date)
      : [...base, date];
    const patch: Partial<BaAnalysisSessionDraft> = { canThiepDates: next };
    if (panel === "UTI" && !on) {
      patch.lamSang = stripUtiVoidingFromLamSang(draft.lamSang, next);
    }
    onDraftChange(patch);
  };

  const xnInWindow = (date: string) =>
    xn.filter(
      (x) =>
        x.ngay.slice(0, 10) === date &&
        (session.iwpDates.has(date) ||
          session.sbapDates.has(date) ||
          session.attributedXnIds.includes(x.id) ||
          x.id === index.id),
    );

  const cdhaInWindow = (date: string) =>
    cdha.filter(
      (c) =>
        c.ngay.slice(0, 10) === date &&
        (session.iwpDates.has(date) ||
          session.sbapDates.has(date) ||
          session.attributedCdhaIds.includes(c.id) ||
          c.id === index.id ||
          imagingCat.length > 0),
    );

  const ketLuanDisplay =
    panel === "UTI"
      ? draft.ketLuan || utiVerdict?.ketLuanLabel || session.ketLuan?.summary || ""
      : panel === "PNEU"
        ? draft.ketLuan || pneuVerdict?.ketLuanLabel || session.ketLuan?.summary || ""
        : panel === "BSI"
          ? draft.ketLuan || bsiVerdict?.ketLuanLabel || session.ketLuan?.summary || ""
          : draft.ketLuan || session.ketLuan?.summary || "";

  return (
    <section className="mt-3 rounded-xl border border-rose-200 bg-rose-50/30 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-rose-950">
            {panel === "UTI"
              ? "Bảng UTI/CAUTI — IWP · DOE · RIT · SBAP · Foley"
              : panel === "PNEU"
                ? "Bảng PNEU/VAP/HAP — IWP · DOE · RIT · SBAP · Vent"
                : panel === "BSI"
                  ? "Bảng Primary BSI/CLABSI — IWP · DOE · RIT · SBAP · CVC"
                  : `Bảng ${panel} — IWP · DOE · RIT · SBAP`}
          </h3>
          <p className="mt-0.5 text-[11px] text-rose-800">
            Index {session.indexDate || "—"}
            {session.nsk ? ` · NSK ${session.nsk}` : ""}
            {panel === "UTI" && utiVerdict
              ? ` · ${utiVerdict.result.classification}`
              : panel === "PNEU" && pneuVerdict
                ? ` · ${pneuVerdict.result.classification}`
                : panel === "BSI" && bsiVerdict
                  ? ` · ${bsiVerdict.result.classification}`
                  : session.ketLuan
                    ? ` · ${session.ketLuan.summary}`
                    : ""}
            {panel === "UTI" && ageYears == null
              ? " · Nhánh người lớn (chưa có ngày sinh)"
              : null}
            {panel === "UTI" && isInfant ? " · SUTI 2 (≤1 tuổi)" : null}
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
            <label className="flex items-center gap-1 text-[11px] text-slate-700">
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
          ) : null}
          <label className="flex items-center gap-1 text-[11px] text-slate-700">
            <input
              type="checkbox"
              checked={
                panel === "UTI"
                  ? draft.readyToChot || Boolean(utiVerdict?.criteriaMet)
                  : panel === "PNEU"
                    ? draft.readyToChot || Boolean(pneuVerdict?.criteriaMet)
                    : panel === "BSI"
                      ? draft.readyToChot || Boolean(bsiVerdict?.criteriaMet)
                      : draft.readyToChot
              }
              onChange={(e) => onDraftChange({ readyToChot: e.target.checked })}
            />
            Đủ TC / sẵn sàng chốt
          </label>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100"
          >
            Đóng bảng
          </button>
        </div>
      </div>

      {panel === "UTI" && utiVerdict?.lab.warnings.length ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">
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
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">
          <strong>Gate PNEU (IWP):</strong> {pneuVerdict.gate.warnings.join(" · ")}
          {!pneuVerdict.criteriaMet ? (
            <span className="ml-1 font-semibold text-rose-800">
              — chưa đủ chốt ({pneuVerdict.result.classification})
            </span>
          ) : null}
        </div>
      ) : null}

      {panel === "BSI" && bsiVerdict?.gate.warnings.length ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">
          <strong>Gate Primary BSI:</strong> {bsiVerdict.gate.warnings.join(" · ")}
          {!bsiVerdict.criteriaMet ? (
            <span className="ml-1 font-semibold text-rose-800">
              — {bsiVerdict.result.classification}
            </span>
          ) : null}
        </div>
      ) : null}

      {panel === "BSI" && bsiVerdict?.result.classification === "SECONDARY_BSI" ? (
        <p className="mt-2 text-[11px] font-semibold text-emerald-800">
          Secondary BSI từ ổ khu trú — không ghi CLABSI trên bảng này.
        </p>
      ) : null}

      {panel === "PNEU" && bloodInIwp.length > 0 ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">
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
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold">
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

      {panel === "UTI" && bloodInSbap.length > 0 ? (
        <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1.5 text-[11px] text-sky-950">
          <strong>Cấy máu ∈ SBAP — ABUTI / Secondary (không nấm):</strong>
          <ul className="mt-1 space-y-1">
            {bloodInSbap.map((b) => {
              const on = draft.bloodCriterionIds.includes(b.id);
              const v = sbsiVerdicts.find((x) => x.bloodId === b.id);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!allowedEdit}
                      onChange={() => toggleAbutiBlood(b.id)}
                    />
                    <span>
                      {b.ngay} · {b.vi_khuan}
                      {b.so_luong ? ` · SL ${b.so_luong}` : ""}
                    </span>
                  </label>
                  {v ? (
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold">
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

      {panel !== "BSI" && sbsiVerdicts.some((v) => v.outcome === "SECONDARY") ? (
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
        className="mt-3 overflow-x-auto overscroll-contain border border-slate-200 bg-white text-[10px]"
      >
        <div style={{ minWidth: labelW + columns.length * colW }}>
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
            {columns.map((c) => (
              <div
                key={`hd-${c.date}`}
                className="flex shrink-0 items-center justify-center border-b border-r"
                style={{ width: colW, minWidth: colW, minHeight: 22 }}
              >
                {c.hd == null ? "—" : c.hd}
              </div>
            ))}
          </Row>

          <Row label="Index XN / CĐHA" labelW={labelW}>
            {columns.map((c) => {
              const isIx = index.date.slice(0, 10) === c.date;
              return (
                <div
                  key={`ix-${c.date}`}
                  className={`flex shrink-0 flex-col justify-center gap-0.5 border-b border-r p-0.5 ${
                    isIx ? "bg-rose-100" : "bg-white"
                  }`}
                  style={{ width: colW, minWidth: colW, minHeight: 48 }}
                >
                  {isIx && indexXn ? (
                    <>
                      <span className="truncate font-bold text-rose-950">{indexXn.benh_pham}</span>
                      <span className="truncate text-slate-700">{indexXn.vi_khuan}</span>
                      {indexXn.so_luong ? (
                        <span className="truncate text-slate-500">SL {indexXn.so_luong}</span>
                      ) : null}
                      {panel === "UTI" && utiVerdict && !utiVerdict.lab.cfuOk ? (
                        <span className="truncate text-[8px] font-semibold text-amber-800">
                          Gate!
                        </span>
                      ) : null}
                    </>
                  ) : null}
                  {isIx && indexCdha ? (
                    <span className="line-clamp-3 font-semibold text-emerald-900">
                      {indexCdha.mo_ta_benh_ly}
                    </span>
                  ) : null}
                  {isIx && !indexXn && !indexCdha ? (
                    <span className="text-center font-black text-rose-800">X</span>
                  ) : null}
                </div>
              );
            })}
          </Row>

          <Row label="Ngày X" labelW={labelW}>
            {columns.map((c) => (
              <div
                key={`x-${c.date}`}
                className={`flex shrink-0 items-center justify-center border-b border-r ${cellTone(session.indexDate === c.date, "x")}`}
                style={{ width: colW, minWidth: colW, minHeight: 26 }}
              >
                {session.indexDate === c.date ? "X" : ""}
              </div>
            ))}
          </Row>

          <Row label="IWP" labelW={labelW}>
            {columns.map((c) => (
              <div
                key={`iwp-${c.date}`}
                className={`flex shrink-0 items-center justify-center border-b border-r ${cellTone(session.iwpDates.has(c.date), "iwp")}`}
                style={{ width: colW, minWidth: colW, minHeight: 22 }}
              >
                {session.iwpDates.has(c.date) ? "·" : ""}
              </div>
            ))}
          </Row>

          <Row label="Triệu chứng LS" labelW={labelW}>
            {columns.map((c) => {
              const items = (sessionBase.lamSang[c.date] || []).filter((it) => {
                if (panel !== "UTI") return true;
                if (
                  UTI_VOIDING_CRITERIA_KEYS.has(it.key) &&
                  canThiepDates.some((d) => d.slice(0, 10) === c.date)
                ) {
                  return false;
                }
                return true;
              });
              const inIwp = session.iwpDates.has(c.date);
              const cat = catalogForDate(c.date);
              return (
                <div
                  key={`ls-${c.date}`}
                  className={`relative flex shrink-0 flex-col gap-0.5 border-b border-r p-0.5 ${inIwp ? "bg-rose-50/60" : "bg-white"}`}
                  style={{ width: colW, minWidth: colW, minHeight: 56 }}
                >
                  {items.map((it) => (
                    <span
                      key={it.key}
                      className="line-clamp-2 text-[9px] font-semibold text-sky-950"
                    >
                      {it.label}
                    </span>
                  ))}
                  {allowedEdit && inIwp ? (
                    <details className="mt-auto">
                      <summary className="cursor-pointer text-[9px] font-semibold text-sky-600">
                        + LS
                      </summary>
                      <ul className="absolute z-30 mt-0.5 max-h-40 w-56 overflow-auto rounded border bg-white p-1 shadow-lg">
                        {cat.map((entry) => (
                          <li key={entry.criteriaKey}>
                            <label className="flex cursor-pointer gap-1 px-1 py-0.5 text-[10px] hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={items.some((x) => x.key === entry.criteriaKey)}
                                onChange={() =>
                                  toggleLamSang(c.date, entry.criteriaKey, entry.title)
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

          <Row label="Cận lâm sàng / lab" labelW={labelW}>
            {columns.map((c) => {
              const items = xnInWindow(c.date);
              return (
                <div
                  key={`lab-${c.date}`}
                  className="flex shrink-0 flex-col gap-0.5 border-b border-r p-0.5"
                  style={{ width: colW, minWidth: colW, minHeight: 48 }}
                >
                  {items.map((x) => (
                    <span
                      key={x.id}
                      className={`truncate text-[9px] leading-tight ${
                        x.id === index.id ? "font-bold text-rose-900" : "text-slate-700"
                      }`}
                      title={`${x.benh_pham} · ${x.vi_khuan}`}
                    >
                      {x.benh_pham}·{x.vi_khuan}
                      {x.so_luong ? `·${x.so_luong}` : ""}
                    </span>
                  ))}
                  {!items.length ? <span className="text-[9px] text-slate-300">—</span> : null}
                </div>
              );
            })}
          </Row>

          {showCdha ? (
            <Row label="CĐHA" labelW={labelW}>
              {columns.map((c) => {
                const items = cdhaInWindow(c.date).filter(
                  (x, i, arr) => arr.findIndex((y) => y.id === x.id) === i,
                );
                const inIwp = session.iwpDates.has(c.date);
                return (
                  <div
                    key={`cdha-${c.date}`}
                    className={`flex shrink-0 flex-col gap-0.5 border-b border-r p-0.5 ${inIwp ? "bg-emerald-50/40" : ""}`}
                    style={{ width: colW, minWidth: colW, minHeight: 40 }}
                  >
                    {items.map((x) => (
                      <span
                        key={x.id}
                        className="line-clamp-2 text-[9px] font-medium text-emerald-900"
                      >
                        {x.mo_ta_benh_ly}
                      </span>
                    ))}
                    {!items.length ? (
                      <span className="text-[9px] text-slate-300">—</span>
                    ) : null}
                  </div>
                );
              })}
            </Row>
          ) : null}

          <Row label={`Can thiệp · ${session.canThiepLabel}`} labelW={labelW}>
            {columns.map((c) => {
              const on = canThiepDates.some((d) => d.slice(0, 10) === c.date);
              return (
                <button
                  key={`ct-${c.date}`}
                  type="button"
                  disabled={!allowedEdit}
                  onClick={() => toggleCanThiep(c.date)}
                  className={`flex shrink-0 items-center justify-center border-b border-r text-[10px] font-bold ${
                    on ? "bg-slate-800 text-white" : "bg-white text-slate-400"
                  }`}
                  style={{ width: colW, minWidth: colW, minHeight: 28 }}
                >
                  {on ? "X" : "·"}
                </button>
              );
            })}
          </Row>

          <Row label="NSK" labelW={labelW}>
            {columns.map((c) => (
              <div
                key={`nsk-${c.date}`}
                className={`flex shrink-0 items-center justify-center border-b border-r ${cellTone(session.nsk === c.date, "nsk")}`}
                style={{ width: colW, minWidth: colW, minHeight: 26 }}
              >
                {session.nsk === c.date ? "NSK" : ""}
              </div>
            ))}
          </Row>

          <Row label="RIT" labelW={labelW}>
            {columns.map((c) => {
              const chips = sbapRitChips.ritByDate[c.date] || [];
              return (
                <div
                  key={`rit-${c.date}`}
                  className={`flex shrink-0 flex-col items-center justify-center gap-0.5 border-b border-r p-0.5 ${cellTone(session.ritDates.has(c.date), "rit")}`}
                  style={{ width: colW, minWidth: colW, minHeight: 20 }}
                >
                  {chips.map((x) => (
                    <span
                      key={x.id}
                      className="max-w-full truncate rounded bg-emerald-200/80 px-1 text-[9px] font-semibold text-emerald-950"
                      title={`${x.benh_pham} · ${x.vi_khuan} — RIT: gộp vào ca gốc, không tạo phiếu mới`}
                    >
                      + {x.vi_khuan || x.benh_pham}
                    </span>
                  ))}
                </div>
              );
            })}
          </Row>

          <Row label={session.sbapLabel} labelW={labelW}>
            {columns.map((c) => {
              const chips = sbapRitChips.sbapByDate[c.date] || [];
              return (
                <div
                  key={`sbap-${c.date}`}
                  className={`flex shrink-0 flex-col items-center justify-center gap-0.5 border-b border-r p-0.5 ${cellTone(session.sbapDates.has(c.date), "sbap")}`}
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
              const isIx = index.date.slice(0, 10) === c.date;
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
                      placeholder={
                        panel === "UTI"
                          ? utiVerdict?.result.classification || "CAUTI/SUTI/ABUTI"
                          : panel === "PNEU"
                            ? pneuVerdict?.result.classification || "PNU1/2/3_VAP|NON_VAP"
                            : panel === "BSI"
                              ? bsiVerdict?.result.classification ||
                                "CLABSI/PRIMARY/SECONDARY/CONTAMINATION"
                              : session.ketLuan?.suggestedSummary || "Kết luận"
                      }
                      onChange={(e) => onDraftChange({ ketLuan: e.target.value })}
                    />
                  ) : (
                    <span className="w-full text-center text-[9px] text-slate-300">—</span>
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
        className="sticky left-0 z-10 flex shrink-0 items-center border-b border-r bg-slate-50 px-1 font-semibold text-slate-600"
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

export type IwpPanelId = Extract<SyndromePanelId, "PNEU" | "UTI" | "BSI">;
