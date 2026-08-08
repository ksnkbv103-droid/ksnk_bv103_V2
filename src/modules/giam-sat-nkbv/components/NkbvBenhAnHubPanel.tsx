"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Pencil, Plus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { formatDateVi } from "@/lib/format-datetime-vi";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import {
  getNkbvBenhAnHub,
  skipNkbvViSinhAnalysis,
  upsertNkbvBaTimelineMilestone,
  type NkbvBenhAnHubCase,
} from "../actions/giam-sat-nkbv.actions";
import type { ViSinhAnalysisDispositionRow } from "../lib/nkbv-vi-sinh-analysis-status";
import type { SyndromePanelId } from "../lib/nkbv-specimen-syndrome";
import NkbvDeviceRegistryPanel from "./NkbvDeviceRegistryPanel";
import NkbvBaCaseSheet from "./NkbvBaCaseSheet";
import NkbvBaMultiTimelineWorkspace from "./NkbvBaMultiTimelineWorkspace";
import type { ImportWindowAlert } from "../lib/nkbv-import-window-scan";
import { GSC_BK_ISOLATION, GSC_BK_MDRO, buildGscMdroDeepLink } from "../lib/nkbv-mdro";
import {
  buildCriteriaGatePreview,
  buildPostEventAdminPreview,
  type BaTimelineMilestone,
  type CriteriaGatePreview,
  type PostEventAdminPreview,
} from "../lib/nkbv-ba-timeline-core";
import { NKBV_CHECKLIST_TYPE_LABELS, type NkbvChecklistTypeCode } from "../lib/nkbv-loai-labels";
import { resolveNkbvMajorType } from "../lib/nkbv-major-type";
import { NKBV_CRITERIA_ADD_CATALOG } from "../lib/nkbv-criteria-matrix";
import { isBaIndexMilestone } from "../lib/nkbv-symptom-timeline-bridge";
import { buildNkbvBaAnalysisDraftRow } from "../lib/nkbv-ba-analysis-draft";
import { nkbvKhoaDisplayName } from "../lib/nkbv-khoa-options";

type KhoaOpt = { id: string; ma_danh_muc?: string; ten_danh_muc?: string };

export type NkbvEnsureAnalysisCaseResult = {
  success: boolean;
  caseRow?: Record<string, unknown>;
  error?: string;
};

type Props = {
  maBenhAn: string;
  khoas: KhoaOpt[];
  allowedEdit: boolean;
  allowedCreate: boolean;
  onClose: () => void;
  onEditStay: (stay: Record<string, unknown>) => void;
  onOpenCase: (caseId: string) => void;
  onCreateCase: (stay: Record<string, unknown>) => void;
  /** Sau lưu/chốt phiếu trên tờ BA — refresh danh sách ngoài Hub. */
  onCaseMutated?: () => void;
  /**
   * Neo phiếu phân tích cho mốc timeline — trả về row đầy đủ để nhúng form phải
   * (không mở modal danh sách phiếu).
   */
  onEnsureAnalysisCase: (input: {
    stay: Record<string, unknown>;
    milestone: BaTimelineMilestone;
    gate: NkbvChecklistTypeCode;
    existingCaseId?: string | null;
  }) => Promise<NkbvEnsureAnalysisCaseResult>;
};

