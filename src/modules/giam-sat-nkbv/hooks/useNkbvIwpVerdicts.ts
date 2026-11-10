import { useEffect, useMemo } from "react";
import {
  computeBaGridSession,
  type BaGridNghiNgo,
  type BaGridSymptomByDate,
} from "../lib/nkbv-ba-grid-engine";
import {
  evaluateSecondaryBsiForBlood,
  type PrimarySiteForSbap,
  type SecondaryBsiVerdict,
} from "../lib/nkbv-secondary-bsi-gate";
import type { BaAnalysisSessionDraft } from "../lib/nkbv-ba-analysis-session";
import {
  ageYearsFromNgaySinh,
  buildUtiTimelineVerdict,
  stripUtiVoidingFromLamSang,
} from "../lib/nkbv-uti-timeline-verdict";
import { buildPneuTimelineVerdict } from "../lib/nkbv-pneu-timeline-verdict";
import { buildBsiTimelineVerdict } from "../lib/nkbv-bsi-timeline-verdict";
import {
  hydrateLamSangDraftFromBa,
  mergeLamSangByDate,
} from "../lib/nkbv-ba-lam-sang-merge";
import { buildSbapRitChips, isBloodSpecimen, resolveIndexSpecimenForChips } from "../lib/nkbv-sbap-rit-chips";
import { collectRitPathogens } from "../lib/nkbv-ket-luan-smart";
import { resolveNkbvMajorType } from "../lib/nkbv-major-type";
import { ritPriorFromVerifiedSibling } from "../lib/nkbv-rit-hard-stop";
import {
  priorEventsToSecondarySites,
  type ActiveSessionRitContext,
} from "../lib/nkbv-index-event-disposition";
import type { PriorEvent, Props } from "../components/nkbv-syndrome-iwp.types";

export type NkbvIwpVerdictsInput = Pick<
  Props,
  | "panel"
  | "ngayVaoVien"
  | "ngayRaVien"
  | "ngaySinh"
  | "index"
  | "xn"
  | "cdha"
  | "defaultKhoa"
  | "draft"
  | "onDraftChange"
> & {
  baCanThiepDates: string[];
  baKhoaByDate: Record<string, string>;
  baLamSangByDate: BaGridSymptomByDate;
  priorEvents: PriorEvent[];
};

