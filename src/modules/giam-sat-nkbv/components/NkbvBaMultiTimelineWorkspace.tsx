"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { BaTimelineMilestone } from "../lib/nkbv-ba-timeline-core";
import {
  buildGridColumns,
  imagingCatalogForNghiNgo,
  splitMilestonesToGridRows,
  ssiTcCatalogWithoutSurgery,
  type BaGridActiveIndex,
  type BaGridCdhaCell,
} from "../lib/nkbv-ba-grid-engine";
import {
  buildSessionIndexSuggestions,
  shouldDeferPrimaryBsi,
  specimenToSyndromePanel,
  type SessionIndexSuggestion,
  type SyndromePanelId,
} from "../lib/nkbv-specimen-syndrome";
import {
  formatSessionChipLabel,
  loadBaAnalysisSessions,
  pruneBaAnalysisSessions,
  removeBaAnalysisSession,
  sessionIdForIndex,
  updateSessionDraft,
  upsertBaAnalysisSession,
  type BaAnalysisSession,
  type BaAnalysisSessionDraft,
} from "../lib/nkbv-ba-analysis-session";
import { useSyncedHorizontalScroll } from "../hooks/useSyncedHorizontalScroll";
import NkbvSyndromeIwpPanel, { deviceDatesForPanel } from "./NkbvSyndromeIwpPanel";
import NkbvSyndromeShellPanel, { isShellPanel } from "./NkbvSyndromeShellPanel";
import NkbvSyndromeSsiPanel from "./NkbvSyndromeSsiPanel";
import {
  softDeleteNkbvBaTimelineByKey,
  softDeleteNkbvBaTimelineMilestone,
  upsertNkbvBaTimelineMilestone,
} from "../actions/giam-sat-nkbv.actions";
import { clinicalRitEnd } from "../lib/nkbv-shared-timeline";
import {
  bareViSinhIdFromMilestoneId,
  resolveViSinhAnalysisStatus,
  statusBadgeLabel,
  type ViSinhAnalysisDispositionRow,
  type ViSinhAnalysisStatus,
} from "../lib/nkbv-vi-sinh-analysis-status";
import { toast } from "sonner";
import NkbvGridCriteriaAddPopover from "./NkbvGridCriteriaAddPopover";

type KhoaOpt = { id: string; ma: string; ten: string };

const COL_W = 100;
const LABEL_W = 128;
/** Trên ngưỡng này bảng chung render cửa sổ cột theo scroll (BA nằm lâu). */
const WINDOW_THRESHOLD = 40;
const WINDOW_OVERSCAN = 6;

type XnCell = ReturnType<typeof splitMilestonesToGridRows>["xn"][number];
type TcItem = { key: string; label: string; id?: string };
type CdhaCatalogItem = { criteriaKey: string; title: string; milestoneKind: string };

/** Handler ổn định tham chiếu — hàng memo không re-render vì closure mới. */
function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = React.useRef(fn);
  React.useInsertionEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}

/** Cửa sổ cột theo scrollLeft (rAF) — chỉ bật khi quá ngưỡng cột. */
function useColumnWindow(colCount: number, colW: number, enabled: boolean) {
  const elRef = React.useRef<HTMLDivElement | null>(null);
  const rafRef = React.useRef(0);
  const [range, setRange] = useState<{ from: number; to: number }>({ from: 0, to: colCount });

  const update = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const visible = Math.ceil(el.clientWidth / colW) + 1;
    const from = Math.max(0, Math.floor(el.scrollLeft / colW) - WINDOW_OVERSCAN);
    const to = Math.min(colCount, from + visible + WINDOW_OVERSCAN * 2);
    setRange((p) => (p.from === from && p.to === to ? p : { from, to }));
  }, [colCount, colW]);

  const setEl = useCallback(
    (el: HTMLDivElement | null) => {
      elRef.current = el;
      if (el) update();
    },
    [update],
  );

  const onScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      update();
    });
  }, [update]);

  const scrollToColumn = useCallback(
    (index: number) => {
      const el = elRef.current;
      if (el && index >= 0) el.scrollLeft = Math.max(0, index * colW);
    },
    [colW],
  );

  useEffect(() => {
    if (enabled) update();
    else setRange({ from: 0, to: colCount });
  }, [enabled, colCount, update]);

  return {
    setEl,
    onScroll,
    scrollToColumn,
    from: enabled ? range.from : 0,
    to: enabled ? Math.max(range.to, Math.min(colCount, 1)) : colCount,
  };
}

type Props = {
  maBenhAn: string;
  ngayVaoVien: string;
  ngayRaVien?: string | null;
  ngaySinh?: string | null;
  defaultKhoa?: string | null;
  khoaTen?: string | null;
  khoas?: KhoaOpt[];
  timeline: BaTimelineMilestone[];
  devices: Array<{
    id: string;
    device_type: string;
    insertion_date: string;
    removal_date: string | null;
  }>;
  /** Hàng đợi XN (+) — từ hub cases + skip metadata */
  analysisDispositions?: ViSinhAnalysisDispositionRow[];
  allowedEdit: boolean;
  /** Chọn Index — chỉ đánh dấu mốc, không tạo phiếu */
  onIndexChange?: (input: { milestoneId: string }) => void;
  /** Sau kết luận — tạo phiếu phân tích (late create) */
  onCreatePhieu?: (input: { milestoneId: string; panel: SyndromePanelId }) => void;
  /** Bỏ qua XN (+) có lý do */
  onSkipViSinh?: (input: { viSinhId: string; reason: string }) => void;
  /** Soft reload hub (silent) — dùng khi cần đồng bộ LIS/case, không mỗi tick TC */
  onReload: () => void;
  /** Patch timeline local sau upsert DB — tránh reload cả hub */
  onTimelineUpsertLocal?: (row: {
    id: string;
    milestone_kind: string;
    milestone_date: string;
    title: string;
    detail?: string | null;
    specimen_hint?: string | null;
    criteria_key?: string | null;
  }) => void;
  onTimelineRemoveLocal?: (milestoneId: string) => void;
};

/**
 * Multi-timeline: bảng chung bằng chứng đầy đủ + phiên hội chứng độc lập.
 */
