import { useEffect, useMemo, useRef } from "react";
import type { BaGridXnCell } from "../lib/nkbv-ba-grid-engine";
import type { SecondaryBsiVerdict } from "../lib/nkbv-secondary-bsi-gate";
import {
  formatBaKetLuanSummary,
  scanIndexPriorRitAlert,
} from "../lib/nkbv-ket-luan-smart";
import { resolveDoeBelongsPriorEvent } from "../lib/nkbv-index-event-disposition";
import { bareViSinhIdFromMilestoneId } from "../lib/nkbv-vi-sinh-analysis-status";
import type { useNkbvIwpVerdicts } from "./useNkbvIwpVerdicts";
import type { PriorEvent, Props } from "../components/nkbv-syndrome-iwp.types";

type Verdicts = ReturnType<typeof useNkbvIwpVerdicts>;

export type NkbvIwpKetLuanInput = Pick<
  Props,
  "panel" | "maBenhAn" | "index" | "draft" | "onDraftChange"
> & {
  analysisMode: NonNullable<Props["analysisMode"]>;
  priorEvents: PriorEvent[];
  indexXn: BaGridXnCell | null;
  session: Verdicts["session"];
  utiVerdict: Verdicts["utiVerdict"];
  pneuVerdict: Verdicts["pneuVerdict"];
  bsiVerdict: Verdicts["bsiVerdict"];
  sbsiVerdicts: SecondaryBsiVerdict[];
};