export function useNkbvIwpVerdicts({
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
}: NkbvIwpVerdictsInput) {
  const nghiNgo = panel as BaGridNghiNgo;
  const ageYears = useMemo(
    () => ageYearsFromNgaySinh(ngaySinh, index.date),
    [ngaySinh, index.date],
  );

  const showCdha = panel !== "UTI";

  const bloodXn = useMemo(() => xn.filter((x) => isBloodSpecimen(x.benh_pham)), [xn]);

  // Timeline BA = SSOT ngày can thiệp — không fallback draft (tránh phình ngày từ sổ/phiên cũ)
  const canThiepDates = baCanThiepDates;
  const devicePlacedFromBa = canThiepDates[0] || null;

  // Đồng bộ draft để seed phiếu; không dùng draft làm nguồn association
  useEffect(() => {
    const a = [...canThiepDates].sort().join("|");
    const b = [...(draft.canThiepDates || [])].sort().join("|");
    if (a !== b) onDraftChange({ canThiepDates: [...canThiepDates] });
  }, [canThiepDates, draft.canThiepDates, onDraftChange]);

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
    const khoaByDate: Record<string, string> = { ...baKhoaByDate };
    const ix = index.date.slice(0, 10);
    if (defaultKhoa && !khoaByDate[ix]) khoaByDate[ix] = defaultKhoa;
    return { lamSang, tieuChuan, khoaByDate };
  }, [
    baLamSangByDate,
    draft.lamSang,
    draft.bloodCriterionIds,
    bloodXn,
    panel,
    canThiepDates,
    defaultKhoa,
    baKhoaByDate,
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

  /** DOE tạm từ LS ∈ IWP (+ Index) — trước verdict gắn dụng cụ. */
  const doeProbeNsk = useMemo(() => {
    const probe = computeBaGridSession({
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
      criteriaMetPreview: false,
    });
    return probe.nsk || index.date.slice(0, 10);
  }, [
    ngayVaoVien,
    ngayRaVien,
    xn,
    cdha,
    index,
    nghiNgo,
    sessionBase,
    canThiepDates,
  ]);

  const ritPriorEvents = useMemo(
    () =>
      (priorEvents || [])
        .map((e) =>
          ritPriorFromVerifiedSibling({
            id: e.id,
            calculated_doe: e.calculated_doe || null,
            ngay_vao_vien: ngayVaoVien,
            classification: e.classification,
            is_positive: e.is_positive,
            is_secondary_bsi: e.is_secondary_bsi,
            analysis_disposition: e.analysis_disposition,
            trang_thai_ma: e.trang_thai_ma,
            poa_major_type: e.poa_major_type,
            loai_ma: e.loai_ma,
            vi_tri_nhiem_khuan: e.vi_tri_nhiem_khuan,
            loai_ten: e.loai_ten,
          }),
        )
        .filter((x): x is NonNullable<typeof x> => Boolean(x)),
    [priorEvents, ngayVaoVien],
  );

  const utiVerdictPreview = useMemo(() => {

    if (panel !== "UTI") return null;
    return buildUtiTimelineVerdict({
      indexXn,
      lamSang: sessionBase.lamSang,
      canThiepDates,
      iwpDates: provisionalIwp,
      nsk: doeProbeNsk,
      bloodXn,
      abutiBloodIds: draft.bloodCriterionIds,
      admissionDate: ngayVaoVien,
      dischargeDate: ngayRaVien,
      devicePlacedDate: devicePlacedFromBa,
      deviceRemovedDate: null,
      ritPriorEvents,
    });
  }, [
    panel,
    indexXn,
    sessionBase.lamSang,
    canThiepDates,
    provisionalIwp,
    doeProbeNsk,
    bloodXn,
    draft.bloodCriterionIds,
    ngayVaoVien,
    ngayRaVien,
    ritPriorEvents,
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
      nsk: doeProbeNsk,
      bloodCriterionIds: draft.bloodCriterionIds,
      bloodXn,
      patientAge: ageYears,
      admissionDate: ngayVaoVien,
      dischargeDate: ngayRaVien,
      devicePlacedDate: devicePlacedFromBa,
      deviceRemovedDate: null,
      ritPriorEvents,
      hasCardiopulmonaryDisease: Boolean(draft.hasCardiopulmonaryDisease),
      pneuIcAtoms: draft.pneuIcAtoms,
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
    doeProbeNsk,
    draft.bloodCriterionIds,
    draft.hasCardiopulmonaryDisease,
    draft.pneuIcAtoms,
    bloodXn,
    ageYears,
    ngayVaoVien,
    ngayRaVien,
    ritPriorEvents,
  ]);

  const bsiVerdictPreview = useMemo(() => {
    if (panel !== "BSI") return null;
    return buildBsiTimelineVerdict({
      indexXn,
      bloodXn,
      lamSang: sessionBase.lamSang,
      canThiepDates,
      iwpDates: provisionalIwp,
      nsk: doeProbeNsk,
      admissionDate: ngayVaoVien,
      dischargeDate: ngayRaVien,
      devicePlacedDate: devicePlacedFromBa,
      deviceRemovedDate: null,
      ritPriorEvents,
      localizedSite: draft.bsiLocalizedSite,
      ancWbcLt500Ge2d: Boolean(draft.bsiMbi?.anc_wbc_lt_500_ge_2d),
      hasHsctOrGvhd: Boolean(draft.bsiMbi?.has_hsct_or_gvhd),
      hasSevereDiarrheaMbi: Boolean(draft.bsiMbi?.has_severe_diarrhea_mbi),
    });
  }, [
    panel,
    indexXn,
    bloodXn,
    sessionBase.lamSang,
    canThiepDates,
    provisionalIwp,
    doeProbeNsk,
    draft.bsiLocalizedSite,
    draft.bsiMbi,
    ngayVaoVien,
    ngayRaVien,
    ritPriorEvents,
  ]);

  const session = useMemo(() => {
    const criteriaMet =
      panel === "UTI"
        ? Boolean(utiVerdictPreview?.criteriaMet)
        : panel === "PNEU"
          ? Boolean(pneuVerdictPreview?.criteriaMet)
          : panel === "BSI"
            ? Boolean(bsiVerdictPreview?.criteriaMet)
            : false;
    // Verdict label chỉ đổ vào kết luận khi chưa đủ TC (tiến trình); đủ TC → summary đầy đủ HAI/NSK
    const verdictLabel =
      panel === "UTI"
        ? utiVerdictPreview?.ketLuanLabel
        : panel === "PNEU"
          ? pneuVerdictPreview?.ketLuanLabel
          : panel === "BSI"
            ? bsiVerdictPreview?.ketLuanLabel
            : null;
    const ketOverride =
      draft.ketLuan?.trim() ||
      (!criteriaMet ? verdictLabel || null : null);
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
      admissionDate: ngayVaoVien,
      dischargeDate: ngayRaVien,
      devicePlacedDate: devicePlacedFromBa,
      deviceRemovedDate: null,
      ritPriorEvents,
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
    ngayVaoVien,
    ngayRaVien,
    ritPriorEvents,
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
      admissionDate: ngayVaoVien,
      dischargeDate: ngayRaVien,
      devicePlacedDate: devicePlacedFromBa,
      deviceRemovedDate: null,
      ritPriorEvents,
      hasCardiopulmonaryDisease: Boolean(draft.hasCardiopulmonaryDisease),
      pneuIcAtoms: draft.pneuIcAtoms,
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
    draft.pneuIcAtoms,
    bloodXn,
    ageYears,
    ngayVaoVien,
    ngayRaVien,
    ritPriorEvents,
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
      admissionDate: ngayVaoVien,
      dischargeDate: ngayRaVien,
      devicePlacedDate: devicePlacedFromBa,
      deviceRemovedDate: null,
      ritPriorEvents,
      localizedSite: draft.bsiLocalizedSite,
      ancWbcLt500Ge2d: Boolean(draft.bsiMbi?.anc_wbc_lt_500_ge_2d),
      hasHsctOrGvhd: Boolean(draft.bsiMbi?.has_hsct_or_gvhd),
      hasSevereDiarrheaMbi: Boolean(draft.bsiMbi?.has_severe_diarrhea_mbi),
    });
  }, [
    panel,
    indexXn,
    bloodXn,
    sessionBase.lamSang,
    canThiepDates,
    session.iwpDates,
    session.nsk,
    draft.bsiLocalizedSite,
    draft.bsiMbi,
    ngayVaoVien,
    ngayRaVien,
    ritPriorEvents,
  ]);

  const bloodInIwp = useMemo(() => {
    return bloodXn.filter((b) => session.iwpDates.has(b.ngay.slice(0, 10)));
  }, [bloodXn, session.iwpDates]);

  const bloodInSbap = useMemo(() => {
    return bloodXn.filter((b) => session.sbapDates.has(b.ngay.slice(0, 10)));
  }, [bloodXn, session.sbapDates]);

  /** Chip dữ liệu thật trên hàng SBAP (cấy máu) / RIT (cùng bệnh phẩm + CĐHA) */
  const ritPrimaryOrganisms = useMemo(() => {
    const nsk = (session.nsk || index.date).slice(0, 10);
    const major = resolveNkbvMajorType({ loai_ma: panel });
    return collectRitPathogens({
      nsk,
      majorType: major,
      xn,
      excludeBlood: panel !== "BSI",
    });
  }, [session.nsk, index.date, panel, xn]);

  const indexSpecimenResolved = useMemo(
    () =>
      resolveIndexSpecimenForChips({
        indexXnBenhPham: indexXn?.benh_pham,
        panel,
      }),
    [indexXn?.benh_pham, panel],
  );

  const sbapRitChips = useMemo(
    () =>
      buildSbapRitChips({
        xn,
        cdha: panel === "PNEU" ? cdha : [],
        indexId: index.id,
        indexSpecimen: indexSpecimenResolved,
        ritDates: session.ritDates,
        sbapDates: session.sbapDates,
        primaryOrganisms: ritPrimaryOrganisms,
      }),
    [
      xn,
      cdha,
      panel,
      index.id,
      indexSpecimenResolved,
      session.ritDates,
      session.sbapDates,
      ritPrimaryOrganisms,
    ],
  );

  /** XN/CĐHA ∈ RIT phiên này → cột Kết luận «Thuộc SK đủ TC». */
  const activeSessionRit = useMemo((): ActiveSessionRitContext => {
    const ritXnIds = new Set<string>();
    for (const list of Object.values(sbapRitChips.ritByDate)) {
      for (const x of list) ritXnIds.add(x.id);
    }
    const ritCdhaIds = new Set<string>();
    for (const list of Object.values(sbapRitChips.ritCdhaByDate)) {
      for (const c of list) ritCdhaIds.add(c.id);
    }
    const loaiLabel =
      panel === "UTI"
        ? utiVerdict?.result.classification || "UTI"
        : panel === "PNEU"
          ? pneuVerdict?.result.classification || "PNEU"
          : panel === "BSI"
            ? bsiVerdict?.result.classification || "BSI"
            : panel;
    const eventEstablished =
      panel === "UTI"
        ? Boolean(utiVerdict?.criteriaMet)
        : panel === "PNEU"
          ? Boolean(pneuVerdict?.criteriaMet)
          : panel === "BSI"
            ? Boolean(bsiVerdict?.criteriaMet)
            : false;
    return {
      indexId: index.id,
      doe: (session.nsk || index.date).slice(0, 10),
      loaiLabel,
      majorType: panel,
      ritXnIds,
      ritCdhaIds,
      eventEstablished,
    };
  }, [
    sbapRitChips.ritByDate,
    sbapRitChips.ritCdhaByDate,
    panel,
    session.nsk,
    index.id,
    index.date,
    utiVerdict?.criteriaMet,
    utiVerdict?.result,
    pneuVerdict?.criteriaMet,
    pneuVerdict?.result,
    bsiVerdict?.criteriaMet,
    bsiVerdict?.result,
  ]);

  /** Đồng bộ draft.eventEstablished + nsk cho footer / RIT phiên khác. */
  useEffect(() => {
    const established = Boolean(activeSessionRit.eventEstablished);
    const nsk = session.nsk || null;
    const patch: Partial<BaAnalysisSessionDraft> = {};
    if (Boolean(draft.eventEstablished) !== established) {
      patch.eventEstablished = established;
    }
    if ((draft.nsk || null) !== nsk) patch.nsk = nsk;
    if (Object.keys(patch).length) onDraftChange(patch);
  }, [
    activeSessionRit.eventEstablished,
    session.nsk,
    draft.eventEstablished,
    draft.nsk,
    onDraftChange,
  ]);

  const iwpDatesKey = useMemo(
    () => [...session.iwpDates].sort().join("|"),
    [session.iwpDates],
  );

  /**
   * LS đã ghi trên timeline ∈ IWP (provisional hoặc đã có DOE) → hydrate vào draft phiên.
   * Không loại trừ triệu chứng cũ khỏi phân tích sự kiện Index mới.
   */
  useEffect(() => {
    const baForHydrate =
      panel === "UTI"
        ? stripUtiVoidingFromLamSang(baLamSangByDate, canThiepDates)
        : baLamSangByDate;
    const { next, changed } = hydrateLamSangDraftFromBa({
      ba: baForHydrate,
      draft: draft.lamSang,
      indexDate: index.date,
      iwpDates: session.iwpDates.size > 0 ? session.iwpDates : null,
    });
    if (!changed) return;
    onDraftChange({
      lamSang:
        panel === "UTI" ? stripUtiVoidingFromLamSang(next, canThiepDates) : next,
    });
    // iwpDatesKey neo cửa sổ; draft.lamSang để phát hiện thiếu key từ BA
     
  }, [baLamSangByDate, index.date, index.id, iwpDatesKey, panel, canThiepDates, draft.lamSang, onDraftChange]);

  const sbsiVerdicts: SecondaryBsiVerdict[] = useMemo(() => {
    const priorSites = priorEventsToSecondarySites(priorEvents);
    const sbap = [...session.sbapDates];
    const iwp = [...session.iwpDates];
    const criteriaMet =
      panel === "UTI"
        ? Boolean(utiVerdict?.criteriaMet)
        : panel === "PNEU"
          ? Boolean(pneuVerdict?.criteriaMet)
          : panel === "BSI"
            ? Boolean(bsiVerdict?.criteriaMet)
            : false;

    const currentSite: PrimarySiteForSbap | null =
      panel === "BSI"
        ? null
        : {
            id: `site-${panel}`,
            majorType: panel,
            criteriaMet,
            sbapDates: sbap,
            criteriaWindowDates: iwp,
            siteOrganism: ritPrimaryOrganisms[0] || null,
            siteOrganisms: ritPrimaryOrganisms,
            bloodCriterionIds: draft.bloodCriterionIds,
            doe: session.nsk,
          };

    // BSI panel: chỉ prior sites; site panel: prior + site hiện tại (đa site)
    const sites: PrimarySiteForSbap[] = [
      ...priorSites.filter((s) => (currentSite ? s.id !== currentSite.id : true)),
      ...(currentSite ? [currentSite] : []),
    ];
    if (!sites.length) return [];

    return bloodXn.map((b) =>
      evaluateSecondaryBsiForBlood({
        blood: { id: b.id, date: b.ngay, organism: b.vi_khuan },
        sites,
      }),
    );
  }, [
    panel,
    priorEvents,
    session.sbapDates,
    session.iwpDates,
    session.nsk,
    bloodXn,
    ritPrimaryOrganisms,
    draft.bloodCriterionIds,
    utiVerdict,
    pneuVerdict,
    bsiVerdict,
  ]);

  return {
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
  };
}