export default function NkbvBaMultiTimelineWorkspace({
  maBenhAn,
  ngayVaoVien,
  ngayRaVien,
  ngaySinh,
  defaultKhoa,
  timeline,
  devices,
  analysisDispositions = [],
  allowedEdit,
  onIndexChange,
  onCreatePhieu,
  onSkipViSinh,
  onReload,
  onTimelineUpsertLocal,
  onTimelineRemoveLocal,
}: Props) {
  const split = useMemo(() => splitMilestonesToGridRows(timeline), [timeline]);
  // Bảng chung và bảng phân tích có khung ngày khác nhau → scroll độc lập
  const panelSync = useSyncedHorizontalScroll();
  const ssiTcCatalog = useMemo(() => ssiTcCatalogWithoutSurgery(), []);
  const cdhaCatalog = useMemo(() => {
    const pneu = imagingCatalogForNghiNgo("PNEU");
    const abscess = imagingCatalogForNghiNgo("SSI").filter((c) => c.criteriaKey === "abscess_imaging");
    const seen = new Set<string>();
    return [...pneu, ...abscess].filter((c) => {
      if (seen.has(c.criteriaKey)) return false;
      seen.add(c.criteriaKey);
      return true;
    });
  }, []);

  const [sessions, setSessions] = useState<BaAnalysisSession[]>([]);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [preferVae, setPreferVae] = useState(false);
  const [localCdha, setLocalCdha] = useState<BaGridCdhaCell[]>([]);
  /** Optimistic tick SSI TC — giảm lag chờ Server Action. */
  const [localSsiTc, setLocalSsiTc] = useState<
    Array<{ id: string; ngay: string; key: string; label: string }>
  >([]);
  /** Khóa đang ghi DB — chặn double-click tạo bản trùng. */
  const inFlightRef = React.useRef<Set<string>>(new Set());

  const cdhaKey = (x: Pick<BaGridCdhaCell, "ngay" | "tieu_chuan_key">) =>
    `${String(x.ngay).slice(0, 10)}|${x.tieu_chuan_key || "imaging_chest"}`;

  // Khi server/timeline đã có CĐHA cùng ngày+loại → bỏ bản local tạm (nguyên nhân XQ lặp)
  useEffect(() => {
    setLocalCdha((prev) =>
      prev.filter((loc) => !split.cdha.some((b) => cdhaKey(b) === cdhaKey(loc))),
    );
  }, [split.cdha]);

  useEffect(() => {
    setLocalSsiTc((prev) =>
      prev.filter((loc) => {
        const day = (split.tieuChuanChuyenBietByDate[loc.ngay] || []).some(
          (x) => x.key === loc.key,
        );
        return !day;
      }),
    );
  }, [split.tieuChuanChuyenBietByDate]);

  const cdhaList = useMemo(() => {
    const byKey = new Map<string, BaGridCdhaCell>();
    for (const b of split.cdha) byKey.set(cdhaKey(b), b);
    for (const x of localCdha) {
      const k = cdhaKey(x);
      if (!byKey.has(k)) byKey.set(k, x);
    }
    return [...byKey.values()];
  }, [split.cdha, localCdha]);

  /** TC SSI = DB + optimistic local (dùng cho gợi ý phiên + hàng lưới). */
  const ssiTcByDate = useMemo(() => {
    const m: Record<string, Array<{ key: string; label: string; id?: string }>> = {};
    for (const [d, items] of Object.entries(split.tieuChuanChuyenBietByDate)) {
      m[d] = [...items];
    }
    for (const loc of localSsiTc) {
      const day = m[loc.ngay] || (m[loc.ngay] = []);
      if (!day.some((x) => x.key === loc.key)) {
        day.push({ key: loc.key, label: loc.label, id: loc.id });
      }
    }
    return m;
  }, [split.tieuChuanChuyenBietByDate, localSsiTc]);

  /** Gợi ý phiên đúng domain: chỉ Index từ XN / CĐHA / TC DOE SSI / ngày mổ. */
  const sessionSuggestions = useMemo(
    () =>
      buildSessionIndexSuggestions({
        xn: split.xn,
        cdha: cdhaList,
        surgeryByDate: split.surgeryByDate,
        ssiTcByDate,
        preferVae,
      }),
    [split.xn, cdhaList, split.surgeryByDate, ssiTcByDate, preferVae],
  );

  // Nạp phiên + cắt phiên mồ côi (Index không còn trên bảng chung)
  useEffect(() => {
    const validIds = new Set<string>();
    for (const x of split.xn) validIds.add(x.id);
    for (const c of cdhaList) validIds.add(c.id);
    for (const items of Object.values(split.surgeryByDate)) {
      for (const s of items) if (s.id) validIds.add(s.id);
    }
    for (const items of Object.values(ssiTcByDate)) {
      for (const t of items) if (t.id && !t.id.startsWith("local-")) validIds.add(t.id);
    }
    const next = pruneBaAnalysisSessions(maBenhAn, validIds);
    setSessions(next);
    setOpenSessionId((cur) => (cur && next.some((s) => s.id === cur) ? cur : null));
  }, [maBenhAn, split.xn, cdhaList, split.surgeryByDate, ssiTcByDate]);

  const openSession = useMemo(
    () => sessions.find((s) => s.id === openSessionId) || null,
    [sessions, openSessionId],
  );

  /** Khung bảng chung: VV−2 → hết (ra viện/hôm nay) + kéo đến hết RIT nếu đã có DOE phiên. */
  const commonColumns = useMemo(() => {
    const evidenceDates = [
      ...split.xn.map((x) => x.ngay),
      ...cdhaList.map((c) => c.ngay),
      ...Object.keys(split.surgeryByDate),
      ...Object.keys(split.tieuChuanChuyenBietByDate),
      ...Object.keys(split.trieuChungLamSangByDate),
    ];
    for (const s of sessions) {
      // DOE chưa chốt trên draft → tạm kéo khung theo Index (+13 = hết RIT tối thiểu)
      const anchor = s.index?.date;
      if (anchor) evidenceDates.push(clinicalRitEnd(String(anchor).slice(0, 10)));
    }
    return buildGridColumns({ ngayVaoVien, ngayRaVien, evidenceDates });
  }, [
    ngayVaoVien,
    ngayRaVien,
    split.xn,
    split.surgeryByDate,
    split.tieuChuanChuyenBietByDate,
    split.trieuChungLamSangByDate,
    cdhaList,
    sessions,
  ]);

  /** Khung bảng phân tích: neo Index −7…+14 (hợp đồng UX). */
  const panelColumns = useMemo(() => {
    if (!openSession) return commonColumns;
    return buildGridColumns({
      ngayVaoVien,
      ngayRaVien,
      evidenceDates: [],
      indexAnchor: {
        date: openSession.index.date,
        beforeDays: 7,
        afterDays: 14,
      },
    });
  }, [openSession, ngayVaoVien, ngayRaVien, commonColumns]);

  const windowEnabled = commonColumns.length > WINDOW_THRESHOLD;
  const {
    setEl: setGridScrollEl,
    onScroll: onGridScroll,
    scrollToColumn,
    from: colFrom,
    to: colTo,
  } = useColumnWindow(commonColumns.length, COL_W, windowEnabled);

  // Mở phiên phân tích → cuộn bảng chung tới ngày Index cho dễ đối chiếu
  useEffect(() => {
    if (!openSession) return;
    const ix = openSession.index.date.slice(0, 10);
    const idx = commonColumns.findIndex((c) => c.date === ix);
    if (idx >= 0) scrollToColumn(idx - 3);
  }, [openSessionId]);

  /** Map theo ngày — hàng memo không filter lại mỗi render. */
  const xnByDate = useMemo(() => {
    const m: Record<string, XnCell[]> = {};
    for (const x of split.xn) {
      const d = x.ngay.slice(0, 10);
      (m[d] ||= []).push(x);
    }
    return m;
  }, [split.xn]);

  const cdhaByDate = useMemo(() => {
    const m: Record<string, BaGridCdhaCell[]> = {};
    for (const x of cdhaList) {
      const d = x.ngay.slice(0, 10);
      (m[d] ||= []).push(x);
    }
    return m;
  }, [cdhaList]);

  const xnStatusById = useMemo(() => {
    const m: Record<string, ViSinhAnalysisStatus> = {};
    for (const x of split.xn) {
      const bare = bareViSinhIdFromMilestoneId(x.id) || x.id;
      m[x.id] = resolveViSinhAnalysisStatus(bare, analysisDispositions);
    }
    return m;
  }, [split.xn, analysisDispositions]);

  const patchDraft = useCallback(
    (sessionId: string, patch: Partial<BaAnalysisSessionDraft>) => {
      const next = updateSessionDraft(maBenhAn, sessionId, patch);
      setSessions(next);
    },
    [maBenhAn],
  );

  const openOrCreateSession = useCallback(
    (
      panel: SyndromePanelId,
      index: BaGridActiveIndex,
      indexLabel: string,
      draftExtra?: Partial<BaAnalysisSessionDraft>,
    ) => {
      const existing = loadBaAnalysisSessions(maBenhAn).find(
        (s) => s.id === sessionIdForIndex(panel, index.id),
      );
      const needsDevicePrefill =
        (panel === "UTI" || panel === "PNEU" || panel === "BSI") &&
        (!existing || !existing.draft.canThiepDates.length);
      const draftSeed: Partial<BaAnalysisSessionDraft> = {
        ...(needsDevicePrefill
          ? {
              canThiepDates: deviceDatesForPanel(
                panel === "UTI" ? "UTI" : panel === "PNEU" ? "PNEU" : "BSI",
                devices,
                ngayRaVien,
              ),
            }
          : {}),
        ...(draftExtra || {}),
      };
      const next = upsertBaAnalysisSession({
        maBenhAn,
        panel,
        index,
        indexLabel,
        draft: Object.keys(draftSeed).length ? draftSeed : undefined,
      });
      setSessions(next);
      setOpenSessionId(sessionIdForIndex(panel, index.id));
      onIndexChange?.({ milestoneId: index.id });
    },
    [maBenhAn, onIndexChange, devices, ngayRaVien],
  );

  const openFromXn = (x: (typeof split.xn)[0]) => {
    const panel = specimenToSyndromePanel({
      loai_benh_pham: x.benh_pham,
      preferVae,
    });
    const nextIndex: BaGridActiveIndex = { kind: "XN", id: x.id, date: x.ngay };
    const label = [x.benh_pham, x.vi_khuan].filter(Boolean).join(" · ");

    if (!panel) {
      toast.message(
        "Chưa map được hội chứng từ bệnh phẩm chuẩn — chuẩn hóa loại bệnh phẩm ở kho vi sinh trước.",
      );
      return;
    }

    const siteOpen =
      openSession && openSession.panel !== "BSI" ? openSession.panel : null;
    if (
      shouldDeferPrimaryBsi({
        selectedSpecimenPanel: panel,
        activeSitePanel: siteOpen,
      })
    ) {
      toast.message(
        "Cấy máu: phân tích site khu trú (PNEU/UTI/SSI/VAE) trước — sau đó mở Secondary BSI từ bảng phân tích. Hoặc mở gợi ý BSI khi không còn phiên site.",
      );
      return;
    }

    openOrCreateSession(panel, nextIndex, label || x.benh_pham);
  };

  const openFromCdha = (c: BaGridCdhaCell) => {
    if (c.tieu_chuan_key === "abscess_imaging") {
      openOrCreateSession("SSI", { kind: "CDHA", id: c.id, date: c.ngay }, c.mo_ta_benh_ly || "Áp xe");
      return;
    }
    openOrCreateSession(
      "PNEU",
      { kind: "CDHA", id: c.id, date: c.ngay },
      c.mo_ta_benh_ly || "CĐHA",
    );
  };

  const openFromSurgeryOrSsi = (id: string, date: string, label: string) => {
    openOrCreateSession("SSI", { kind: "TIEU_CHUAN", id, date }, label);
  };

  const applyUpsertRow = (data: Record<string, unknown> | null | undefined) => {
    if (!data?.id || !onTimelineUpsertLocal) {
      onReload();
      return;
    }
    onTimelineUpsertLocal({
      id: String(data.id),
      milestone_kind: String(data.milestone_kind || ""),
      milestone_date: String(data.milestone_date || "").slice(0, 10),
      title: String(data.title || ""),
      detail: data.detail != null ? String(data.detail) : null,
      specimen_hint: data.specimen_hint != null ? String(data.specimen_hint) : null,
      criteria_key: data.criteria_key != null ? String(data.criteria_key) : null,
    });
  };

  /** Tick CĐHA: chọn = thêm, bỏ chọn = xóa theo khóa (BA+ngày+criteria) — không mở form phân tích. */
  const toggleCdha = async (
    date: string,
    criteriaKey: string,
    title: string,
    milestoneKind: string,
  ) => {
    if (!allowedEdit) return;
    const flightKey = `cdha|${date}|${criteriaKey}`;
    if (inFlightRef.current.has(flightKey)) return;
    const existing = cdhaList.find(
      (x) => x.ngay.slice(0, 10) === date && (x.tieu_chuan_key || "imaging_chest") === criteriaKey,
    );
    if (existing) {
      // Untick: bỏ local ngay + soft-delete TẤT CẢ bản cùng khóa (chống XQ hiện lại)
      inFlightRef.current.add(flightKey);
      setLocalCdha((p) => p.filter((x) => cdhaKey(x) !== `${date}|${criteriaKey}`));
      onTimelineRemoveLocal?.(existing.id);
      // Xóa luôn các id khác cùng khóa còn trong timeline (dữ liệu trùng cũ)
      for (const c of split.cdha) {
        if (
          c.ngay.slice(0, 10) === date &&
          (c.tieu_chuan_key || "imaging_chest") === criteriaKey &&
          c.id !== existing.id
        ) {
          onTimelineRemoveLocal?.(c.id);
        }
      }
      const res = await softDeleteNkbvBaTimelineByKey({
        ma_benh_an: maBenhAn,
        milestone_date: date,
        criteria_key: criteriaKey,
      });
      inFlightRef.current.delete(flightKey);
      if (!res.success) {
        toast.error(res.error || "Không xóa được CĐHA");
        onReload();
      }
      return;
    }
    inFlightRef.current.add(flightKey);
    const localId = `local-cdha-${date}-${criteriaKey}`;
    setLocalCdha((p) => [
      ...p.filter((x) => cdhaKey(x) !== `${date}|${criteriaKey}`),
      {
        id: localId,
        ngay: date,
        loai: criteriaKey.includes("abscess") ? "CT" : "XQ",
        mo_ta_benh_ly: title,
        tieu_chuan_key: criteriaKey as BaGridCdhaCell["tieu_chuan_key"],
      },
    ]);
    const res = await upsertNkbvBaTimelineMilestone({
      ma_benh_an: maBenhAn,
      milestone_kind: milestoneKind,
      milestone_date: date,
      title,
      criteria_key: criteriaKey as never,
    });
    inFlightRef.current.delete(flightKey);
    if (!res.success) {
      setLocalCdha((p) => p.filter((x) => x.id !== localId));
      toast.error(res.error || "Chưa lưu CĐHA");
      return;
    }
    setLocalCdha((p) => p.filter((x) => x.id !== localId));
    applyUpsertRow(res.data as Record<string, unknown> | undefined);
  };

  const editCdhaDate = async (id: string, nextDate: string) => {
    if (!allowedEdit || !id || id.startsWith("local-")) return;
    const cell = cdhaList.find((x) => x.id === id);
    if (!cell) return;
    const res = await upsertNkbvBaTimelineMilestone({
      id,
      ma_benh_an: maBenhAn,
      milestone_kind: "IMAGING_CHEST",
      milestone_date: nextDate,
      title: cell.mo_ta_benh_ly || "CĐHA",
      criteria_key: (cell.tieu_chuan_key || "imaging_chest") as never,
    });
    if (!res.success) toast.error(res.error || "Không sửa ngày CĐHA");
    else applyUpsertRow(res.data as Record<string, unknown> | undefined);
  };

  const addSurgery = async (date: string) => {
    if (!allowedEdit) return;
    if ((split.surgeryByDate[date] || []).length) {
      // Đã có ngày mổ — chỉ neo Index khi user bấm chip, không tự mở lại
      return;
    }
    const res = await upsertNkbvBaTimelineMilestone({
      ma_benh_an: maBenhAn,
      milestone_kind: "PROCEDURE_SURGERY",
      milestone_date: date,
      title: "Ngày phẫu thuật (Day 1 SP)",
      criteria_key: "procedure_surgery",
    });
    if (!res.success) {
      toast.error(res.error || "Chưa lưu ngày mổ");
      return;
    }
    applyUpsertRow(res.data as Record<string, unknown> | undefined);
  };

  const removeMilestone = async (id: string | undefined) => {
    if (!allowedEdit || !id || id.startsWith("local-")) return;
    onTimelineRemoveLocal?.(id);
    const res = await softDeleteNkbvBaTimelineMilestone(id);
    if (!res.success) {
      toast.error(res.error || "Không xóa được");
      onReload();
    }
  };

  const toggleSsiTc = async (date: string, criteriaKey: string, title: string) => {
    if (!allowedEdit) return;
    const flightKey = `ssi|${date}|${criteriaKey}`;
    if (inFlightRef.current.has(flightKey)) return;
    const existing =
      (split.tieuChuanChuyenBietByDate[date] || []).find((x) => x.key === criteriaKey) ||
      localSsiTc.find((x) => x.ngay === date && x.key === criteriaKey);
    if (existing) {
      inFlightRef.current.add(flightKey);
      setLocalSsiTc((p) => p.filter((x) => !(x.ngay === date && x.key === criteriaKey)));
      if (existing.id) onTimelineRemoveLocal?.(existing.id);
      const res = await softDeleteNkbvBaTimelineByKey({
        ma_benh_an: maBenhAn,
        milestone_date: date,
        criteria_key: criteriaKey,
      });
      inFlightRef.current.delete(flightKey);
      if (!res.success) {
        toast.error(res.error || "Không xóa được TC SSI");
        onReload();
      }
      return;
    }
    inFlightRef.current.add(flightKey);
    const localId = `local-ssi-${date}-${criteriaKey}`;
    setLocalSsiTc((p) => [
      ...p.filter((x) => !(x.ngay === date && x.key === criteriaKey)),
      { id: localId, ngay: date, key: criteriaKey, label: title },
    ]);
    const res = await upsertNkbvBaTimelineMilestone({
      ma_benh_an: maBenhAn,
      milestone_kind: "SYMPTOM",
      milestone_date: date,
      title,
      criteria_key: criteriaKey as never,
    });
    inFlightRef.current.delete(flightKey);
    if (!res.success) {
      setLocalSsiTc((p) => p.filter((x) => x.id !== localId));
      toast.error(res.error || "Chưa lưu TC SSI");
      return;
    }
    setLocalSsiTc((p) => p.filter((x) => x.id !== localId));
    // Chỉ gắn bằng chứng — không mở bảng phân tích SSI (gây lag)
    applyUpsertRow(res.data as Record<string, unknown> | undefined);
  };

  const persistPanelLamSang = useCallback(
    async (date: string, criteriaKey: string, title: string, turnOn: boolean) => {
      if (!allowedEdit) return;
      const flightKey = `ls|${date}|${criteriaKey}`;
      if (inFlightRef.current.has(flightKey)) return;
      // TC SSI chẩn đoán nằm ở giỏ tieuChuanChuyenBiet, LS hội chứng ở trieuChungLamSang
      const existing =
        (split.trieuChungLamSangByDate[date] || []).find((x) => x.key === criteriaKey) ||
        (split.tieuChuanChuyenBietByDate[date] || []).find((x) => x.key === criteriaKey);
      if (!turnOn) {
        inFlightRef.current.add(flightKey);
        if (existing?.id) onTimelineRemoveLocal?.(existing.id);
        const res = await softDeleteNkbvBaTimelineByKey({
          ma_benh_an: maBenhAn,
          milestone_date: date,
          criteria_key: criteriaKey,
        });
        inFlightRef.current.delete(flightKey);
        if (!res.success) {
          toast.error(res.error || "Không xóa được");
          onReload();
        }
        return;
      }
      if (turnOn && !existing) {
        inFlightRef.current.add(flightKey);
        const res = await upsertNkbvBaTimelineMilestone({
          ma_benh_an: maBenhAn,
          milestone_kind: "SYMPTOM",
          milestone_date: date,
          title,
          criteria_key: criteriaKey as never,
        });
        inFlightRef.current.delete(flightKey);
        if (!res.success) toast.error(res.error || "Chưa lưu LS lên BA");
        else if (res.data?.id && onTimelineUpsertLocal) {
          onTimelineUpsertLocal({
            id: String(res.data.id),
            milestone_kind: String(
              (res.data as { milestone_kind?: string }).milestone_kind || "SYMPTOM",
            ),
            milestone_date: date,
            title,
            criteria_key: criteriaKey,
          });
        } else onReload();
      }
    },
    [
      allowedEdit,
      split.trieuChungLamSangByDate,
      split.tieuChuanChuyenBietByDate,
      maBenhAn,
      onReload,
      onTimelineUpsertLocal,
      onTimelineRemoveLocal,
    ],
  );

  // Handler ổn định cho các hàng memo — không phá memo vì closure mới mỗi render
  const stableOpenFromXn = useStableCallback(openFromXn);
  const stableOpenFromCdha = useStableCallback(openFromCdha);
  const stableToggleCdha = useStableCallback(toggleCdha);
  const stableEditCdhaDate = useStableCallback(editCdhaDate);
  const stableRemoveMilestone = useStableCallback(removeMilestone);
  const stableAddSurgery = useStableCallback(addSurgery);
  const stableToggleSsiTc = useStableCallback(toggleSsiTc);
  const stableOpenFromSurgeryOrSsi = useStableCallback(openFromSurgeryOrSsi);

  /** Mở phiên từ gợi ý Index đúng domain (không neo XN đầu bất kỳ). */
  const openFromSuggestion = (s: SessionIndexSuggestion) => {
    if (s.panel === "BSI") {
      const siteOpen =
        openSession && openSession.panel !== "BSI" ? openSession.panel : null;
      if (
        shouldDeferPrimaryBsi({
          selectedSpecimenPanel: "BSI",
          activeSitePanel: siteOpen,
        })
      ) {
        toast.message(
          "Đang có phiên site khu trú — phân tích Secondary BSI trên bảng phân tích site, hoặc đóng phiên site rồi mở BSI.",
        );
        return;
      }
    }
    openOrCreateSession(s.panel, s.index, s.label);
  };

  const removeSession = (sessionId: string) => {
    const next = removeBaAnalysisSession(maBenhAn, sessionId);
    setSessions(next);
    if (openSessionId === sessionId) setOpenSessionId(null);
  };

  return (
    <div className="relative z-[1] flex min-h-0 flex-1 flex-col gap-2 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2 text-[11px]">
        <span className="font-semibold text-slate-800">Bảng chung (6 hàng)</span>
        <span className="text-slate-500">
          Ngày lịch · HD · VS (chọn từng bệnh phẩm) · CĐHA · TC DOE SSI · khoa → bảng phân tích → tạo phiếu
        </span>
        <label className="ml-auto flex items-center gap-1 text-slate-600">
          <input
            type="checkbox"
            checked={preferVae}
            onChange={(e) => setPreferVae(e.target.checked)}
          />
          Hô hấp → ưu tiên VAE
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div
          ref={setGridScrollEl}
          onScroll={onGridScroll}
          className="overflow-x-auto overscroll-contain border border-slate-200 text-[10px]"
        >
          <div
            className="inline-block"
            style={{ minWidth: LABEL_W + Math.max(commonColumns.length, 1) * COL_W }}
          >
            <GridHeadRows
              columns={commonColumns}
              from={colFrom}
              to={colTo}
              colW={COL_W}
              labelW={LABEL_W}
            />
            <GridXnRow
              columns={commonColumns}
              from={colFrom}
              to={colTo}
              colW={COL_W}
              labelW={LABEL_W}
              xnByDate={xnByDate}
              statusById={xnStatusById}
              activeXnId={
                openSession?.index.kind === "XN" ? openSession.index.id : null
              }
              onPickXn={stableOpenFromXn}
            />
            <GridCdhaRow
              columns={commonColumns}
              from={colFrom}
              to={colTo}
              colW={COL_W}
              labelW={LABEL_W}
              cdhaByDate={cdhaByDate}
              catalog={cdhaCatalog}
              allowedEdit={allowedEdit}
              onOpen={stableOpenFromCdha}
              onRemove={stableRemoveMilestone}
              onEditDate={stableEditCdhaDate}
              onToggle={stableToggleCdha}
            />
            <GridSsiTcRow
              columns={commonColumns}
              from={colFrom}
              to={colTo}
              colW={COL_W}
              labelW={LABEL_W}
              tcByDate={ssiTcByDate}
              surgeryByDate={split.surgeryByDate}
              catalog={ssiTcCatalog}
              allowedEdit={allowedEdit}
              onOpen={stableOpenFromSurgeryOrSsi}
              onRemove={stableRemoveMilestone}
              onAddSurgery={stableAddSurgery}
              onToggle={stableToggleSsiTc}
            />
            <GridKhoaRow
              columns={commonColumns}
              from={colFrom}
              to={colTo}
              colW={COL_W}
              labelW={LABEL_W}
              allowedEdit={allowedEdit}
              defaultKhoa={defaultKhoa || ""}
            />
          </div>
        </div>

        {!sessionSuggestions.length ? (
          <p className="mt-3 text-xs text-slate-500">
            Chưa có Index để mở phiên — nạp XN vi sinh, thêm CĐHA, ngày mổ hoặc TC DOE SSI trên bảng
            chung (hoặc bấm chip trên lưới).
          </p>
        ) : null}

        <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="shrink-0 font-semibold text-slate-600">Gợi ý phiên (theo Index):</span>
            {!sessionSuggestions.length ? (
              <span className="text-slate-400">—</span>
            ) : (
              sessionSuggestions.map((s) => {
                const opened = sessions.some((x) => x.id === s.id);
                const active = s.id === openSessionId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openFromSuggestion(s)}
                    className={`rounded-full border px-2.5 py-1 font-semibold ${
                      active
                        ? "border-rose-400 bg-rose-50 text-rose-900"
                        : opened
                          ? "border-emerald-300 bg-emerald-50/80 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                    title={`${s.source} → ${s.panel}`}
                  >
                    {s.panel} · {s.label}
                    {opened && !active ? " · đã mở" : ""}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="shrink-0 font-semibold text-slate-600">Đang phân tích:</span>
            {!sessions.length ? (
              <span className="text-slate-400">Chưa mở phiên</span>
            ) : (
              sessions.map((s) => {
                const active = s.id === openSessionId;
                return (
                  <span
                    key={s.id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${
                      active
                        ? "border-rose-400 bg-rose-50 text-rose-900"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <button type="button" onClick={() => setOpenSessionId(s.id)} title="Mở lại phiên">
                      {formatSessionChipLabel(s)}
                    </button>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-rose-600"
                      title="Xóa phiên nháp"
                      onClick={() => removeSession(s.id)}
                    >
                      ×
                    </button>
                  </span>
                );
              })
            )}
            <span className="ml-auto text-[10px] text-slate-400">
              Chỉ từ XN / CĐHA / TC DOE SSI — phiếu khi bấm «Tạo phiếu»
            </span>
          </div>
        </div>

        {openSession &&
        (openSession.panel === "UTI" ||
          openSession.panel === "PNEU" ||
          openSession.panel === "BSI") ? (
          <NkbvSyndromeIwpPanel
            panel={openSession.panel}
            ngayVaoVien={ngayVaoVien}
            ngayRaVien={ngayRaVien}
            ngaySinh={ngaySinh}
            columns={panelColumns}
            index={openSession.index}
            xn={split.xn}
            cdha={cdhaList}
            devices={devices}
            defaultKhoa={defaultKhoa}
            allowedEdit={allowedEdit}
            draft={openSession.draft}
            baLamSangByDate={split.trieuChungLamSangByDate}
            onDraftChange={(patch) => patchDraft(openSession.id, patch)}
            onPersistLamSang={(date, key, label, on) =>
              void persistPanelLamSang(date, key, label, on)
            }
            scrollRef={panelSync.register(0)}
            onScrollSync={panelSync.onScroll(0)}
            colW={COL_W}
            labelW={LABEL_W}
            onClose={() => setOpenSessionId(null)}
            onOpenPrimaryBsi={(bloodId) => {
              const b = split.xn.find((x) => x.id === bloodId);
              if (!b) return;
              const site = openSession;
              openOrCreateSession(
                "BSI",
                { kind: "XN", id: b.id, date: b.ngay },
                [b.benh_pham, b.vi_khuan].filter(Boolean).join(" · "),
                site.panel !== "BSI"
                  ? {
                      bsiLocalizedSite: {
                        majorType: site.panel as "UTI" | "PNEU" | "SSI" | "VAE",
                        criteriaMet: Boolean(site.draft.readyToChot),
                        siteOrganism:
                          split.xn.find((x) => x.id === site.index.id)?.vi_khuan ||
                          null,
                        siteIndexDate: site.index.date.slice(0, 10),
                        siteDoe: site.index.date.slice(0, 10),
                      },
                    }
                  : undefined,
              );
            }}
          />
        ) : null}

        {openSession && openSession.panel === "SSI" ? (
          <NkbvSyndromeSsiPanel
            columns={panelColumns}
            index={openSession.index}
            indexLabel={openSession.indexLabel}
            ngayVaoVien={ngayVaoVien}
            xn={split.xn}
            cdha={cdhaList}
            surgeryByDate={split.surgeryByDate}
            tieuChuanByDate={split.tieuChuanChuyenBietByDate}
            baLamSangByDate={split.trieuChungLamSangByDate}
            draft={openSession.draft}
            onDraftChange={(patch) => patchDraft(openSession.id, patch)}
            onPersistSsiTc={(date, key, label, on) =>
              void persistPanelLamSang(date, key, label, on)
            }
            allowedEdit={allowedEdit}
            scrollRef={panelSync.register(0)}
            onScrollSync={panelSync.onScroll(0)}
            colW={COL_W}
            labelW={LABEL_W}
            onClose={() => setOpenSessionId(null)}
            onOpenPrimaryBsi={(bloodId) => {
              const b = split.xn.find((x) => x.id === bloodId);
              if (!b) return;
              openOrCreateSession(
                "BSI",
                { kind: "XN", id: b.id, date: b.ngay },
                [b.benh_pham, b.vi_khuan].filter(Boolean).join(" · "),
                {
                  bsiLocalizedSite: {
                    majorType: "SSI",
                    criteriaMet: Boolean(openSession.draft.readyToChot),
                    siteOrganism: null,
                    siteIndexDate: openSession.index.date.slice(0, 10),
                    siteDoe: openSession.index.date.slice(0, 10),
                  },
                },
              );
            }}
          />
        ) : null}

        {openSession && isShellPanel(openSession.panel) ? (
          <NkbvSyndromeShellPanel
            panel={openSession.panel}
            columns={panelColumns}
            index={openSession.index}
            indexLabel={openSession.indexLabel}
            draft={openSession.draft}
            onDraftChange={(patch) => patchDraft(openSession.id, patch)}
            allowedEdit={allowedEdit}
            scrollRef={panelSync.register(0)}
            onScrollSync={panelSync.onScroll(0)}
            colW={COL_W}
            labelW={LABEL_W}
            onClose={() => setOpenSessionId(null)}
          />
        ) : null}

        {openSession && allowedEdit ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 px-1 pt-2">
            <button
              type="button"
              className="rounded-full bg-[var(--primary)] px-3 py-1.5 text-[11px] font-semibold text-white"
              title="Tạo phiếu sau khi đã xem kết luận trên bảng phân tích — không tạo lúc chọn Index"
              onClick={() =>
                onCreatePhieu?.({
                  milestoneId: openSession.index.id,
                  panel: openSession.panel,
                })
              }
            >
              Tạo phiếu phân tích trên bệnh án
            </button>
            {openSession.index.kind === "XN" ? (
              <button
                type="button"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                onClick={() => {
                  const bare =
                    bareViSinhIdFromMilestoneId(openSession.index.id) || openSession.index.id;
                  const reason = window.prompt("Lý do bỏ qua XN này (không tạo HAI)?");
                  if (!reason?.trim()) return;
                  onSkipViSinh?.({ viSinhId: bare.replace(/^lis:/, ""), reason: reason.trim() });
                }}
              >
                Bỏ qua XN (có lý do)
              </button>
            ) : null}
            <span className="text-[10px] text-slate-500">
              Tick «Sẵn sàng chốt» / kết luận trên bảng phân tích trước khi tạo phiếu.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EvidenceRow({
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
        className="sticky left-0 z-10 flex shrink-0 items-center border-b border-r border-slate-200 bg-slate-50 px-1.5 font-semibold text-slate-600"
        style={{ width: labelW, minWidth: labelW, maxWidth: labelW }}
      >
        <span className="truncate" title={label}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

type GridColumn = { date: string; hd: number | null; label: string };

type WindowedRowProps = {
  columns: GridColumn[];
  from: number;
  to: number;
  colW: number;
  labelW: number;
};

/** Spacer trái/phải khi windowing cột — giữ tổng bề rộng để scroll không giật. */
function WindowPad({ width }: { width: number }) {
  if (width <= 0) return null;
  return <div className="shrink-0 border-b border-r" style={{ width, minWidth: width }} />;
}

const GridHeadRows = React.memo(function GridHeadRows({
  columns,
  from,
  to,
  colW,
  labelW,
}: WindowedRowProps) {
  const visible = columns.slice(from, to);
  const leftPad = from * colW;
  const rightPad = (columns.length - to) * colW;
  return (
    <>
      <EvidenceRow label="Ngày lịch" labelW={labelW}>
        <WindowPad width={leftPad} />
        {visible.map((c) => (
          <div
            key={`d-${c.date}`}
            className="flex shrink-0 items-center justify-center border-b border-r bg-slate-50 font-semibold"
            style={{ width: colW, minWidth: colW, minHeight: 28 }}
          >
            {c.label}
          </div>
        ))}
        <WindowPad width={rightPad} />
      </EvidenceRow>
      <EvidenceRow label="Ngày (HD)" labelW={labelW}>
        <WindowPad width={leftPad} />
        {visible.map((c) => (
          <div
            key={`hd-${c.date}`}
            className="flex shrink-0 items-center justify-center border-b border-r"
            style={{ width: colW, minWidth: colW, minHeight: 24 }}
          >
            {c.hd == null ? "—" : c.hd}
          </div>
        ))}
        <WindowPad width={rightPad} />
      </EvidenceRow>
    </>
  );
});

const GridXnRow = React.memo(function GridXnRow({
  columns,
  from,
  to,
  colW,
  labelW,
  xnByDate,
  statusById,
  activeXnId,
  onPickXn,
}: WindowedRowProps & {
  xnByDate: Record<string, XnCell[]>;
  statusById: Record<string, ViSinhAnalysisStatus>;
  activeXnId: string | null;
  onPickXn: (x: XnCell) => void;
}) {
  const visible = columns.slice(from, to);
  return (
    <EvidenceRow label="XN vi sinh" labelW={labelW}>
      <WindowPad width={from * colW} />
      {visible.map((c) => {
        const items = xnByDate[c.date] || [];
        return (
          <div
            key={`xn-${c.date}`}
            className="flex shrink-0 flex-col gap-0.5 border-b border-r bg-white p-0.5"
            style={{ width: colW, minWidth: colW, minHeight: 56 }}
          >
            {items.map((x) => {
              const st = statusById[x.id] || "CHUA_PHAN_TICH";
              const badge =
                st === "CHUA_PHAN_TICH"
                  ? "bg-amber-100 text-amber-900"
                  : st === "BO_QUA"
                    ? "bg-slate-100 text-slate-600"
                    : "bg-emerald-100 text-emerald-800";
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => onPickXn(x)}
                  className={`rounded px-0.5 py-0.5 text-left leading-tight hover:bg-amber-50 ${
                    activeXnId === x.id ? "ring-2 ring-rose-500 font-semibold" : ""
                  }`}
                  title="Chọn từng bệnh phẩm để phân tích (không chọn cả ô ngày)"
                >
                  <span
                    className={`mb-0.5 inline-block rounded px-0.5 text-[8px] font-bold ${badge}`}
                  >
                    {statusBadgeLabel(st)}
                  </span>
                  <span className="block truncate font-semibold">{x.benh_pham}</span>
                  <span className="block truncate text-slate-700">{x.vi_khuan}</span>
                  {x.so_luong ? (
                    <span className="block truncate text-slate-500">SL {x.so_luong}</span>
                  ) : null}
                </button>
              );
            })}
            {!items.length ? <span className="text-[9px] text-slate-300">—</span> : null}
          </div>
        );
      })}
      <WindowPad width={(columns.length - to) * colW} />
    </EvidenceRow>
  );
});

const GridCdhaRow = React.memo(function GridCdhaRow({
  columns,
  from,
  to,
  colW,
  labelW,
  cdhaByDate,
  catalog,
  allowedEdit,
  onOpen,
  onRemove,
  onEditDate,
  onToggle,
}: WindowedRowProps & {
  cdhaByDate: Record<string, BaGridCdhaCell[]>;
  catalog: CdhaCatalogItem[];
  allowedEdit: boolean;
  onOpen: (x: BaGridCdhaCell) => void;
  onRemove: (id: string | undefined) => Promise<void>;
  onEditDate: (id: string, nextDate: string) => Promise<void>;
  onToggle: (date: string, criteriaKey: string, title: string, kind: string) => Promise<void>;
}) {
  const visible = columns.slice(from, to);
  return (
    <EvidenceRow label="Chẩn đoán HA" labelW={labelW}>
      <WindowPad width={from * colW} />
      {visible.map((c) => {
        const items = cdhaByDate[c.date] || [];
        return (
          <div
            key={`cdha-${c.date}`}
            className="relative flex shrink-0 flex-col gap-0.5 border-b border-r p-0.5"
            style={{ width: colW, minWidth: colW, minHeight: 48 }}
          >
            {items.map((x) => (
              <div key={x.id} className="flex flex-col gap-0.5 border-b border-emerald-50 pb-0.5">
                <div className="flex items-start gap-0.5">
                  <button
                    type="button"
                    onClick={() => onOpen(x)}
                    className="min-w-0 flex-1 truncate text-left font-medium text-emerald-900 hover:underline"
                  >
                    {x.mo_ta_benh_ly}
                  </button>
                  {allowedEdit && !x.id.startsWith("local-") ? (
                    <button
                      type="button"
                      className="shrink-0 text-[9px] text-rose-500"
                      title="Xóa"
                      onClick={() => void onRemove(x.id)}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                {allowedEdit && !x.id.startsWith("local-") ? (
                  <input
                    type="date"
                    className="w-full bg-emerald-50/50 text-[9px]"
                    value={x.ngay.slice(0, 10)}
                    title="Sửa ngày CĐHA"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && v !== x.ngay.slice(0, 10)) void onEditDate(x.id, v);
                    }}
                  />
                ) : null}
              </div>
            ))}
            {allowedEdit ? (
              <NkbvGridCriteriaAddPopover
                triggerLabel="+ CĐHA"
                triggerClassName="cursor-pointer text-[9px] font-semibold text-emerald-600"
                maxHeight={160}
              >
                {catalog.map((cat) => (
                  <li key={cat.criteriaKey}>
                    <label className="flex cursor-pointer gap-1 px-1 py-0.5 text-[10px] hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={items.some(
                          (x) => (x.tieu_chuan_key || "imaging_chest") === cat.criteriaKey,
                        )}
                        onChange={() =>
                          void onToggle(c.date, cat.criteriaKey, cat.title, cat.milestoneKind)
                        }
                      />
                      {cat.title}
                    </label>
                  </li>
                ))}
              </NkbvGridCriteriaAddPopover>
            ) : null}
          </div>
        );
      })}
      <WindowPad width={(columns.length - to) * colW} />
    </EvidenceRow>
  );
});

const GridSsiTcRow = React.memo(function GridSsiTcRow({
  columns,
  from,
  to,
  colW,
  labelW,
  tcByDate,
  surgeryByDate,
  catalog,
  allowedEdit,
  onOpen,
  onRemove,
  onAddSurgery,
  onToggle,
}: WindowedRowProps & {
  tcByDate: Record<string, TcItem[]>;
  surgeryByDate: Record<string, TcItem[]>;
  catalog: Array<{ criteriaKey: string; title: string }>;
  allowedEdit: boolean;
  onOpen: (id: string, date: string, label: string) => void;
  onRemove: (id: string | undefined) => Promise<void>;
  onAddSurgery: (date: string) => Promise<void>;
  onToggle: (date: string, criteriaKey: string, title: string) => Promise<void>;
}) {
  const visible = columns.slice(from, to);
  return (
    <EvidenceRow label="TC DOE SSI" labelW={labelW}>
      <WindowPad width={from * colW} />
      {visible.map((c) => {
        const items = tcByDate[c.date] || [];
        const surgery = surgeryByDate[c.date] || [];
        return (
          <div
            key={`ssi-tc-${c.date}`}
            className="relative flex shrink-0 flex-col gap-0.5 border-b border-r p-0.5"
            style={{ width: colW, minWidth: colW, minHeight: 48 }}
          >
            {surgery.map((s) => (
              <div key={s.id || s.key} className="flex items-start gap-0.5">
                <button
                  type="button"
                  onClick={() => onOpen(s.id || `surg-${c.date}`, c.date, s.label)}
                  className="min-w-0 flex-1 truncate text-left text-[9px] font-semibold text-violet-800 hover:underline"
                >
                  {s.label}
                </button>
                {allowedEdit && s.id ? (
                  <button
                    type="button"
                    className="shrink-0 text-[9px] text-rose-500"
                    onClick={() => void onRemove(s.id)}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
            {items.map((it) => (
              <div key={it.id || it.key} className="flex items-start gap-0.5">
                <button
                  type="button"
                  onClick={() => onOpen(it.id || `tc-${c.date}-${it.key}`, c.date, it.label)}
                  className="min-w-0 flex-1 line-clamp-2 text-left text-[9px] font-semibold text-violet-950 hover:underline"
                >
                  {it.label}
                </button>
                {allowedEdit && it.id ? (
                  <button
                    type="button"
                    className="shrink-0 text-[9px] text-rose-500"
                    onClick={() => void onRemove(it.id)}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
            {allowedEdit ? (
              <NkbvGridCriteriaAddPopover
                triggerLabel="+ TC / mổ"
                triggerClassName="cursor-pointer text-[9px] font-semibold text-violet-600"
                maxHeight={176}
              >
                <li>
                  <button
                    type="button"
                    className="w-full px-1 py-0.5 text-left text-[10px] font-semibold text-violet-800 hover:bg-slate-50"
                    onClick={() => void onAddSurgery(c.date)}
                  >
                    + Ngày mổ (Day 1 SP)
                  </button>
                </li>
                {catalog.map((cat) => (
                  <li key={cat.criteriaKey}>
                    <label className="flex cursor-pointer gap-1 px-1 py-0.5 text-[10px] hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={items.some((x) => x.key === cat.criteriaKey)}
                        onChange={() => void onToggle(c.date, cat.criteriaKey, cat.title)}
                      />
                      {cat.title}
                    </label>
                  </li>
                ))}
              </NkbvGridCriteriaAddPopover>
            ) : null}
          </div>
        );
      })}
      <WindowPad width={(columns.length - to) * colW} />
    </EvidenceRow>
  );
});

const GridKhoaRow = React.memo(function GridKhoaRow({
  columns,
  from,
  to,
  colW,
  labelW,
  allowedEdit,
  defaultKhoa,
}: WindowedRowProps & {
  allowedEdit: boolean;
  defaultKhoa: string;
}) {
  // State cục bộ trong hàng memo — gõ Khoa chỉ re-render hàng này, không cả lưới
  const [khoaMap, setKhoaMap] = useState<Record<string, string>>({});
  const visible = columns.slice(from, to);
  return (
    <EvidenceRow label="Khoa điều trị" labelW={labelW}>
      <WindowPad width={from * colW} />
      {visible.map((c) => (
        <div
          key={`khoa-${c.date}`}
          className="flex shrink-0 items-center justify-center border-b border-r px-0.5"
          style={{ width: colW, minWidth: colW, minHeight: 32 }}
        >
          <input
            className="w-full bg-transparent text-center text-[10px] outline-none"
            value={khoaMap[c.date] ?? defaultKhoa}
            disabled={!allowedEdit}
            onChange={(e) => setKhoaMap((p) => ({ ...p, [c.date]: e.target.value }))}
            placeholder="—"
          />
        </div>
      ))}
      <WindowPad width={(columns.length - to) * colW} />
    </EvidenceRow>
  );
});