export function useNkbvIwpKetLuan({
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
}: NkbvIwpKetLuanInput) {
  const verdictClassification =
    panel === "UTI"
      ? utiVerdict?.result.classification
      : panel === "PNEU"
        ? pneuVerdict?.result.classification
        : panel === "BSI"
          ? bsiVerdict?.result.classification
          : undefined;
  const verdictSecondary =
    panel === "UTI"
      ? Boolean(utiVerdict?.result.is_secondary_bsi)
      : panel === "PNEU"
        ? Boolean(pneuVerdict?.result.is_secondary_bsi)
        : panel === "BSI"
          ? Boolean(bsiVerdict?.result.is_secondary_bsi) ||
            bsiVerdict?.result.classification === "SECONDARY_BSI"
          : false;
  const verdictKetLuanLabel =
    panel === "UTI"
      ? utiVerdict?.ketLuanLabel
      : panel === "PNEU"
        ? pneuVerdict?.ketLuanLabel
        : panel === "BSI"
          ? bsiVerdict?.ketLuanLabel
          : undefined;

  const criteriaMetForKetLuan =
    panel === "UTI"
      ? Boolean(utiVerdict?.criteriaMet)
      : panel === "PNEU"
        ? Boolean(pneuVerdict?.criteriaMet)
        : panel === "BSI"
          ? Boolean(bsiVerdict?.criteriaMet)
          : false;

  const ketLuanDisplay = useMemo(() => {
    // MANUAL: chỉ chữ IP gõ — không disposition / progressive / smart summary
    if (draft.analysisMode === "MANUAL" || analysisMode === "MANUAL") {
      return draft.ketLuan || "";
    }
    // Ưu tiên quy kết RIT / Secondary đã seed khi chọn mẫu
    const ed = draft.eventDisposition;
    if (
      ed &&
      (ed.kind === "BELONGS_PRIOR_EVENT" || ed.kind === "SECONDARY_BSI") &&
      (draft.ketLuan?.trim() || ed.label)
    ) {
      return draft.ketLuan?.trim() || ed.label;
    }
    if (draft.ketLuan?.trim()) return draft.ketLuan;
    // Chưa đủ TC: hiện nhãn verdict / summary tạm — không dựng HAI·PNU1·NSK giả
    if (!criteriaMetForKetLuan) {
      return (
        verdictKetLuanLabel ||
        session.ketLuan?.summary ||
        session.ketLuan?.suggestedSummary ||
        ""
      );
    }
    const kl = session.ketLuan;
    if (kl) {
      const loai = verdictClassification || kl.loai_nk;
      const secondaryMulti =
        Boolean(kl.is_secondary_bsi || verdictSecondary) ||
        sbsiVerdicts.some((v) => v.outcome === "SECONDARY");
      const secondaryLoai =
        secondaryMulti && panel === "BSI"
          ? (() => {
              const sites = sbsiVerdicts
                .filter((v) => v.outcome === "SECONDARY")
                .flatMap((v) =>
                  (v.allSites || []).map((s) => s.siteMajorType).filter(Boolean),
                );
              const uniq = [...new Set(sites)];
              return uniq.length
                ? `Secondary BSI · ${uniq.join("; ")}`
                : "Secondary BSI";
            })()
          : loai;
      return formatBaKetLuanSummary({
        haiPoa: kl.nkbv === "THIEU_TC" ? "Không đủ TC" : kl.nkbv,
        loaiNk: secondaryMulti && panel === "BSI" ? secondaryLoai : loai,
        secondaryBsi: secondaryMulti && panel !== "BSI",
        nsk: kl.nsk,
        tacNhan: kl.tac_nhan,
        noi: kl.noi_xay_ra,
      });
    }
    return verdictKetLuanLabel || "";
  }, [
    analysisMode,
    draft.ketLuan,
    draft.eventDisposition,
    draft.analysisMode,
    session.ketLuan,
    verdictClassification,
    verdictSecondary,
    verdictKetLuanLabel,
    criteriaMetForKetLuan,
    sbsiVerdicts,
    panel,
  ]);

  const ketLuanLocked =
    analysisMode !== "MANUAL" &&
    draft.analysisMode !== "MANUAL" &&
    (draft.eventDisposition?.kind === "BELONGS_PRIOR_EVENT" ||
      draft.eventDisposition?.kind === "SECONDARY_BSI");

  const priorRitAlert = useMemo(() => {
    if (!maBenhAn || !priorEvents.length) return null;
    const specimen =
      indexXn?.benh_pham ||
      (panel === "UTI" ? "Nước tiểu" : panel === "PNEU" ? "Đờm" : panel === "BSI" ? "Máu" : "Khác");
    const exclude = priorEvents
      .filter((e) => e.index_vi_sinh_id && e.index_vi_sinh_id === index.id)
      .map((e) => e.id);
    return scanIndexPriorRitAlert({
      maBenhAn,
      indexDate: index.date,
      loaiBenhPham: specimen,
      existingEvents: priorEvents.map((e) => ({
        id: e.id,
        ma_benh_an: maBenhAn,
        ngay_phat_hien: e.ngay_phat_hien,
        loai_ma: e.loai_ma,
        vi_tri_nhiem_khuan: e.vi_tri_nhiem_khuan,
      })),
      excludeEventIds: exclude,
    });
  }, [maBenhAn, priorEvents, indexXn?.benh_pham, index.date, index.id, panel]);

  /** Trong IWP: khi đã có DOE mà DOE ∈ RIT sự kiện cũ → kết luận BELONGS (không tạo SK mới). */
  const doeBelongAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    const doe = session.nsk?.slice(0, 10);
    if (!doe || !priorEvents.length) return;
    if (draft.eventDisposition?.kind === "SECONDARY_BSI") return;
    if (
      draft.eventDisposition?.kind === "BELONGS_PRIOR_EVENT" &&
      doeBelongAppliedRef.current === doe
    ) {
      return;
    }
    const bare =
      index.kind === "XN"
        ? bareViSinhIdFromMilestoneId(index.id) || index.id
        : null;
    const exclude = priorEvents
      .filter((e) => e.index_vi_sinh_id && bare && e.index_vi_sinh_id === bare)
      .map((e) => e.id);
    const hit = resolveDoeBelongsPriorEvent({
      doe,
      sampleMajor: panel,
      priorEvents,
      excludeEventIds: exclude,
      excludeIndexViSinhId: bare,
    });
    if (!hit) return;
    if (
      draft.eventDisposition?.kind === "BELONGS_PRIOR_EVENT" &&
      draft.eventDisposition.priorEventId === hit.priorEventId
    ) {
      doeBelongAppliedRef.current = doe;
      return;
    }
    doeBelongAppliedRef.current = doe;
    onDraftChange({
      ketLuan: hit.ketLuanLabel,
      readyToChot: false,
      eventDisposition: {
        kind: "BELONGS_PRIOR_EVENT",
        label: hit.ketLuanLabel,
        priorEventId: hit.priorEventId || null,
      },
    });
  }, [
    session.nsk,
    priorEvents,
    panel,
    index.kind,
    index.id,
    draft.eventDisposition?.kind,
    draft.eventDisposition?.priorEventId,
    onDraftChange,
  ]);

  return { ketLuanDisplay, ketLuanLocked, priorRitAlert, criteriaMetForKetLuan };
}
