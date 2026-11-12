"use client";

import type { NkbvBaMultiTimelineWorkspaceProps } from "./nkbv-ba-workspace.types";
import { attributeWithinRit, computeBaGridSession, type BaGridCdhaCell, type BaGridNghiNgo } from "../lib/nkbv-ba-grid-engine";
import { resolveNkbvMajorType } from "../lib/nkbv-major-type";
import { detectSecondaryBsiFromSbap } from "../lib/nkbv-ket-luan-smart";
import type { NkbvBaAnalysisSeedInput } from "../actions/giam-sat-nkbv-ba-analysis.actions";
import { cdhaForBloodLast, validateBloodLast, validateChronoPrecedence } from "../lib/nkbv-chrono-precedence";
import { type BaAnalysisSession, type BaAnalysisSessionDraft } from "../lib/nkbv-ba-analysis-session";
import { vaeBaReadyToCreatePhieu } from "../lib/nkbv-syndrome-shell-helpers";
import { canThiepDatesForPanel } from "../lib/nkbv-ba-device-timeline";
import { clinicalRitEnd } from "../lib/nkbv-shared-timeline";
import { bareViSinhIdFromMilestoneId, type ViSinhAnalysisStatus } from "../lib/nkbv-vi-sinh-analysis-status";
import { buildBaSeedLabs } from "../lib/nkbv-analysis-session-to-verification";
import { mergeLamSangByDate } from "../lib/nkbv-ba-lam-sang-merge";
import { type BaAnalysisMode } from "../lib/nkbv-ba-analysis-mode";
import { toast } from "sonner";
import { promptText } from "@/components/shared/confirm-action";
import type { BaWorkspaceSplit } from "../hooks/useNkbvBaWorkspaceGridData";
import type { useNkbvBaWorkspaceSessionOps } from "../hooks/useNkbvBaWorkspaceSessionOps";

