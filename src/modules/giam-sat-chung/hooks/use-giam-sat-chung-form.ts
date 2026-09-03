"use client";

import { useState, useEffect, useMemo, useCallback, useRef, type SetStateAction } from "react";
import {
  gscCanSaveResults,
  isGscNhatKyCach,
  previewGscFormProgress,
  type GscFormProgress,
} from "../lib/gsc-score-display";
import { useGscModuleLock } from "./use-gsc-module-lock";
import type { GiamSatSession } from "@/components/shared/giam-sat-header.types";
import type { ChecklistResult, ChecklistTemplate } from "@/types/giam-sat-chung";
import { saveGiamSatChung } from "../actions/giam-sat-chung.actions";
import type { GscSessionInput } from "../actions/giam-sat-chung-write-helpers";
import { loadGscTemplateOptions, switchGscTemplateByBangKiemId, type GscTemplateOption } from "../lib/gsc-form-template-sync";

import { toast } from "sonner";
import { useGiamSatHeader } from "@/hooks/useGiamSatHeader";
import { GSC_BK_ISOLATION, GSC_BK_MDRO } from "@/modules/giam-sat-nkbv/lib/nkbv-mdro";
import { EMPTY_GSC_BO_SUNG_NB, parseGscBoSungNbFromUnknown } from "../lib/gsc-bo-sung-nguoi-benh";

function isMdroPatientBangKiem(ma: string): boolean {
  const t = String(ma || "")
    .trim()
    .toUpperCase();
  return t === GSC_BK_MDRO || t === GSC_BK_ISOLATION;
}
import { mergeGscSessionWithDbPrintLabels, snapshotGscSessionForPrint } from "../lib/gsc-session-labels";
import { useGscDbPrintLabels } from "./use-gsc-db-print-labels";
import { formatUnknownError } from "@/lib/supabase-error-message";
import { isReplayCameraSupervisionCachThuc } from "@/lib/supervision-session-time";
import {
  enqueueOfflineGscSave,
  isLikelyOfflineOrNetworkFailure,
} from "@/lib/offline-pending-supervision-save";
import { usePermission } from "@/hooks/usePermission";
import {
  buildContinueAdminSession,
  buildFreshAdminSession,
  clearStickyAdminContext,
  mergeStickyIntoSession,
  pickAdminContext,
  readStickyAdminContext,
  writeStickyAdminContext,
} from "@/lib/supervision-admin-context";

function hasSessionDiff(
  prev: Record<string, unknown>,
  nextPatch: Record<string, unknown>,
): boolean {
  for (const [key, nextValue] of Object.entries(nextPatch)) {
    if (prev[key] !== nextValue) return true;
  }
  return false;
}

function emptyResultsForTemplate(template: ChecklistTemplate): ChecklistResult[] {
  return template.criteria.map((c) => ({ criterionId: c.id, value: "NA" as const }));
}

function matchMasterByMa<T extends { id: string; ma_danh_muc?: string | null }>(
  rows: T[],
  ma: string,
): T | undefined {
  const target = ma.trim().toUpperCase();
  if (!target) return undefined;
  return rows.find((r) => String(r.ma_danh_muc || "").trim().toUpperCase() === target);
}

