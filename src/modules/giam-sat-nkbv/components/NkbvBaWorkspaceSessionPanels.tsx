"use client";

import React from "react";
import type { NkbvBaMultiTimelineWorkspaceProps } from "./nkbv-ba-workspace.types";
import NkbvBaWorkspaceBoundDayGrid from "./NkbvBaWorkspaceBoundDayGrid";
import { type BaGridCdhaCell } from "../lib/nkbv-ba-grid-engine";
import { resolveIndexEventDisposition, type OpenSiteSessionForSbap } from "../lib/nkbv-index-event-disposition";
import { type BaAnalysisSession, type BaAnalysisSessionDraft } from "../lib/nkbv-ba-analysis-session";
import dynamic from "next/dynamic";
import { isShellPanel } from "../lib/nkbv-syndrome-shell-helpers";
import { type BaDayGridColumnDef } from "./NkbvBaDayGrid";
import { canThiepDatesForPanel } from "../lib/nkbv-ba-device-timeline";
import {
  bareViSinhIdFromMilestoneId,
  resolveViSinhAnalysisStatus,
  type ViSinhAnalysisDispositionRow,
} from "../lib/nkbv-vi-sinh-analysis-status";
import { type BaSampleConclusion } from "../lib/nkbv-ba-sample-conclusions";
import { type BaAnalysisMode } from "../lib/nkbv-ba-analysis-mode";
import { toast } from "sonner";
import { cdhaForBloodLast, validateBloodLast } from "../lib/nkbv-chrono-precedence";
import type { BaWorkspaceSplit } from "../hooks/useNkbvBaWorkspaceGridData";
import type { useNkbvBaWorkspaceSessionOps } from "../hooks/useNkbvBaWorkspaceSessionOps";
import type { useNkbvBaWorkspaceMutations } from "../hooks/useNkbvBaWorkspaceMutations";

const panelLoading = () => (
  <div className="h-40 animate-pulse rounded-lg border border-slate-200 bg-slate-50/90" aria-hidden />
);

/** UTI/PNEU/BSI IWP (~1635) — load only when that syndrome session is open. */
const NkbvSyndromeIwpPanel = dynamic(() => import("./NkbvSyndromeIwpPanel"), {
  loading: panelLoading,
});
/** SSI panel (~769) — same deferred boundary. */
const NkbvSyndromeSsiPanel = dynamic(() => import("./NkbvSyndromeSsiPanel"), {
  loading: panelLoading,
});
/** VAE shell (~265) — helpers live in nkbv-syndrome-shell-helpers (eager, tiny). */
const NkbvSyndromeShellPanel = dynamic(() => import("./NkbvSyndromeShellPanel"), {
  loading: panelLoading,
});
/** Chương 17 — localized site infections (SST, IAB, BJ, CNS, CVS, etc.). */
const NkbvSyndromeCh17Panel = dynamic(() => import("./NkbvSyndromeCh17Panel"), {
  loading: panelLoading,
});

type DayGridBind = Omit<
  React.ComponentProps<typeof NkbvBaWorkspaceBoundDayGrid>,
  "activeXnId" | "windowColumns" | "tailColumns"
>;

