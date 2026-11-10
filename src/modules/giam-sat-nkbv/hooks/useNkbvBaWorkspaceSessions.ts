"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { NkbvBaMultiTimelineWorkspaceProps } from "../components/nkbv-ba-workspace.types";
import { loadBaAnalysisSessions, mergeBaAnalysisSessions, saveBaAnalysisSessions, type BaAnalysisSession } from "../lib/nkbv-ba-analysis-session";
import { loadNkbvBaPhanTichSessions, replaceNkbvBaPhanTichSessions } from "../actions/giam-sat-nkbv.actions";
import { countDungCuCalendarDays } from "../lib/nkbv-ba-ngay";
import { isAdultVaeInPlan } from "../lib/nkbv-pneu-vae-route";
import { ageYearsFromNgaySinh } from "../lib/nkbv-age-ui";
import { type BaSampleConclusion } from "../lib/nkbv-ba-sample-conclusions";
import { type BaAnalysisMode, isManualAnalysisMode, loadBaAnalysisModePref, saveBaAnalysisModePref } from "../lib/nkbv-ba-analysis-mode";

export function useNkbvBaWorkspaceSessions({
  maBenhAn,
  ngaySinh,
  ngayVaoVien,
  ngayRaVien,
  deviceDays,
}: {
  maBenhAn: string;
  ngaySinh: NkbvBaMultiTimelineWorkspaceProps["ngaySinh"];
  ngayVaoVien: string;
  ngayRaVien: NkbvBaMultiTimelineWorkspaceProps["ngayRaVien"];
  deviceDays: NonNullable<NkbvBaMultiTimelineWorkspaceProps["deviceDays"]>;
}) {
  const [analysisMode, setAnalysisMode] = useState<BaAnalysisMode>("CDC");
  const [sessions, setSessions] = useState<BaAnalysisSession[]>([]);
  const hydratedKeyRef = React.useRef("");
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  /** Kết luận đã chốt theo mẫu — luôn hiện khi PT Index khác. */
  const [sampleConclusions, setSampleConclusions] = useState<BaSampleConclusion[]>(
    [],
  );
  const [preferVae, setPreferVae] = useState(false);
  const isManual = isManualAnalysisMode(analysisMode);
  const stayAgeYears = ageYearsFromNgaySinh(ngaySinh, ngayVaoVien);
  const ventStayDays = useMemo(
    () =>
      countDungCuCalendarDays(
        deviceDays,
        "VENT",
        ngayVaoVien,
        ngayRaVien || new Date().toISOString(),
      ),
    [deviceDays, ngayVaoVien, ngayRaVien],
  );
  const autoPreferVae = isAdultVaeInPlan(stayAgeYears, ventStayDays);
  const effectivePreferVae = preferVae || autoPreferVae;

  useEffect(() => {
    setAnalysisMode(loadBaAnalysisModePref(maBenhAn));
    setOpenSessionId(null);
  }, [maBenhAn]);

  const switchAnalysisMode = useCallback(
    (next: BaAnalysisMode) => {
      if (next === analysisMode) return;
      saveBaAnalysisModePref(maBenhAn, next);
      setAnalysisMode(next);
      setOpenSessionId(null);
      setSessions(loadBaAnalysisSessions(maBenhAn, next));
    },
    [analysisMode, maBenhAn],
  );

  useEffect(() => {
    let cancelled = false;
    hydratedKeyRef.current = "";
    void (async () => {
      const res = await loadNkbvBaPhanTichSessions({
        ma_benh_an: maBenhAn,
        mode: analysisMode,
      });
      if (cancelled) return;
      const local = loadBaAnalysisSessions(maBenhAn, analysisMode);
      const merged = mergeBaAnalysisSessions(res.success ? res.sessions : [], local);
      saveBaAnalysisSessions(maBenhAn, merged, analysisMode);
      hydratedKeyRef.current = `${maBenhAn}:${analysisMode}`;
      setSessions(merged);
      // Chỉ sync lên server khi local có phiên chưa có trên server (tránh ghi lặp mỗi mount).
      if (res.success && merged.length) {
        const serverIds = new Set((res.sessions || []).map((s) => s.id));
        const needsPush = merged.some((s) => !serverIds.has(s.id));
        if (needsPush) {
          void replaceNkbvBaPhanTichSessions({
            ma_benh_an: maBenhAn,
            mode: analysisMode,
            sessions: merged,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [maBenhAn, analysisMode]);
  return {
    analysisMode,
    sessions,
    setSessions,
    hydratedKeyRef,
    openSessionId,
    setOpenSessionId,
    sampleConclusions,
    setSampleConclusions,
    preferVae,
    setPreferVae,
    isManual,
    autoPreferVae,
    effectivePreferVae,
    switchAnalysisMode,
  };
}