export function useGiamSatChungForm(
  initialTemplate: ChecklistTemplate,
  onSuccess: () => void,
  opts?: {
    editPayload?: {
      session: Partial<GiamSatSession>;
      results: ChecklistResult[];
    } | null;
    editingSessionId?: string | null;
    locPrefill?: { kind: "khoa" | "khu"; ma: string } | null;
  },
) {
  const { isMangLuoi, isAdmin, userData } = usePermission();
  const [template, setTemplate] = useState(initialTemplate);
  const [dbTemplates, setDbTemplates] = useState<GscTemplateOption[]>([]);
  const {
    khoas,
    khuVucs,
    loading: headerLoading,
    selectedKhoa,
    setSelectedKhoa,
    selectedKhuVuc,
    setSelectedKhuVuc,
    ngayGiamSat,
    setNgayGiamSat,
    ngheNghieps,
    hinhThucGiamSats,
    cachThucGiamSats,
    nhanSus,
    historyLocations,
    historyLocationRows,
    currentHoSoId,
    lockKhoa,
    resetHeader,
  } = useGiamSatHeader("gsc", true);

  const editSession = opts?.editPayload?.session;
  const editResults = opts?.editPayload?.results;
  const editingSessionId = opts?.editingSessionId ?? null;
  const locPrefill = opts?.locPrefill ?? null;
  const stickyAppliedRef = useRef(false);
  const locAppliedRef = useRef(false);

  const [session, setSession] = useState({
    vi_tri: "",
    hinh_thuc_giam_sat: "Giám sát chuyên trách",
    cach_thuc_giam_sat: "Giám sát trực tiếp tại chỗ",
    nguoi_giam_sat_id: "",
    is_giam_sat_ca_nhan: false,
    nghe_nghiep_id: "",
    nhan_vien_id: "",
    is_manual_nhan_vien: false,
    ten_manual_nhan_vien: "",
    is_bo_sung_nguoi_benh: isMdroPatientBangKiem(initialTemplate.id),
    ma_benh_an: "",
    ma_nguoi_benh: "",
    ten_nguoi_benh: "",
    so_giuong_nguoi_benh: "",
    ...EMPTY_GSC_BO_SUNG_NB,
    ghi_chu_chung: "",
    thoi_gian_bat_dau: "" as string | undefined,
    thoi_gian_ket_thuc: "" as string | undefined,
    cach_thuc_id: undefined as string | undefined,
    hinh_thuc_id: undefined as string | undefined,
  });

  const [results, setResults] = useState<ChecklistResult[]>(
    initialTemplate.criteria.map((c) => ({ criterionId: c.id, value: "NA" })),
  );
  const lastSavedSubjectsRef = useRef({
    is_giam_sat_ca_nhan: false,
    nghe_nghiep_id: "",
    nhan_vien_id: "",
    is_manual_nhan_vien: false,
    ten_manual_nhan_vien: "",
    is_bo_sung_nguoi_benh: isMdroPatientBangKiem(initialTemplate.id),
    ma_benh_an: "",
    ma_nguoi_benh: "",
    ten_nguoi_benh: "",
    so_giuong_nguoi_benh: "",
    ...EMPTY_GSC_BO_SUNG_NB,
  });
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [stickyHintActive, setStickyHintActive] = useState(false);

  useEffect(() => {
    if (!editSession) return;
    const s = editSession as Partial<GiamSatSession>;
    if (s.khoa_id !== undefined) setSelectedKhoa(String(s.khoa_id ?? ""));
    if (s.khu_vuc_id !== undefined) setSelectedKhuVuc(String(s.khu_vuc_id ?? ""));
    if (s.ngay_giam_sat !== undefined) setNgayGiamSat(String(s.ngay_giam_sat ?? ""));

    setSession((prev) => ({
      ...prev,
      vi_tri: String(s.vi_tri ?? ""),
      hinh_thuc_giam_sat: String(s.hinh_thuc_giam_sat ?? prev.hinh_thuc_giam_sat ?? "Giám sát chuyên trách"),
      cach_thuc_giam_sat: String(s.cach_thuc_giam_sat ?? prev.cach_thuc_giam_sat ?? "Giám sát trực tiếp tại chỗ"),
      nguoi_giam_sat_id: String(s.nguoi_giam_sat_id ?? prev.nguoi_giam_sat_id ?? ""),
      is_giam_sat_ca_nhan: Boolean(s.is_giam_sat_ca_nhan),
      nghe_nghiep_id: String(s.nghe_nghiep_id ?? ""),
      nhan_vien_id: String(s.nhan_vien_id ?? ""),
      is_manual_nhan_vien: Boolean(s.is_manual_nhan_vien),
      ten_manual_nhan_vien: String(s.ten_manual_nhan_vien ?? ""),
      ghi_chu_chung: String(s.ghi_chu_chung ?? ""),
      thoi_gian_bat_dau: s.thoi_gian_bat_dau,
      thoi_gian_ket_thuc: s.thoi_gian_ket_thuc,
      is_bo_sung_nguoi_benh: Boolean(s.is_bo_sung_nguoi_benh),
      ma_benh_an: String(s.ma_benh_an ?? ""),
      ma_nguoi_benh: String(s.ma_nguoi_benh ?? ""),
      ten_nguoi_benh: String(s.ten_nguoi_benh ?? ""),
      so_giuong_nguoi_benh: String(s.so_giuong_nguoi_benh ?? ""),
      ...parseGscBoSungNbFromUnknown(s),
      cach_thuc_id: s.cach_thuc_id,
      hinh_thuc_id: s.hinh_thuc_id,
    }));
    if (s.khoa_id) setSelectedKhoa(String(s.khoa_id));
  }, [editSession, setSelectedKhoa, setSelectedKhuVuc, setNgayGiamSat]);

  useEffect(() => {
    if (!editResults || !Array.isArray(editResults) || editResults.length === 0) return;
    const m = new Map(editResults.map((r) => [String(r.criterionId), r]));
    setResults(
      template.criteria.map((c) => {
        const r = m.get(c.id);
        return {
          criterionId: c.id,
          value: (r?.value === "DAT" || r?.value === "KHONG_DAT" || r?.value === "NA" ? r.value : "NA") as
            | "DAT"
            | "KHONG_DAT"
            | "NA",
          note: r?.note ?? null,
        };
      }),
    );
  }, [editResults, template.criteria, template]);

  /** Tem QR vị trí (`?loc=&ma=`) — ưu tiên hơn sticky; bỏ qua khi sửa phiên. */
  useEffect(() => {
    if (headerLoading || editingSessionId || editSession || locAppliedRef.current) return;
    if (!locPrefill?.ma) return;
    const ma = String(locPrefill.ma).trim();
    if (!ma) return;

    if (locPrefill.kind === "khoa") {
      if (!khoas.length) return;
      locAppliedRef.current = true;
      stickyAppliedRef.current = true;
      const hit = matchMasterByMa(khoas, ma);
      if (hit?.id) {
        setSelectedKhoa(hit.id);
        setSelectedKhuVuc("");
        setStickyHintActive(true);
        toast.success(`Đã chọn khoa «${hit.ten_danh_muc || ma}» từ tem QR vị trí`);
      } else {
        toast.error(`Không tìm thấy khoa/phòng mã «${ma}» trong danh mục được phép`);
      }
      return;
    }

    if (!khuVucs.length) return;
    locAppliedRef.current = true;
    stickyAppliedRef.current = true;
    const hit = matchMasterByMa(khuVucs, ma);
    if (hit?.id) {
      setSelectedKhuVuc(hit.id);
      const meta = hit.metadata as { khoa_id?: string; khoa_phong_id?: string } | undefined;
      const parentKhoa = String(meta?.khoa_id || meta?.khoa_phong_id || "").trim();
      if (parentKhoa) setSelectedKhoa(parentKhoa);
      setStickyHintActive(true);
      toast.success(`Đã chọn khu vực «${hit.ten_danh_muc || ma}» từ tem QR vị trí`);
    } else {
      toast.error(`Không tìm thấy khu vực giám sát mã «${ma}» trong danh mục được phép`);
    }
  }, [
    headerLoading,
    editingSessionId,
    editSession,
    locPrefill,
    khoas,
    khuVucs,
    setSelectedKhoa,
    setSelectedKhuVuc,
  ]);

  useEffect(() => {
    if (headerLoading || editingSessionId || editSession || stickyAppliedRef.current) return;
    if (locPrefill?.ma) return;
    if (!currentHoSoId) return;
    stickyAppliedRef.current = true;
    const sticky = readStickyAdminContext("gsc", currentHoSoId);
    if (!sticky) return;
    const mangLuoi = Boolean(isMangLuoi && !isAdmin);
    const actorKhoaId = userData?.khoa_id ?? null;
    const base: GiamSatSession = {
      khoa_id: selectedKhoa,
      khu_vuc_id: selectedKhuVuc,
      vi_tri: session.vi_tri,
      nguoi_giam_sat_id: session.nguoi_giam_sat_id,
      ngay_giam_sat: ngayGiamSat,
      cach_thuc_id: session.cach_thuc_id,
      cach_thuc_giam_sat: session.cach_thuc_giam_sat,
    };
    const merged = mergeStickyIntoSession(base, sticky, { isMangLuoi: mangLuoi, actorKhoaId });
    if (merged.khoa_id && merged.khoa_id !== selectedKhoa) setSelectedKhoa(merged.khoa_id);
    if (merged.khu_vuc_id) setSelectedKhuVuc(merged.khu_vuc_id);
    setSession((prev) => ({
      ...prev,
      vi_tri: merged.vi_tri || prev.vi_tri,
      cach_thuc_id: merged.cach_thuc_id || prev.cach_thuc_id,
      cach_thuc_giam_sat: merged.cach_thuc_giam_sat || prev.cach_thuc_giam_sat,
    }));
    if (sticky.khoa_id || sticky.khu_vuc_id || sticky.vi_tri) setStickyHintActive(true);
    // Chỉ apply sticky một lần sau load header.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerLoading, currentHoSoId, editingSessionId, editSession]);

  const [loading, setLoading] = useState(false);
  const { isLockedForSelectedDate, lockMessage, lockedUntilDate } = useGscModuleLock(ngayGiamSat);
  const dbPrintLabels = useGscDbPrintLabels({
    khoa_id: selectedKhoa,
    khu_vuc_id: selectedKhuVuc,
    nhan_vien_id: session.nhan_vien_id,
    nghe_nghiep_id: session.nghe_nghiep_id,
    nguoi_giam_sat_id: session.nguoi_giam_sat_id,
  });

  useEffect(() => {
    if (!currentHoSoId) return;
    setSession((prev) => ({
      ...prev,
      nguoi_giam_sat_id: prev.nguoi_giam_sat_id || currentHoSoId,
    }));
  }, [currentHoSoId]);

  useEffect(() => {
    void loadGscTemplateOptions().then(setDbTemplates);
  }, []);

  const handleSwitchTemplate = async (bkId: string) => {
    setLoading(true);
    const out = await switchGscTemplateByBangKiemId(bkId, dbTemplates);
    setLoading(false);
    if (!out.ok) {
      toast.error(out.error);
      return;
    }
    setTemplate(out.template);
    setResults(out.results);
    toast.success("Đã chuyển mẫu: " + out.template.title);
  };

  const handleSave = async () => {
    if (isLockedForSelectedDate) {
      toast.error(lockMessage ?? "Phiên thuộc ngày đã bị khóa báo cáo GSC.");
      return;
    }
    if (!selectedKhoa || !selectedKhuVuc) {
      toast.error("Vui lòng chọn Khoa và Khu vực");
      return;
    }
    const supervisorId = String(session.nguoi_giam_sat_id || currentHoSoId || "").trim();
    if (!supervisorId) {
      toast.error("Không xác định được người giám sát. Liên kết tài khoản với hồ sơ nhân sự tại Tài khoản của tôi.");
      return;
    }
    if (!gscCanSaveResults(results, template.cach_tinh_diem, template.loai_giam_sat)) {
      toast.error(
        isGscNhatKyCach(template.cach_tinh_diem, template.loai_giam_sat)
          ? "Nhật ký: nhập ít nhất 1 số liệu hoặc lựa chọn."
          : "Vui lòng đánh giá ít nhất 1 tiêu chí",
      );
      return;
    }
    if (isReplayCameraSupervisionCachThuc(session.cach_thuc_giam_sat)) {
      const bd = String(session.thoi_gian_bat_dau ?? "").trim();
      const kt = String(session.thoi_gian_ket_thuc ?? "").trim();
      if (!bd || !kt) {
        toast.error("Giám sát lại qua camera: nhập đủ Ngày giám sát và khung giờ Từ – Đến ở phần đầu phiên.");
        return;
      }
    }
    setLoading(true);
    try {
      const payload = {
        ...session,
        khoa_id: selectedKhoa,
        khu_vuc_id: selectedKhuVuc,
        ngay_giam_sat: ngayGiamSat,
        loai_bang_kiem: template.id,
      } as GscSessionInput;
      const sid = String(editingSessionId ?? "").trim();

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueueOfflineGscSave({
          session: payload,
          results,
          existingSessionId: sid || null,
        });
        toast.warning(
          "Chưa lên máy chủ — phiên đang chờ mạng. Khi có internet, bấm «Đồng bộ» ở góc màn hình hoặc mở lại trang.",
          { duration: 8000 },
        );
        return;
      }

      const res = await saveGiamSatChung(payload, results, sid ? { existingSessionId: sid } : undefined);
      if (res.success) {
        toast.success(sid ? "Đã cập nhật phiên giám sát." : "Đã lưu kết quả!");
        if (sid) {
          onSuccess();
        } else {
          lastSavedSubjectsRef.current = {
            is_giam_sat_ca_nhan: Boolean(session.is_giam_sat_ca_nhan),
            nghe_nghiep_id: String(session.nghe_nghiep_id || ""),
            nhan_vien_id: String(session.nhan_vien_id || ""),
            is_manual_nhan_vien: Boolean(session.is_manual_nhan_vien),
            ten_manual_nhan_vien: String(session.ten_manual_nhan_vien || ""),
            is_bo_sung_nguoi_benh: Boolean(session.is_bo_sung_nguoi_benh),
            ma_benh_an: String(session.ma_benh_an || ""),
            ma_nguoi_benh: String(session.ma_nguoi_benh || ""),
            ten_nguoi_benh: String(session.ten_nguoi_benh || ""),
            so_giuong_nguoi_benh: String(session.so_giuong_nguoi_benh || ""),
            ...parseGscBoSungNbFromUnknown(session),
          };
          const admin = pickAdminContext({
            khoa_id: selectedKhoa,
            khu_vuc_id: selectedKhuVuc,
            vi_tri: session.vi_tri,
            cach_thuc_id: session.cach_thuc_id,
            cach_thuc_giam_sat: session.cach_thuc_giam_sat,
          });
          if (currentHoSoId) writeStickyAdminContext("gsc", currentHoSoId, admin);
          setStickyHintActive(Boolean(admin.khoa_id));
          setResults(emptyResultsForTemplate(template));
          setSession((prev) => {
            const continued = buildContinueAdminSession(
              {
                ...prev,
                khoa_id: selectedKhoa,
                khu_vuc_id: selectedKhuVuc,
                ngay_giam_sat: ngayGiamSat,
              },
              { keepSubjects: false },
            );
            setNgayGiamSat(continued.ngay_giam_sat);
            return {
              ...prev,
              vi_tri: continued.vi_tri,
              cach_thuc_id: continued.cach_thuc_id,
              cach_thuc_giam_sat:
                continued.cach_thuc_giam_sat || prev.cach_thuc_giam_sat || "Giám sát trực tiếp tại chỗ",
              thoi_gian_bat_dau: "",
              thoi_gian_ket_thuc: "",
              ghi_chu_chung: "",
              is_giam_sat_ca_nhan: false,
              nghe_nghiep_id: "",
              nhan_vien_id: "",
              is_manual_nhan_vien: false,
              ten_manual_nhan_vien: "",
              is_bo_sung_nguoi_benh: false,
              ma_benh_an: "",
              ma_nguoi_benh: "",
              ten_nguoi_benh: "",
              so_giuong_nguoi_benh: "",
              ...EMPTY_GSC_BO_SUNG_NB,
            };
          });
          setShowContinuePrompt(true);
        }
      } else toast.error("Lỗi: " + res.error);
    } catch (error: unknown) {
      if (isLikelyOfflineOrNetworkFailure(error)) {
        const payload = {
          ...session,
          khoa_id: selectedKhoa,
          khu_vuc_id: selectedKhuVuc,
          ngay_giam_sat: ngayGiamSat,
          loai_bang_kiem: template.id,
        } as GscSessionInput;
        const sid = String(editingSessionId ?? "").trim();
        enqueueOfflineGscSave({
          session: payload,
          results,
          existingSessionId: sid || null,
        });
        toast.warning(
          "Chưa lên máy chủ — mạng lỗi, phiên đang chờ. Khi có internet, bấm «Đồng bộ» ở góc màn hình.",
          { duration: 8000 },
        );
      } else {
        toast.error("Lỗi: " + formatUnknownError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const continueHere = useCallback((keepSubjects: boolean) => {
    if (keepSubjects) {
      setSession((prev) => ({ ...prev, ...lastSavedSubjectsRef.current }));
    }
    setShowContinuePrompt(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const changeLocation = useCallback(() => {
    const lockedId = lockKhoa ? String(userData?.khoa_id || selectedKhoa || "").trim() : "";
    resetHeader();
    if (lockedId) setSelectedKhoa(lockedId);
    setSelectedKhuVuc("");
    setSession((prev) => {
      const fresh = buildFreshAdminSession(
        {
          ...prev,
          khoa_id: selectedKhoa,
          khu_vuc_id: selectedKhuVuc,
          ngay_giam_sat: ngayGiamSat,
        },
        { lockedKhoaId: lockedId || null },
      );
      setNgayGiamSat(fresh.ngay_giam_sat);
      return {
        ...prev,
        vi_tri: "",
        thoi_gian_bat_dau: "",
        thoi_gian_ket_thuc: "",
        ghi_chu_chung: "",
        is_giam_sat_ca_nhan: false,
        nghe_nghiep_id: "",
        nhan_vien_id: "",
        is_manual_nhan_vien: false,
        ten_manual_nhan_vien: "",
        is_bo_sung_nguoi_benh: false,
        ma_benh_an: "",
        ma_nguoi_benh: "",
        ten_nguoi_benh: "",
        so_giuong_nguoi_benh: "",
        ...EMPTY_GSC_BO_SUNG_NB,
        cach_thuc_id: undefined,
      };
    });
    setResults(emptyResultsForTemplate(template));
    if (currentHoSoId) clearStickyAdminContext("gsc", currentHoSoId);
    setStickyHintActive(false);
    setShowContinuePrompt(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [
    lockKhoa,
    userData?.khoa_id,
    selectedKhoa,
    selectedKhuVuc,
    ngayGiamSat,
    resetHeader,
    setSelectedKhoa,
    setSelectedKhuVuc,
    setNgayGiamSat,
    template,
    currentHoSoId,
  ]);

  const finishToHistory = useCallback(() => {
    setShowContinuePrompt(false);
    onSuccess();
  }, [onSuccess]);

  const clearStickyHint = useCallback(() => {
    if (currentHoSoId) clearStickyAdminContext("gsc", currentHoSoId);
    setStickyHintActive(false);
    const lockedId = lockKhoa ? String(userData?.khoa_id || selectedKhoa || "").trim() : "";
    if (lockedId) setSelectedKhoa(lockedId);
    else if (!lockKhoa) setSelectedKhoa("");
    setSelectedKhuVuc("");
    setSession((prev) => ({
      ...prev,
      vi_tri: "",
      cach_thuc_id: undefined,
    }));
  }, [currentHoSoId, lockKhoa, userData?.khoa_id, selectedKhoa, setSelectedKhoa, setSelectedKhuVuc]);

  const formProgress: GscFormProgress = useMemo(
    () =>
      previewGscFormProgress(
        results,
        template.criteria,
        template.cach_tinh_diem,
        {
          thoi_gian_bat_dau: session.thoi_gian_bat_dau || null,
          thoi_gian_ket_thuc: session.thoi_gian_ket_thuc || null,
        },
        template.loai_giam_sat,
      ),
    [
      results,
      template.criteria,
      template.cach_tinh_diem,
      template.loai_giam_sat,
      session.thoi_gian_bat_dau,
      session.thoi_gian_ket_thuc,
    ],
  );

  const sessionForPrint = useMemo(() => {
    let row = {
      ...session,
      khoa_id: selectedKhoa,
      khu_vuc_id: selectedKhuVuc,
      ngay_giam_sat: ngayGiamSat,
    } as Record<string, unknown>;
    if (dbPrintLabels) row = mergeGscSessionWithDbPrintLabels(row, dbPrintLabels);
    return snapshotGscSessionForPrint(
      row,
      khoas,
      khuVucs,
      ngheNghieps,
      (nhanSus as { id?: string; ho_ten?: string }[]) || [],
    );
  }, [session, selectedKhoa, selectedKhuVuc, ngayGiamSat, khoas, khuVucs, ngheNghieps, nhanSus, dbPrintLabels]);

  const setSessionFromHeader = useCallback((action: SetStateAction<GiamSatSession>) => {
    const base: GiamSatSession = {
      ...session,
      khoa_id: selectedKhoa,
      khu_vuc_id: selectedKhuVuc,
      ngay_giam_sat: ngayGiamSat,
    };
    const newVal = typeof action === "function" ? action(base) : action;
    // Header effects return `prev` (= base) when nothing changed — must not call setState.
    if (newVal === base) return;
    if (newVal.khoa_id !== undefined && newVal.khoa_id !== selectedKhoa) setSelectedKhoa(newVal.khoa_id);
    if (newVal.khu_vuc_id !== undefined && newVal.khu_vuc_id !== selectedKhuVuc) setSelectedKhuVuc(newVal.khu_vuc_id);
    if (newVal.ngay_giam_sat !== undefined && newVal.ngay_giam_sat !== ngayGiamSat) setNgayGiamSat(newVal.ngay_giam_sat);
    const { khoa_id: _khoaId, khu_vuc_id: _khuVucId, ngay_giam_sat: _ngayGiamSat, ...rest } = newVal;
    setSession((prev) => {
      const patch = rest as Record<string, unknown>;
      if (!hasSessionDiff(prev as Record<string, unknown>, patch)) return prev;
      return { ...prev, ...rest } as typeof prev;
    });
  }, [session, selectedKhoa, selectedKhuVuc, ngayGiamSat]);

  const continueSummary = [
    khoas.find((k) => k.id === selectedKhoa)?.ten_danh_muc,
    khuVucs.find((k) => k.id === selectedKhuVuc)?.ten_danh_muc,
    session.vi_tri,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    template,
    dbTemplates,
    currentHoSoId,
    session,
    setSession,
    results,
    setResults,
    loading,
    headerLoading,
    selectedKhoa,
    selectedKhuVuc,
    ngayGiamSat,
    khoas,
    khuVucs,
    ngheNghieps,
    hinhThucGiamSats,
    cachThucGiamSats,
    nhanSus,
    historyLocations,
    historyLocationRows,
    handleSwitchTemplate,
    handleSave,
    formProgress,
    isLockedForSelectedDate,
    lockMessage,
    lockedUntilDate,
    sessionForPrint,
    setSessionFromHeader,
    lockKhoa: Boolean(lockKhoa && !editingSessionId),
    stickyHintActive,
    clearStickyHint,
    showContinuePrompt,
    continueSummary,
    continueHere,
    changeLocation,
    finishToHistory,
  };
}