export default function NkbvBenhAnHubPanel({
  maBenhAn,
  khoas,
  allowedEdit,
  allowedCreate,
  onClose,
  onEditStay,
  onOpenCase,
  onCreateCase,
  onCaseMutated,
  onEnsureAnalysisCase,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [stay, setStay] = useState<Record<string, unknown> | null>(null);
  const [cases, setCases] = useState<NkbvBenhAnHubCase[]>([]);
  const [timeline, setTimeline] = useState<BaTimelineMilestone[]>([]);
  const [devices, setDevices] = useState<
    Array<{ id: string; device_type: string; insertion_date: string; removal_date: string | null }>
  >([]);
  const [alerts, setAlerts] = useState<ImportWindowAlert[]>([]);
  const [mdroCount, setMdroCount] = useState(0);
  const [hasActiveVent, setHasActiveVent] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [criteriaPick, setCriteriaPick] = useState(NKBV_CRITERIA_ADD_CATALOG[0].criteriaKey);
  const [manualDate, setManualDate] = useState("");
  const [analysisRow, setAnalysisRow] = useState<Record<string, unknown> | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  /** Index đang mở form (XN / XQ) — không đổi khi chỉ gắn triệu chứng. */
  const [indexMilestoneId, setIndexMilestoneId] = useState<string | null>(null);
  /** Cache phiếu đã tạo theo mốc — tránh tạo trùng khi khớp linkedCase thất bại. */
  const [caseIdByMilestone, setCaseIdByMilestone] = useState<Record<string, string>>({});
  /** Chỉ hiện CaseSheet sau nút «Tạo phiếu» — không auto-ensure lúc chọn Index */
  const [phieuSheetOpen, setPhieuSheetOpen] = useState(false);
  const [analysisDispositions, setAnalysisDispositions] = useState<ViSinhAnalysisDispositionRow[]>(
    [],
  );
  const [chuaPhanTichCount, setChuaPhanTichCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ensureSeqRef = React.useRef(0);
  const ensureCaseRef = React.useRef(onEnsureAnalysisCase);
  ensureCaseRef.current = onEnsureAnalysisCase;
  const attachSymptomRef = React.useRef<
    ((input: { key: string; date: string; label?: string }) => boolean) | null
  >(null);

  const sortTimeline = (rows: BaTimelineMilestone[]) =>
    [...rows].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : a.id.localeCompare(b.id),
    );

  const reload = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    const res = await getNkbvBenhAnHub(maBenhAn);
    if (!opts?.silent) setLoading(false);
    if (!res.success || !res.data) {
      toast.error(res.error || "Không tải được hub bệnh án");
      return;
    }
    setStay(res.data.stay as Record<string, unknown>);
    setCases(res.data.cases);
    // Luôn xếp sớm → muộn theo ngày (rồi id) để timeline ổn định khi thêm yếu tố
    const tlSorted = sortTimeline(res.data.timeline || []);
    setTimeline(tlSorted);
    setDevices(res.data.devices || []);
    setAlerts(res.data.windowAlerts);
    setMdroCount(res.data.mdroCount);
    setHasActiveVent(Boolean(res.data.hasActiveVent));
    setChuaPhanTichCount(Number(res.data.chuaPhanTichCount || 0));
    setAnalysisDispositions(
      (res.data.analysisDispositions || []) as ViSinhAnalysisDispositionRow[],
    );
    setSelectedId((prev) => {
      if (prev && tlSorted.some((m) => m.id === prev)) return prev;
      const firstIndex = tlSorted.find((m) => isBaIndexMilestone(m));
      return firstIndex?.id || tlSorted[0]?.id || null;
    });
    setIndexMilestoneId((prev) => {
      if (prev && tlSorted.some((m) => m.id === prev && isBaIndexMilestone(m))) return prev;
      return tlSorted.find((m) => isBaIndexMilestone(m))?.id || null;
    });
  }, [maBenhAn]);

  /** Patch nhẹ sau tick CĐHA/TC — không gọi lại cả hub (tránh lag). */
  const upsertTimelineLocal = useCallback((row: {
    id: string;
    milestone_kind: string;
    milestone_date: string;
    title: string;
    detail?: string | null;
    specimen_hint?: string | null;
    criteria_key?: string | null;
  }) => {
    const date = String(row.milestone_date).slice(0, 10);
    const criteriaKey = row.criteria_key ? String(row.criteria_key) : null;
    const id = String(row.id).startsWith("manual:")
      ? String(row.id)
      : `manual:${row.id}`;
    const majorType = resolveNkbvMajorType({
      milestone_kind: row.milestone_kind,
      loai_benh_pham: row.specimen_hint || criteriaKey,
    });
    let gate: NkbvChecklistTypeCode | null = null;
    if (criteriaKey === "imaging_chest") gate = "HAP";
    if (
      criteriaKey === "procedure_surgery" ||
      criteriaKey === "purulent_drainage" ||
      criteriaKey === "wound_opened" ||
      criteriaKey === "abscess_imaging"
    ) {
      gate = "SSI";
    }
    const next: BaTimelineMilestone = {
      id,
      source: "MANUAL",
      date,
      kind: String(row.milestone_kind),
      title: String(row.title),
      detail: row.detail ? String(row.detail) : null,
      loai_benh_pham: row.specimen_hint ? String(row.specimen_hint) : null,
      criteriaKey: criteriaKey as BaTimelineMilestone["criteriaKey"],
      majorType:
        majorType === "OTHER" && criteriaKey === "imaging_chest" ? "PNEU" : majorType,
      gate,
    };
    setTimeline((prev) =>
      sortTimeline([
        ...prev.filter((m) => {
          if (m.id === next.id) return false;
          if (
            next.criteriaKey &&
            m.source === "MANUAL" &&
            m.criteriaKey === next.criteriaKey &&
            m.date.slice(0, 10) === date
          ) {
            return false;
          }
          return true;
        }),
        next,
      ]),
    );
  }, []);

  const removeTimelineLocal = useCallback((milestoneId: string) => {
    const id = String(milestoneId || "").trim();
    if (!id) return;
    setTimeline((prev) => {
      const target = prev.find((m) => m.id === id);
      if (!target?.criteriaKey) return prev.filter((m) => m.id !== id);
      const date = target.date.slice(0, 10);
      const key = target.criteriaKey;
      // Xóa hết bản cùng khóa nghiệp vụ (chống chip XQ/TC hiện lại từ bản trùng)
      return prev.filter(
        (m) =>
          !(
            m.source === "MANUAL" &&
            m.criteriaKey === key &&
            m.date.slice(0, 10) === date
          ),
      );
    });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const indexMilestone = useMemo(
    () => timeline.find((m) => m.id === indexMilestoneId) || null,
    [timeline, indexMilestoneId],
  );

  const siteEventsForSbap = useMemo(
    () =>
      cases
        .filter((c) => c.doe || c.ngay_phat_hien)
        .filter((c) => resolveNkbvMajorType({ loai_ma: c.loai_ma }) !== "BSI")
        .map((c) => ({
          id: c.id,
          doe: String(c.doe || c.ngay_phat_hien),
          indexDate: c.ngay_phat_hien ? String(c.ngay_phat_hien).slice(0, 10) : undefined,
          majorType: resolveNkbvMajorType({ loai_ma: c.loai_ma }),
          organism: c.tac_nhan_vi_khuan,
        })),
    [cases],
  );

  /** Gate/form neo theo Index (XN/XQ), không theo mốc triệu chứng đang highlight. */
  const gatePreview: CriteriaGatePreview | null = useMemo(() => {
    const anchor = indexMilestone;
    if (!anchor) return null;
    if (anchor.source === "DEVICE" && !anchor.criteriaKey && !anchor.gate) return null;
    if (!isBaIndexMilestone(anchor)) return null;
    return buildCriteriaGatePreview({
      milestone: anchor,
      allMilestones: timeline,
      admissionDate: stay?.ngay_vao_vien ? String(stay.ngay_vao_vien) : null,
      hasActiveVent,
      siteEventsForSbap,
    });
  }, [indexMilestone, timeline, stay, hasActiveVent, siteEventsForSbap]);

  const linkedCase = useMemo(() => {
    if (!indexMilestone || !gatePreview) return null;
    const vsId = indexMilestone.id.startsWith("lis:")
      ? indexMilestone.id.slice(4)
      : null;
    if (vsId) {
      const byVs = cases.find((c) => c.index_vi_sinh_id === vsId);
      if (byVs) return byVs;
    }
    const idx = indexMilestone.date;
    return (
      cases.find((c) => {
        const doe = c.doe || c.ngay_phat_hien;
        if (!doe) return false;
        return (
          resolveNkbvMajorType({ loai_ma: c.loai_ma }) === gatePreview.majorType &&
          Math.abs(
            (new Date(doe).getTime() - new Date(idx).getTime()) / (1000 * 60 * 60 * 24),
          ) <= 3
        );
      }) || null
    );
  }, [indexMilestone, gatePreview, cases]);

  const postEvent: PostEventAdminPreview | null = useMemo(() => {
    if (!linkedCase) return null;
    return buildPostEventAdminPreview({
      caseRow: {
        id: linkedCase.id,
        loai_ma: linkedCase.loai_ma,
        doe: linkedCase.doe,
        ngay_phat_hien: linkedCase.ngay_phat_hien,
        tac_nhan: linkedCase.tac_nhan_vi_khuan,
      },
      admissionDate: stay?.ngay_vao_vien ? String(stay.ngay_vao_vien) : null,
      bloodMilestones: timeline.filter((m) => m.majorType === "BSI" && m.source === "LIS"),
      devices,
    });
  }, [linkedCase, stay, timeline, devices]);

  const khoaName = nkbvKhoaDisplayName(
    stay?.khoa_dieu_tri_id ? String(stay.khoa_dieu_tri_id) : null,
    khoas,
  ) || "—";

  const linkMdro = stay
    ? buildGscMdroDeepLink({
        bangKiemMa: GSC_BK_MDRO,
        khoaId: stay.khoa_dieu_tri_id ? String(stay.khoa_dieu_tri_id) : null,
        maBenhAn: String(stay.ma_benh_an || ""),
        maBenhNhan: String(stay.ma_benh_nhan || ""),
        tenBenhNhan: String(stay.ho_ten_benh_nhan || ""),
      })
    : "#";
  const linkIsolation = stay
    ? buildGscMdroDeepLink({
        bangKiemMa: GSC_BK_ISOLATION,
        khoaId: stay.khoa_dieu_tri_id ? String(stay.khoa_dieu_tri_id) : null,
        maBenhAn: String(stay.ma_benh_an || ""),
        maBenhNhan: String(stay.ma_benh_nhan || ""),
        tenBenhNhan: String(stay.ho_ten_benh_nhan || ""),
      })
    : "#";

  const pickedCatalog = NKBV_CRITERIA_ADD_CATALOG.find((c) => c.criteriaKey === criteriaPick);

  const saveManual = async () => {
    if (!manualDate || !pickedCatalog) {
      toast.error("Chọn yếu tố tiêu chuẩn CDC và ngày");
      return;
    }
    const res = await upsertNkbvBaTimelineMilestone({
      ma_benh_an: maBenhAn,
      milestone_kind: pickedCatalog.milestoneKind,
      milestone_date: manualDate,
      title: pickedCatalog.title,
      criteria_key: pickedCatalog.criteriaKey,
    });
    if (!res.success) {
      toast.error(res.error || "Không lưu mốc");
      return;
    }
    toast.success("Đã thêm yếu tố tiêu chuẩn vào timeline");
    setAddOpen(false);
    void reload();
  };

  /** Chỉ chuẩn bị draft UI khi đổi Index — không tạo phiếu DB (tạo phiếu muộn). */
  useEffect(() => {
    if (!stay || !indexMilestone || !gatePreview) {
      if (!indexMilestone) {
        setAnalysisRow(null);
        setAnalysisLoading(false);
        setAnalysisError(null);
        setPhieuSheetOpen(false);
      }
      return;
    }
    const milestoneId = indexMilestone.id;
    const cachedId = caseIdByMilestone[milestoneId] || linkedCase?.id || null;
    if (cachedId) {
      setPhieuSheetOpen(true);
      setAnalysisLoading(true);
      void ensureCaseRef
        .current({
          stay,
          milestone: indexMilestone,
          gate: gatePreview.gate,
          existingCaseId: cachedId,
        })
        .then((res) => {
          setAnalysisLoading(false);
          if (res.success && res.caseRow) setAnalysisRow(res.caseRow);
        });
      return;
    }
    setPhieuSheetOpen(false);
    setAnalysisRow(
      buildNkbvBaAnalysisDraftRow({
        stay,
        milestone: indexMilestone,
        gate: gatePreview.gate,
      }),
    );
    setAnalysisLoading(false);
    setAnalysisError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stay, indexMilestone?.id, gatePreview?.gate, linkedCase?.id]);

  const createPhieuFromSession = async (input: {
    milestoneId: string;
    panel: SyndromePanelId;
  }) => {
    if (!stay) return;
    const milestone =
      timeline.find((m) => m.id === input.milestoneId) ||
      timeline.find((m) => m.id === indexMilestoneId);
    if (!milestone) {
      toast.error("Không tìm thấy mốc Index");
      return;
    }
    const gateMap: Record<SyndromePanelId, NkbvChecklistTypeCode> = {
      BSI: "BSI",
      UTI: "UTI",
      PNEU: "VAP",
      VAE: "VAE",
      SSI: "SSI",
    };
    const gate = gateMap[input.panel] || gatePreview?.gate || "BSI";
    setIndexMilestoneId(milestone.id);
    setAnalysisLoading(true);
    setAnalysisError(null);
    const res = await ensureCaseRef.current({
      stay,
      milestone,
      gate,
      existingCaseId: caseIdByMilestone[milestone.id] || linkedCase?.id || null,
    });
    setAnalysisLoading(false);
    if (!res.success || !res.caseRow) {
      setAnalysisError(res.error || "Không tạo được phiếu");
      toast.error(res.error || "Không tạo được phiếu");
      return;
    }
    const cid = String(res.caseRow.id || "");
    if (cid) setCaseIdByMilestone((prev) => ({ ...prev, [milestone.id]: cid }));
    setAnalysisRow(res.caseRow);
    setPhieuSheetOpen(true);
    toast.success("Đã tạo phiếu phân tích — điền form bên dưới");
    void reload();
    onCaseMutated?.();
  };

  const skipViSinh = async (input: { viSinhId: string; reason: string }) => {
    const res = await skipNkbvViSinhAnalysis({
      vi_sinh_id: input.viSinhId,
      reason: input.reason,
    });
    if (!res.success) {
      toast.error(res.error || "Không bỏ qua được");
      return;
    }
    toast.success("Đã bỏ qua XN — ra khỏi hàng đợi Chưa PT");
    void reload();
  };

  const persistDraftForSheet = async (): Promise<Record<string, unknown> | null> => {
    if (!stay || !indexMilestone || !gatePreview) return null;
    const res = await ensureCaseRef.current({
      stay,
      milestone: indexMilestone,
      gate: gatePreview.gate,
      existingCaseId: linkedCase?.id || caseIdByMilestone[indexMilestone.id] || null,
    });
    if (!res.success || !res.caseRow) {
      setAnalysisError(res.error || "Không neo được phiếu");
      return null;
    }
    const cid = String(res.caseRow.id || "");
    if (cid) {
      setCaseIdByMilestone((prev) => ({ ...prev, [indexMilestone.id]: cid }));
    }
    setAnalysisRow(res.caseRow);
    setAnalysisError(null);
    return res.caseRow;
  };

  const defaultKhoaMa = (() => {
    const id = String(stay?.khoa_dieu_tri_id || "");
    const k = khoas.find((x) => x.id === id);
    return k?.ma_danh_muc || k?.ten_danh_muc || null;
  })();

  const onGridIndexChange = (input: { milestoneId: string }) => {
    setSelectedId(input.milestoneId);
    setIndexMilestoneId(input.milestoneId);
  };

  if (!mounted) return null;

  // Portal ra body: thoát stacking context của <main z-0> — không bị Sidebar z-10000 che
  return createPortal(
    <div className="fixed inset-0 z-[10040] flex items-stretch justify-end bg-slate-900/50 print:hidden">
      <div
        className="relative flex h-full w-full max-w-[min(100vw,96rem)] flex-col overflow-hidden bg-white shadow-2xl sm:rounded-l-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Bệnh án lưới CDC"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Bệnh án · 3 khối (bảng chung → phân tích → tạo phiếu)
              {chuaPhanTichCount > 0 ? (
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 font-bold normal-case text-amber-900">
                  {chuaPhanTichCount} XN chưa phân tích
                </span>
              ) : null}
            </p>
            <h2 className="mt-0.5 truncate text-lg font-semibold text-slate-900">
              {String(stay?.ho_ten_benh_nhan || "…")}{" "}
              <span className="font-mono text-sm text-[var(--primary)]">{maBenhAn}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              PID {String(stay?.ma_benh_nhan || "—")} · {khoaName} ·{" "}
              {stay?.ngay_vao_vien ? formatDateVi(String(stay.ngay_vao_vien)) : "—"} →{" "}
              {stay?.ngay_ra_vien ? (
                formatDateVi(String(stay.ngay_ra_vien))
              ) : (
                <span className="font-semibold text-emerald-600">Đang nằm viện</span>
              )}
              {mdroCount ? (
                <>
                  {" "}
                  ·{" "}
                  <Link href={linkMdro} className="font-semibold text-rose-700 underline">
                    MDRO {mdroCount}
                  </Link>
                  {" / "}
                  <Link href={linkIsolation} className="font-semibold text-violet-700 underline">
                    Cách ly
                  </Link>
                </>
              ) : null}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Chọn từng bệnh phẩm → bảng phân tích → kết luận → nút Tạo phiếu. Không tạo phiếu lúc chọn
              Index.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-50"
              aria-label="Tải lại"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {allowedEdit && stay ? (
              <button
                type="button"
                onClick={() => onEditStay(stay)}
                className={`${C.ctaSecondary} inline-flex min-h-10 items-center gap-1.5 px-3 text-xs`}
              >
                <Pencil className="h-3.5 w-3.5" /> ADT
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-50"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {alerts.length > 0 ? (
          <div className="border-b border-amber-100 bg-amber-50/80 px-4 py-2 text-[11px] text-amber-950 sm:px-5">
            {alerts.slice(0, 3).map((a, i) => (
              <span key={`${a.code}-${i}`} className="mr-3">
                <strong>{a.code}</strong> {a.message}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {loading && !timeline.length ? (
            <p className="px-4 py-6 text-sm text-slate-500">Đang tải lưới bệnh án…</p>
          ) : !stay?.ngay_vao_vien ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              Thiếu ngày vào viện — bổ sung ADT trước khi phân tích trên lưới.
            </p>
          ) : (
            <NkbvBaMultiTimelineWorkspace
              maBenhAn={maBenhAn}
              ngayVaoVien={String(stay.ngay_vao_vien)}
              ngayRaVien={stay.ngay_ra_vien ? String(stay.ngay_ra_vien) : null}
              ngaySinh={stay.ngay_sinh ? String(stay.ngay_sinh).slice(0, 10) : null}
              defaultKhoa={defaultKhoaMa}
              khoaTen={khoaName}
              khoas={khoas.map((k) => ({
                id: k.id,
                ma: k.ma_danh_muc || "",
                ten: k.ten_danh_muc || k.ma_danh_muc || k.id,
              }))}
              timeline={timeline}
              devices={devices}
              analysisDispositions={analysisDispositions}
              allowedEdit={allowedEdit || allowedCreate}
              onIndexChange={onGridIndexChange}
              onCreatePhieu={(input) => void createPhieuFromSession(input)}
              onSkipViSinh={(input) => void skipViSinh(input)}
              onReload={() => void reload({ silent: true })}
              onTimelineUpsertLocal={upsertTimelineLocal}
              onTimelineRemoveLocal={removeTimelineLocal}
            />
          )}

          <details
            className="relative z-0 max-h-[28vh] shrink-0 overflow-hidden border-t border-slate-200 bg-slate-50/90 open:max-h-[36vh]"
            open={phieuSheetOpen}
          >
            <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-slate-600">
              Kho phiếu / form sau khi tạo phiếu
              {gatePreview
                ? ` · ${NKBV_CHECKLIST_TYPE_LABELS[gatePreview.gate]} · Index ${formatDateVi(gatePreview.indexDate)}`
                : ""}
              {cases.length ? ` · ${cases.length} sự kiện` : ""}
              {chuaPhanTichCount ? ` · ${chuaPhanTichCount} XN chưa PT` : ""}
            </summary>
            <div className="max-h-[40vh] space-y-3 overflow-y-auto border-t border-slate-50 px-4 py-3">
              {allowedCreate ? (
                <div className="flex flex-wrap items-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAddOpen((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700"
                  >
                    <Plus className="h-3 w-3" /> Thêm CĐHA / yếu tố
                  </button>
                  {addOpen ? (
                    <>
                      <select
                        value={criteriaPick}
                        onChange={(e) => setCriteriaPick(e.target.value as typeof criteriaPick)}
                        className="rounded-lg border-0 bg-slate-50 px-2 py-1.5"
                      >
                        {NKBV_CRITERIA_ADD_CATALOG.map((k) => (
                          <option key={k.criteriaKey} value={k.criteriaKey}>
                            {k.title}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="rounded-lg border-0 bg-slate-50 px-2 py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() => void saveManual()}
                        className={`${C.ctaPrimary} text-xs`}
                      >
                        Lưu
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}

              {analysisError ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900">{analysisError}</p>
              ) : null}
              {postEvent ? (
                <p className="text-[11px] text-slate-600">
                  Sau sự kiện: DOE {formatDateVi(postEvent.doe)} · <strong>{postEvent.poaHai}</strong>{" "}
                  · RIT → {formatDateVi(postEvent.ritEnd)}
                </p>
              ) : null}

              {analysisLoading ? (
                <p className="text-xs text-slate-500">Đang tạo / tải phiếu…</p>
              ) : phieuSheetOpen && indexMilestone && gatePreview && analysisRow ? (
                <NkbvBaCaseSheet
                  key={`sheet-${indexMilestone.id}-${String(analysisRow.id || "")}`}
                  row={analysisRow}
                  allowedEdit={allowedEdit || allowedCreate}
                  khoas={khoas.map((k) => ({
                    id: k.id,
                    ten_danh_muc: k.ten_danh_muc || k.ma_danh_muc || k.id,
                  }))}
                  milestoneLabel={`${formatDateVi(indexMilestone.date)} · ${indexMilestone.title}`}
                  timelineMilestones={timeline}
                  attachSymptomRef={attachSymptomRef}
                  persistDraft={persistDraftForSheet}
                  onTimelineSynced={() => void reload()}
                  onSuccess={() => {
                    void reload();
                    onCaseMutated?.();
                  }}
                />
              ) : (
                <p className="text-xs text-slate-500">
                  Phân tích trên bảng hội chứng trước. Khi xong kết luận, bấm «Tạo phiếu phân tích trên
                  bệnh án» — form mẫu mới hiện tại đây.
                </p>
              )}

              <details className="text-xs">
                <summary className="cursor-pointer font-semibold text-slate-600">
                  Device registry · phiếu đã chốt
                </summary>
                <div className="mt-2 space-y-2">
                  <NkbvDeviceRegistryPanel
                    maBenhAn={maBenhAn}
                    maBenhNhan={stay ? String(stay.ma_benh_nhan || "") : null}
                    khoaId={stay?.khoa_dieu_tri_id ? String(stay.khoa_dieu_tri_id) : null}
                    allowedEdit={allowedEdit}
                    onChanged={() => void reload({ silent: true })}
                  />
                  <ul className="divide-y divide-slate-100">
                    {cases.map((c) => (
                      <li key={c.id} className="flex justify-between gap-2 py-1.5">
                        <span>
                          {c.loai_ten || c.loai_ma} · DOE {c.doe ? formatDateVi(c.doe) : "—"}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenCase(c.id)}
                          className="font-semibold text-[var(--primary)]"
                        >
                          Mở
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </div>
          </details>
        </div>
      </div>
    </div>,
    document.body,
  );
}