export default function NkbvBaWorkspaceSessionPanels({
  openSession,
  maBenhAn,
  ngayVaoVien,
  ngayRaVien,
  ngaySinh,
  defaultKhoa,
  allowedEdit,
  priorEvents,
  analysisMode,
  isManual,
  split,
  cdhaList,
  khoaByDate,
  panelColumns,
  baClinicalLamSang,
  openSiteSessionsForSbap,
  mergedDispositions,
  sampleConclusions,
  dayGridBind,
  closedGridConcludeColumns,
  patchDraft,
  persistPanelLamSang,
  persistManualSampleConclusion,
  clearManualSampleConclusion,
  setOpenSessionId,
  closeInsufficient,
  applySecondaryBsiVeto,
  openOrCreateSession,
  analysisSlotsForPanel,
}: {
  openSession: BaAnalysisSession | null;
  maBenhAn: string;
  ngayVaoVien: string;
  ngayRaVien: NkbvBaMultiTimelineWorkspaceProps["ngayRaVien"];
  ngaySinh: NkbvBaMultiTimelineWorkspaceProps["ngaySinh"];
  defaultKhoa: NkbvBaMultiTimelineWorkspaceProps["defaultKhoa"];
  allowedEdit: boolean;
  priorEvents: NonNullable<NkbvBaMultiTimelineWorkspaceProps["priorEvents"]>;
  analysisMode: BaAnalysisMode;
  isManual: boolean;
  split: BaWorkspaceSplit;
  cdhaList: BaGridCdhaCell[];
  khoaByDate: Record<string, string>;
  panelColumns: ReturnType<typeof useNkbvBaWorkspaceSessionOps>["panelColumns"];
  baClinicalLamSang: ReturnType<typeof useNkbvBaWorkspaceSessionOps>["baClinicalLamSang"];
  openSiteSessionsForSbap: OpenSiteSessionForSbap[];
  mergedDispositions: ViSinhAnalysisDispositionRow[];
  sampleConclusions: BaSampleConclusion[];
  dayGridBind: DayGridBind;
  closedGridConcludeColumns: BaDayGridColumnDef[];
  patchDraft: (sessionId: string, patch: Partial<BaAnalysisSessionDraft>) => void;
  persistPanelLamSang: ReturnType<typeof useNkbvBaWorkspaceMutations>["persistPanelLamSang"];
  persistManualSampleConclusion: ReturnType<
    typeof useNkbvBaWorkspaceSessionOps
  >["persistManualSampleConclusion"];
  clearManualSampleConclusion: (indexId: string) => void;
  setOpenSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  closeInsufficient: () => void;
  applySecondaryBsiVeto: ReturnType<
    typeof useNkbvBaWorkspaceSessionOps
  >["applySecondaryBsiVeto"];
  openOrCreateSession: ReturnType<typeof useNkbvBaWorkspaceSessionOps>["openOrCreateSession"];
  analysisSlotsForPanel: ReturnType<
    typeof useNkbvBaWorkspaceSessionOps
  >["analysisSlotsForPanel"];
}) {
  return (
    <>
        {openSession &&
        (openSession.panel === "UTI" ||
          openSession.panel === "PNEU" ||
          openSession.panel === "BSI") ? (
          <NkbvSyndromeIwpPanel
            panel={openSession.panel}
            maBenhAn={maBenhAn}
            ngayVaoVien={ngayVaoVien}
            ngayRaVien={ngayRaVien}
            ngaySinh={ngaySinh}
            columns={panelColumns}
            index={openSession.index}
            xn={split.xn}
            cdha={cdhaList}
            baCanThiepDates={canThiepDatesForPanel(
              split.deviceByDate,
              openSession.panel,
            )}
            defaultKhoa={defaultKhoa}
            baKhoaByDate={khoaByDate}
            allowedEdit={allowedEdit}
            draft={openSession.draft}
            baLamSangByDate={baClinicalLamSang}
            priorEvents={priorEvents}
            openSiteSessions={openSiteSessionsForSbap}
            onDraftChange={(patch) => patchDraft(openSession.id, patch)}
            onPersistLamSang={(date, key, label, on) =>
              void persistPanelLamSang(date, key, label, on)
            }
            analysisDispositions={mergedDispositions}
            sampleConclusions={sampleConclusions}
            analysisMode={analysisMode}
            onManualSampleConclude={persistManualSampleConclusion}
            onManualSampleClear={(p) => clearManualSampleConclusion(p.indexId)}
            onClose={() => setOpenSessionId(null)}
            onCloseInsufficient={closeInsufficient}
            onConfirmSecondaryBlood={(payload) => {
              if (isManual) return;
              applySecondaryBsiVeto({
                sampleId: payload.sampleId,
                sampleDate: payload.date,
                ketLuanLabel: payload.label,
                sites: [],
              });
            }}
            onOpenPrimaryBsi={(bloodId) => {
              const b = split.xn.find((x) => x.id === bloodId);
              if (!b) return;
              const bloodLast = validateBloodLast({
                targetId: b.id,
                targetDate: b.ngay,
                targetBenhPham: b.benh_pham,
                xnList: split.xn,
                cdhaList: cdhaForBloodLast(split.cdha).cdhaList,
                statusById: {
                  ...Object.fromEntries(
                    split.xn.map((x) => [
                      x.id,
                      resolveViSinhAnalysisStatus(bareViSinhIdFromMilestoneId(x.id) || x.id, mergedDispositions),
                    ]),
                  ),
                  ...cdhaForBloodLast(split.cdha).statusById,
                },
              });
              if (!bloodLast.allowed) {
                toast.warning(bloodLast.message, { duration: 8000 });
                return;
              }
              if (isManual) {
                openOrCreateSession(
                  "BSI",
                  { kind: "XN", id: b.id, date: b.ngay },
                  [b.benh_pham, b.vi_khuan].filter(Boolean).join(" · "),
                  { eventDisposition: { kind: "NEW_ANALYSIS", label: "" }, ketLuan: "" },
                );
                return;
              }
              const site = openSession;
              const disp = resolveIndexEventDisposition({
                indexId: b.id,
                indexDate: b.ngay,
                specimenOrLabel: b.benh_pham,
                organism: b.vi_khuan,
                priorEvents,
                openSiteSessions: openSiteSessionsForSbap,
                analysisDispositions: mergedDispositions,
              });
              if (disp.kind === "SECONDARY_BSI") {
                applySecondaryBsiVeto({
                  sampleId: b.id,
                  sampleDate: b.ngay,
                  ketLuanLabel: disp.ketLuanLabel,
                  sites: disp.sites,
                });
                return;
              }
              if (disp.kind === "BELONGS_PRIOR_EVENT" || disp.kind === "CLOSED_INSUFFICIENT") {
                toast.message(disp.ketLuanLabel);
                return;
              }
              openOrCreateSession(
                "BSI",
                { kind: "XN", id: b.id, date: b.ngay },
                [b.benh_pham, b.vi_khuan].filter(Boolean).join(" · "),
                site.panel !== "BSI"
                  ? {
                      bsiLocalizedSite: {
                        majorType: site.panel as "UTI" | "PNEU" | "SSI" | "VAE",
                        criteriaMet: Boolean(site.draft.eventEstablished),
                        siteOrganism:
                          split.xn.find((x) => x.id === site.index.id)?.vi_khuan ||
                          null,
                        siteIndexDate: site.index.date.slice(0, 10),
                        siteDoe: (site.draft.nsk || site.index.date).slice(0, 10),
                      },
                    }
                  : undefined,
              );
            }}
          >
            {({ analysisColumns }) => {
              const slots = analysisSlotsForPanel(analysisColumns, openSession.panel);
              return (
              <NkbvBaWorkspaceBoundDayGrid
                {...dayGridBind}
                activeXnId={
                  openSession.index.kind === "XN" ? openSession.index.id : null
                }
                windowColumns={slots.windowColumns}
                tailColumns={slots.tailColumns}
              />
              );
            }}
          </NkbvSyndromeIwpPanel>
        ) : openSession && openSession.panel === "SSI" ? (
          <NkbvSyndromeSsiPanel
            columns={panelColumns}
            index={openSession.index}
            indexLabel={openSession.indexLabel}
            ngayVaoVien={ngayVaoVien}
            xn={split.xn}
            cdha={cdhaList}
            surgeryByDate={split.surgeryByDate}
            tieuChuanByDate={split.tieuChuanChuyenBietByDate}
            baLamSangByDate={baClinicalLamSang}
            draft={openSession.draft}
            onDraftChange={(patch) => patchDraft(openSession.id, patch)}
            onPersistSsiTc={(date, key, label, on) =>
              void persistPanelLamSang(date, key, label, on)
            }
            allowedEdit={allowedEdit}
            analysisDispositions={mergedDispositions}
            sampleConclusions={sampleConclusions}
            analysisMode={analysisMode}
            onManualSampleConclude={persistManualSampleConclusion}
            onManualSampleClear={(p) => clearManualSampleConclusion(p.indexId)}
            priorEvents={priorEvents}
            openSiteSessions={openSiteSessionsForSbap}
            onClose={() => setOpenSessionId(null)}
            onCloseInsufficient={closeInsufficient}
            onConfirmSecondaryBlood={(payload) => {
              if (isManual) return;
              applySecondaryBsiVeto({
                sampleId: payload.sampleId,
                sampleDate: payload.date,
                ketLuanLabel: payload.label,
                sites: [],
              });
            }}
            onOpenPrimaryBsi={(bloodId) => {
              const b = split.xn.find((x) => x.id === bloodId);
              if (!b) return;
              if (isManual) {
                openOrCreateSession(
                  "BSI",
                  { kind: "XN", id: b.id, date: b.ngay },
                  [b.benh_pham, b.vi_khuan].filter(Boolean).join(" · "),
                  { eventDisposition: { kind: "NEW_ANALYSIS", label: "" }, ketLuan: "" },
                );
                return;
              }
              const disp = resolveIndexEventDisposition({
                indexId: b.id,
                indexDate: b.ngay,
                specimenOrLabel: b.benh_pham,
                organism: b.vi_khuan,
                priorEvents,
                openSiteSessions: openSiteSessionsForSbap,
                analysisDispositions: mergedDispositions,
              });
              if (disp.kind === "SECONDARY_BSI") {
                applySecondaryBsiVeto({
                  sampleId: b.id,
                  sampleDate: b.ngay,
                  ketLuanLabel: disp.ketLuanLabel,
                  sites: disp.sites,
                });
                return;
              }
              if (disp.kind === "BELONGS_PRIOR_EVENT" || disp.kind === "CLOSED_INSUFFICIENT") {
                toast.message(disp.ketLuanLabel);
                return;
              }
              openOrCreateSession(
                "BSI",
                { kind: "XN", id: b.id, date: b.ngay },
                [b.benh_pham, b.vi_khuan].filter(Boolean).join(" · "),
                {
                  bsiLocalizedSite: {
                    majorType: "SSI",
                    criteriaMet: Boolean(openSession.draft.eventEstablished),
                    siteOrganism: null,
                    siteIndexDate: openSession.index.date.slice(0, 10),
                    siteDoe: openSession.index.date.slice(0, 10),
                  },
                },
              );
            }}
          >
            {({ analysisColumns }) => {
              const slots = analysisSlotsForPanel(analysisColumns, openSession.panel);
              return (
              <NkbvBaWorkspaceBoundDayGrid
                {...dayGridBind}
                activeXnId={null}
                windowColumns={slots.windowColumns}
                tailColumns={slots.tailColumns}
              />
              );
            }}
          </NkbvSyndromeSsiPanel>
        ) : openSession && openSession.panel === "CH17" ? (
          <NkbvSyndromeCh17Panel
            columns={panelColumns}
            index={openSession.index}
            indexLabel={openSession.indexLabel}
            ngayVaoVien={ngayVaoVien}
            ngayRaVien={ngayRaVien}
            xn={split.xn}
            cdha={cdhaList}
            draft={openSession.draft}
            onDraftChange={(patch) => patchDraft(openSession.id, patch)}
            allowedEdit={allowedEdit}
            analysisDispositions={mergedDispositions}
            sampleConclusions={sampleConclusions}
            analysisMode={analysisMode}
            onManualSampleConclude={persistManualSampleConclusion}
            onManualSampleClear={(p) => clearManualSampleConclusion(p.indexId)}
            priorEvents={priorEvents}
            openSiteSessions={openSiteSessionsForSbap}
            onClose={() => setOpenSessionId(null)}
            onCloseInsufficient={closeInsufficient}
            onConfirmSecondaryBlood={(payload) => {
              if (isManual) return;
              applySecondaryBsiVeto({
                sampleId: payload.sampleId,
                sampleDate: payload.date,
                ketLuanLabel: payload.label,
                sites: [],
              });
            }}
            onOpenPrimaryBsi={(bloodId) => {
              const b = split.xn.find((x) => x.id === bloodId);
              if (!b) return;
              openOrCreateSession(
                "BSI",
                { kind: "XN", id: b.id, date: b.ngay },
                [b.benh_pham, b.vi_khuan].filter(Boolean).join(" · "),
              );
            }}
          >
            {({ analysisColumns }) => {
              const slots = analysisSlotsForPanel(analysisColumns, openSession.panel);
              return (
                <NkbvBaWorkspaceBoundDayGrid
                  {...dayGridBind}
                  activeXnId={
                    openSession.index.kind === "XN" ? openSession.index.id : null
                  }
                  windowColumns={slots.windowColumns}
                  tailColumns={slots.tailColumns}
                />
              );
            }}
          </NkbvSyndromeCh17Panel>
        ) : openSession && isShellPanel(openSession.panel) ? (
          <NkbvSyndromeShellPanel
            panel={openSession.panel}
            columns={panelColumns}
            index={openSession.index}
            indexLabel={openSession.indexLabel}
            draft={openSession.draft}
            onDraftChange={(patch) => patchDraft(openSession.id, patch)}
            allowedEdit={allowedEdit}
            xn={split.xn}
            cdha={cdhaList}
            analysisDispositions={mergedDispositions}
            sampleConclusions={sampleConclusions}
            analysisMode={analysisMode}
            onManualSampleConclude={persistManualSampleConclusion}
            onManualSampleClear={(p) => clearManualSampleConclusion(p.indexId)}
            priorEvents={priorEvents}
            openSiteSessions={openSiteSessionsForSbap}
            onClose={() => setOpenSessionId(null)}
          >
            {({ analysisColumns }) => {
              const slots = analysisSlotsForPanel(analysisColumns, openSession.panel);
              return (
              <NkbvBaWorkspaceBoundDayGrid
                {...dayGridBind}
                activeXnId={
                  openSession.index.kind === "XN" ? openSession.index.id : null
                }
                windowColumns={slots.windowColumns}
                tailColumns={slots.tailColumns}
              />
              );
            }}
          </NkbvSyndromeShellPanel>
        ) : (
          <NkbvBaWorkspaceBoundDayGrid
            {...dayGridBind}
            activeXnId={null}
            windowColumns={[]}
            tailColumns={closedGridConcludeColumns}
          />
        )}
    </>
  );
}
