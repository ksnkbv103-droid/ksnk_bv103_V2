"use client";

import React from "react";
import {
  clinicalCatalogForNghiNgo,
  UTI_VOIDING_CRITERIA_KEYS,
  type BaGridSymptomByDate,
} from "../lib/nkbv-ba-grid-engine";
import { stripUtiVoidingFromLamSang } from "../lib/nkbv-uti-timeline-verdict";
import {
  PNEU_AMS_CRITERIA_KEY,
  shouldShowPneuAmsInCatalog,
} from "../lib/nkbv-pneu-timeline-verdict";
import { mergeLamSangByDate } from "../lib/nkbv-ba-lam-sang-merge";
import { vnYmd } from "@/lib/format-datetime-vi";
import { useNkbvIwpVerdicts } from "../hooks/useNkbvIwpVerdicts";
import { useNkbvIwpKetLuan } from "../hooks/useNkbvIwpKetLuan";
import NkbvSyndromeIwpGrid from "./NkbvSyndromeIwpGrid";
import type { Device, Props } from "./nkbv-syndrome-iwp.types";

export type { IwpPanelId } from "./nkbv-syndrome-iwp.types";

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
    const end = vnYmd(d.removal_date || ngayRaVien || start);
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
  maBenhAn = "",
  ngayVaoVien,
  ngayRaVien,
  ngaySinh,
  columns: _columns,
  index,
  xn,
  cdha,
  devices = [],
  baCanThiepDates = [],
  defaultKhoa,
  baKhoaByDate = {},
  allowedEdit,
  draft,
  baLamSangByDate = {},
  priorEvents = [],
  openSiteSessions = [],
  onDraftChange,
  onCloseInsufficient,
  onPersistLamSang,
  analysisDispositions = [],
  sampleConclusions = [],
  analysisMode = "CDC",
  onManualSampleConclude,
  onManualSampleClear,
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
  void devices;
  void ngayRaVien;
  const {
    nghiNgo,
    ageYears,
    showCdha,
    bloodXn,
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
  } = useNkbvIwpVerdicts({
    panel,
    ngayVaoVien,
    ngayRaVien,
    ngaySinh,
    index,
    xn,
    cdha,
    baCanThiepDates,
    defaultKhoa,
    baKhoaByDate,
    draft,
    baLamSangByDate,
    priorEvents,
    onDraftChange,
  });

  const catalogForDate = (date: string) => {
    const base = clinicalCatalogForNghiNgo(nghiNgo);
    const foleyOn = canThiepDates.some((d) => d.slice(0, 10) === date);
    return base.filter((cat) => {
      if (panel === "UTI" && foleyOn && UTI_VOIDING_CRITERIA_KEYS.has(cat.criteriaKey)) {
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
    const wasOn = draft.bloodCriterionIds.includes(id);
    if (!wasOn) {
      const row = bloodXn.find((b) => b.id === id);
      const inIwp = Boolean(row && session.iwpDates.has(row.ngay.slice(0, 10)));
      if (!inIwp) return;
    }
    const ids = wasOn
      ? draft.bloodCriterionIds.filter((x) => x !== id)
      : [...draft.bloodCriterionIds, id];
    onDraftChange({ bloodCriterionIds: ids });
  };

  const { ketLuanDisplay, ketLuanLocked, priorRitAlert, criteriaMetForKetLuan } =
    useNkbvIwpKetLuan({
      panel,
      maBenhAn,
      index,
      draft,
      onDraftChange,
      analysisMode,
      priorEvents,
      indexXn,
      session,
      utiVerdict,
      pneuVerdict,
      bsiVerdict,
      sbsiVerdicts,
    });

  return (
    <NkbvSyndromeIwpGrid
      panel={panel}
      xn={xn}
      cdha={cdha}
      index={index}
      allowedEdit={allowedEdit}
      draft={draft}
      onDraftChange={onDraftChange}
      onCloseInsufficient={onCloseInsufficient}
      onClose={onClose}
      onOpenPrimaryBsi={onOpenPrimaryBsi}
      onConfirmSecondaryBlood={onConfirmSecondaryBlood}
      priorEvents={priorEvents}
      openSiteSessions={openSiteSessions}
      analysisDispositions={analysisDispositions}
      sampleConclusions={sampleConclusions}
      analysisMode={analysisMode}
      onManualSampleConclude={onManualSampleConclude}
      onManualSampleClear={onManualSampleClear}
      ageYears={ageYears}
      showCdha={showCdha}
      canThiepDates={canThiepDates}
      indexXn={indexXn}
      indexCdha={indexCdha}
      sessionBase={sessionBase}
      session={session}
      utiVerdict={utiVerdict}
      pneuVerdict={pneuVerdict}
      bsiVerdict={bsiVerdict}
      bloodInIwp={bloodInIwp}
      bloodInSbap={bloodInSbap}
      sbapRitChips={sbapRitChips}
      activeSessionRit={activeSessionRit}
      sbsiVerdicts={sbsiVerdicts}
      ketLuanDisplay={ketLuanDisplay}
      ketLuanLocked={ketLuanLocked}
      priorRitAlert={priorRitAlert}
      criteriaMetForKetLuan={criteriaMetForKetLuan}
      catalogForDate={catalogForDate}
      toggleLamSang={toggleLamSang}
      toggleBloodPnu2={toggleBloodPnu2}
      toggleAbutiBlood={toggleAbutiBlood}
    >
      {children}
    </NkbvSyndromeIwpGrid>
  );
}