export default function NkbvBaWorkspaceCreateBar({
  openSession,
  allowedEdit,
  isManual,
  split,
  xnStatusById,
  cdhaList,
  baClinicalLamSang,
  khoaByDate,
  defaultKhoa,
  khoas,
  ngayVaoVien,
  ngayRaVien,
  analysisMode,
  patchDraft,
  onCreatePhieu,
  onSkipViSinh,
}: {
  openSession: BaAnalysisSession | null;
  allowedEdit: boolean;
  isManual: boolean;
  split: BaWorkspaceSplit;
  xnStatusById: Record<string, ViSinhAnalysisStatus>;
  cdhaList: BaGridCdhaCell[];
  baClinicalLamSang: ReturnType<typeof useNkbvBaWorkspaceSessionOps>["baClinicalLamSang"];
  khoaByDate: Record<string, string>;
  defaultKhoa: NkbvBaMultiTimelineWorkspaceProps["defaultKhoa"];
  khoas: NonNullable<NkbvBaMultiTimelineWorkspaceProps["khoas"]>;
  ngayVaoVien: string;
  ngayRaVien: NkbvBaMultiTimelineWorkspaceProps["ngayRaVien"];
  analysisMode: BaAnalysisMode;
  patchDraft: (sessionId: string, patch: Partial<BaAnalysisSessionDraft>) => void;
  onCreatePhieu: NkbvBaMultiTimelineWorkspaceProps["onCreatePhieu"];
  onSkipViSinh: NkbvBaMultiTimelineWorkspaceProps["onSkipViSinh"];
}) {
  return (
    <>
        {openSession && allowedEdit ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 px-1 pt-2">
            {(() => {
              const dispKind = openSession.draft.eventDisposition?.kind;
              const manualKl = String(openSession.draft.ketLuan || "").trim();
              // BELONGS = không tạo phiếu mới; Secondary BSI vẫn cho tạo phiếu quy kết
              const blockCreate = !isManual && dispKind === "BELONGS_PRIOR_EVENT";
              const vaeReady =
                openSession.panel !== "VAE" ||
                (isManual
                  ? Boolean(manualKl)
                  : vaeBaReadyToCreatePhieu(openSession.draft));
              const canCreate = isManual
                ? Boolean(manualKl) && !blockCreate
                : !blockCreate &&
                  vaeReady &&
                  (Boolean(openSession.draft.eventEstablished) ||
                    dispKind === "SECONDARY_BSI" ||
                    (openSession.panel === "VAE" && vaeReady));
              return (
                <>
            {canCreate || blockCreate || openSession.panel === "VAE" || isManual ? (
            <button
              type="button"
              disabled={blockCreate || !canCreate}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold text-white ${
                blockCreate || !canCreate
                  ? "cursor-not-allowed bg-slate-400"
                  : "bg-[var(--primary)]"
              }`}
              title={
                blockCreate
                  ? "Đã thuộc sự kiện trước — không tạo phiếu phân tích mới"
                  : isManual && !manualKl
                    ? "Nhập kết luận sự kiện trước khi tạo phiếu"
                    : openSession.panel === "VAE" && !vaeReady
                      ? "Nhập VAC / IVAC / PVAP ở cột kết luận trước khi tạo phiếu"
                      : isManual
                        ? "Tạo phiếu với kết luận bạn đã nhập"
                        : "Tạo phiếu khi đã đủ TC sự kiện — gom XN ∈ RIT/SBAP"
              }
              onClick={() => {
                if (blockCreate) {
                  toast.message("Đã thuộc sự kiện trước — không tạo phiếu mới.");
                  return;
                }
                const idxXn =
                  openSession.index.kind === "XN"
                    ? split.xn.find((it) => it.id === openSession.index.id)
                    : undefined;
                if (idxXn) {
                  const bloodLast = validateBloodLast({
                    targetId: idxXn.id,
                    targetDate: idxXn.ngay,
                    targetBenhPham: idxXn.benh_pham,
                    xnList: split.xn,
                    cdhaList: cdhaForBloodLast(split.cdha).cdhaList,
                    statusById: { ...xnStatusById, ...cdhaForBloodLast(split.cdha).statusById },
                  });
                  if (!bloodLast.allowed) {
                    toast.error(bloodLast.message, { duration: 8000 });
                    return;
                  }
                }
                if (!isManual) {
                  const chronoCheck = validateChronoPrecedence({
                    targetDate: openSession.index.date,
                    targetId: openSession.index.id,
                    xnList: split.xn,
                    statusById: xnStatusById,
                  });
                  if (!chronoCheck.allowed) {
                    toast.error(chronoCheck.message, { duration: 6000 });
                    return;
                  }
                }
                if (isManual && !manualKl) {
                  toast.message("Tự phân tích: nhập kết luận sự kiện trước khi tạo phiếu.");
                  return;
                }
                if (!isManual && openSession.panel === "VAE" && !vaeReady) {
                  toast.message(
                    "VAE: ghi VAC / IVAC / PVAP ở kết luận Index trước khi tạo phiếu (bảng vent trên form).",
                  );
                  return;
                }
                if (
                  !isManual &&
                  !(
                    openSession.draft.eventEstablished ||
                    dispKind === "SECONDARY_BSI" ||
                    (openSession.panel === "VAE" && vaeReady)
                  )
                ) {
                  toast.message("Chưa đủ tiêu chuẩn cấu thành sự kiện — không tạo phiếu.");
                  return;
                }
                const nghi =
                  openSession.panel === "PNEU" ||
                  openSession.panel === "BSI" ||
                  openSession.panel === "UTI" ||
                  openSession.panel === "SSI" ||
                  openSession.panel === "VAE" ||
                  openSession.panel === "CH17"
                    ? (openSession.panel as BaGridNghiNgo)
                    : ("BSI" as BaGridNghiNgo);
                const canThiep = canThiepDatesForPanel(
                  split.deviceByDate,
                  openSession.panel,
                );
                // LS BA ∩ draft — triệu chứng timeline trong IWP vẫn cấu thành sự kiện
                const mergedLamSang = mergeLamSangByDate(
                  baClinicalLamSang,
                  openSession.draft.lamSang,
                );
                const ssiSurgeryDate =
                  openSession.panel === "SSI"
                    ? Object.keys(split.surgeryByDate).find(
                        (d) => d <= openSession.index.date.slice(0, 10),
                      ) ||
                      Object.keys(split.surgeryByDate).sort()[0] ||
                      undefined
                    : undefined;

                const ssiExtraFields =
                  openSession.panel === "SSI"
                    ? {
                        ngay_phau_thuat: ssiSurgeryDate,
                        surgery_date: ssiSurgeryDate,
                        ssi_depth: openSession.draft.ssiDepth || "SUPERFICIAL",
                        loai_phau_thuat_nhsn: openSession.draft.loaiPhauThuatNhsn,
                        ssi_event_type: openSession.draft.ssiEventType,
                        has_implant: openSession.draft.hasImplant,
                        is_patos: openSession.draft.isPatos,
                      }
                    : {};

                const session = computeBaGridSession({
                  ngayVaoVien,
                  ngayRaVien,
                  xn: split.xn,
                  cdha: cdhaList,
                  activeIndex: openSession.index,
                  nghiNgo: nghi,
                  symptomDates: {},
                  tieuChuanByDate: mergedLamSang,
                  trieuChungLamSangByDate: mergedLamSang,
                  khoaByDate:
                    Object.keys(khoaByDate).length > 0
                      ? khoaByDate
                      : defaultKhoa
                        ? { [openSession.index.date.slice(0, 10)]: defaultKhoa }
                        : {},
                  canThiepDates: canThiep,
                  criteriaMetPreview: true,
                  surgeryDate: ssiSurgeryDate,
                  extraFormFields: ssiExtraFields,
                  khoas,
                });
                const majorType = resolveNkbvMajorType({
                  loai_ma: openSession.panel,
                });
                const attributed = session.nsk
                  ? attributeWithinRit({
                      nsk: session.nsk,
                      majorType:
                        majorType === "OTHER"
                          ? (openSession.panel as typeof majorType)
                          : majorType,
                      xn: split.xn,
                      cdha: cdhaList,
                      activeIndexId: openSession.index.id,
                    })
                  : { attributedXnIds: [] as string[] };
                const secondary =
                  !isManual &&
                  session.nsk &&
                  session.metrics?.sbap_start &&
                  session.metrics?.sbap_end &&
                  (openSession.panel === "UTI" ||
                    openSession.panel === "PNEU" ||
                    openSession.panel === "SSI" ||
                    openSession.panel === "CH17")
                    ? detectSecondaryBsiFromSbap({
                        primarySite:
                          openSession.panel === "SSI"
                            ? "SSI"
                            : openSession.panel === "CH17"
                              ? "OTHER"
                              : openSession.panel,
                        sbapStart: session.metrics.sbap_start,
                        sbapEnd: session.metrics.sbap_end,
                        xn: split.xn,
                        primaryOrganisms: (session.ketLuan?.tac_nhan || "")
                          .split(";")
                          .map((s) => s.trim())
                          .filter(Boolean),
                        bloodMandatoryIds: openSession.draft.bloodCriterionIds,
                      })
                    : null;

                const ritAttributedIds = Array.from(
                  new Set([
                    ...attributed.attributedXnIds,
                    ...(openSession.draft.ritAttributedIds || []),
                    ...(secondary?.matchedBloodIds || []),
                    ...(openSession.draft.bloodCriterionIds || []),
                  ]),
                );
                const draftForSeed: BaAnalysisSessionDraft = {
                  ...openSession.draft,
                  lamSang: mergedLamSang,
                  ritAttributedIds,
                  canThiepDates: canThiep,
                  eventEstablished: true,
                  analysisMode,
                  ketLuan: isManual ? manualKl : openSession.draft.ketLuan,
                };
                patchDraft(openSession.id, { ritAttributedIds, canThiepDates: canThiep });

                const { rit_labs, sbap_labs } = buildBaSeedLabs({
                  xn: split.xn,
                  indexId: openSession.index.id,
                  attributedXnIds: ritAttributedIds,
                  secondaryBloodIds: secondary?.matchedBloodIds || [],
                  sbapDates: session.sbapDates,
                });

                const analysisSeed: NkbvBaAnalysisSeedInput = {
                  panel: openSession.panel,
                  draft: draftForSeed,
                  indexKind: openSession.index.kind,
                  nsk: session.nsk,
                  isSecondaryBsi: Boolean(
                    !isManual &&
                      (session.ketLuan?.is_secondary_bsi ||
                        secondary?.isSecondary ||
                        dispKind === "SECONDARY_BSI"),
                  ),
                  ketLuan: isManual
                    ? manualKl
                    : openSession.draft.ketLuan || session.ketLuan?.summary || null,
                  attributedXnIds: ritAttributedIds,
                  secondaryBloodIds: secondary?.matchedBloodIds || [],
                  windows: session.metrics
                    ? {
                        iwp_start: session.metrics.iwp_start,
                        iwp_end: session.metrics.iwp_end,
                        sbap_start: session.metrics.sbap_start,
                        sbap_end: session.metrics.sbap_end,
                        rit_end: session.metrics.rit_end,
                        doe: session.nsk || session.metrics.doe,
                      }
                    : session.nsk
                      ? {
                          doe: session.nsk,
                          rit_end: clinicalRitEnd(session.nsk),
                        }
                      : null,
                  ritLabs: rit_labs,
                  sbapLabs: sbap_labs,
                  surgeryDate: ssiSurgeryDate,
                  checklistGate:
                    session.checklistType === "VAP" ||
                    session.checklistType === "HAP" ||
                    session.checklistType === "BSI" ||
                    session.checklistType === "UTI" ||
                    session.checklistType === "SSI" ||
                    session.checklistType === "VAE" ||
                    session.checklistType === "CH17"
                      ? session.checklistType
                      : null,
                };
                onCreatePhieu?.({
                  milestoneId: openSession.index.id,
                  panel: openSession.panel,
                  analysisSeed,
                });
              }}
            >
              {blockCreate ? "Đã phân tích — không tạo phiếu mới" : "Tạo phiếu"}
            </button>
            ) : null}
            {openSession.index.kind === "XN" && !blockCreate ? (
              <button
                type="button"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                onClick={async () => {
                  const bare =
                    bareViSinhIdFromMilestoneId(openSession.index.id) ||
                    openSession.index.id;
                  const reason = await promptText({
                    title: "Bỏ qua xét nghiệm",
                    message: "Xét nghiệm này sẽ không tạo ca NKBV (HAI).",
                    label: "Lý do bỏ qua (bắt buộc)",
                    minLength: 3,
                    multiline: true,
                    confirmText: "Bỏ qua XN",
                  });
                  if (!reason) return;
                  onSkipViSinh?.({
                    viSinhId: bare.replace(/^lis:/, ""),
                    reason: reason.trim(),
                  });
                }}
              >
                Bỏ qua XN (có lý do)
              </button>
            ) : null}
            {openSession.index.kind === "CDHA" && !blockCreate ? (
              <button
                type="button"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                onClick={async () => {
                  const reason = await promptText({
                    title: "Bỏ qua chẩn đoán hình ảnh",
                    message: "CĐHA này sẽ không còn chặn phân tích cấy máu (không tạo ca NKBV).",
                    label: "Lý do bỏ qua (bắt buộc)",
                    minLength: 3,
                    multiline: true,
                    confirmText: "Bỏ qua CĐHA",
                  });
                  if (!reason) return;
                  onSkipViSinh?.({
                    viSinhId: openSession.index.id.replace(/^manual:/, ""),
                    reason: reason.trim(),
                    kind: "CDHA",
                  });
                }}
              >
                Bỏ qua CĐHA (có lý do)
              </button>
            ) : null}
            <span className="text-[11px] text-slate-500">
              {blockCreate
                ? "Mẫu đã thuộc sự kiện trước / Secondary — chỉ xem kết luận, không tạo phiếu trùng."
                : isManual
                  ? manualKl
                    ? "Tự phân tích: tạo phiếu với kết luận bạn đã nhập."
                    : "Tự phân tích: gõ kết luận sự kiện ở cột Kết luận (ngày Index) trước."
                  : canCreate
                    ? "Đủ TC: tô RIT/SBAP → Tạo phiếu (gom mẫu cùng loại / máu khớp)."
                    : "Chưa đủ TC: dùng «Đã phân tích xong» trên bảng — không tô RIT; phân tích XN tiếp."}
            </span>
                </>
              );
            })()}
          </div>
        ) : null}
    </>
  );
}
