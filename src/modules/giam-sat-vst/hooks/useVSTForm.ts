// src/modules/giam-sat-vst/hooks/useVSTForm.ts
"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { mdmGetSupervisionMasterDataBundle } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";
import { getVstHeaderDmDropdowns } from "../actions/vst-read.actions";
import type { VstSessionLocationHistoryRow } from "@/modules/quan-tri-he-thong/danh-muc/actions/master-data-gateway.actions";
import { toast } from "sonner";
import { createDefaultVSTFormPersons, type VSTFormPerson, useVSTFormHandlers } from "./useVSTFormHandlers";
import type { GiamSatSession } from "@/components/shared/giam-sat-header.types";
import type { MasterOption } from "@/lib/master-data/gateway";
import { usePermission } from "@/hooks/usePermission";
import {
  buildContinueAdminSession,
  buildFreshAdminSession,
  clearStickyAdminContext,
  mergeStickyIntoSession,
  pickAdminContext,
  readStickyAdminContext,
  resolveDefaultKhoaId,
  writeStickyAdminContext,
} from "@/lib/supervision-admin-context";
import { createNewOpp } from "../lib/vst-form-model";

type NhanSuOption = { id?: string; khoa_id?: string; nghe_nghiep_id?: string; [key: string]: unknown };

function clonePersonIdentities(persons: VSTFormPerson[]): VSTFormPerson[] {
  return persons.map((p) => ({
    ...p,
    opportunities: [createNewOpp()],
  }));
}

export function useVSTForm(onSuccess: () => void, editingSessionId?: string | null) {
  const { isMangLuoi, isAdmin, userData, loading: permLoading } = usePermission();
  const lockKhoa = Boolean(isMangLuoi && !isAdmin && !editingSessionId);
  const actorKhoaId = userData?.khoa_id ?? null;

  const [session, setSession] = useState<GiamSatSession>({
    khoa_id: "",
    khu_vuc_id: "",
    vi_tri: "",
    hinh_thuc_giam_sat: "Giám sát chuyên trách",
    cach_thuc_giam_sat: "Giám sát trực tiếp tại chỗ",
    nguoi_giam_sat_id: "",
    ngay_giam_sat: new Date().toISOString().split("T")[0]!,
    thoi_gian_bat_dau: "",
  });

  const [persons, setPersons] = useState<VSTFormPerson[]>(createDefaultVSTFormPersons());
  const lastSavedPersonsRef = useRef<VSTFormPerson[]>(createDefaultVSTFormPersons());

  const [nhanSus, setNhanSus] = useState<NhanSuOption[]>([]);
  const [khoas, setKhoas] = useState<MasterOption[]>([]);
  const [khuVucs, setKhuVucs] = useState<MasterOption[]>([]);
  const [ngheNghieps, setNgheNghieps] = useState<MasterOption[]>([]);
  const [hinhThucGiamSats, setHinhThucGiamSats] = useState<MasterOption[]>([]);
  const [cachThucGiamSats, setCachThucGiamSats] = useState<MasterOption[]>([]);
  const [historyLocations, setHistoryLocations] = useState<string[]>([]);
  const [historyLocationRows, setHistoryLocationRows] = useState<VstSessionLocationHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currentHoSoId, setCurrentHoSoId] = useState<string | null>(null);
  /** true khi bundle MDM thất bại — ẩn banner “Quản trị viên / chưa liên kết” để tránh hiểu nhầm khi chưa có dữ liệu. */
  const [masterDataFetchFailed, setMasterDataFetchFailed] = useState(false);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [stickyHintActive, setStickyHintActive] = useState(false);
  const adminDefaultsAppliedRef = useRef(false);

  const handleCreateSaveSuccess = useCallback((savedPersons: VSTFormPerson[]) => {
    lastSavedPersonsRef.current = savedPersons;
    const admin = pickAdminContext(session);
    if (currentHoSoId) writeStickyAdminContext("vst", currentHoSoId, admin);
    setStickyHintActive(Boolean(admin.khoa_id));
    setPersons(createDefaultVSTFormPersons());
    setTimeLeft(null);
    setSession((prev) => buildContinueAdminSession(prev, { keepSubjects: false }));
    setShowContinuePrompt(true);
  }, [session, currentHoSoId]);

  useEffect(() => {
    let cancelled = false;
    async function loadInitialData() {
      setInitialLoading(true);
      setMasterDataFetchFailed(false);
      try {
        const result = await mdmGetSupervisionMasterDataBundle({ permissionContext: "vst", includeNhanSu: true });
        if (cancelled) return;
        if (result.success) {
          setMasterDataFetchFailed(false);
          const scoped = await getVstHeaderDmDropdowns();
          const scopedData = scoped.success ? scoped.data : null;
          const nextKhoas = scopedData?.khoas?.length ? scopedData.khoas : result.data.khoas || [];
          setKhoas(nextKhoas);
          setKhuVucs(scopedData?.khuVucs?.length ? scopedData.khuVucs : result.data.khuVucs || []);
          // Nhân sự form: luôn dùng bundle đầy đủ (khoa_id, nghe_nghiep_id, chức danh…) — parity GSC.
          setNhanSus(result.data.nhanSus || []);
          setNgheNghieps(scopedData?.ngheNghieps?.length ? scopedData.ngheNghieps : result.data.ngheNghieps || []);
          setHinhThucGiamSats((result.data as { hinhThucGiamSats?: MasterOption[] }).hinhThucGiamSats || []);
          setCachThucGiamSats((result.data as { cachThucGiamSats?: MasterOption[] }).cachThucGiamSats || []);
          setHistoryLocations(result.data.historyLocations || []);
          setHistoryLocationRows(
            (result.data as { historyLocationRows?: VstSessionLocationHistoryRow[] }).historyLocationRows || [],
          );
          const selfId = result.data.currentHoSoId;
          setCurrentHoSoId(selfId || null);
          if (selfId) {
            setSession((prev) => ({ ...prev, nguoi_giam_sat_id: prev.nguoi_giam_sat_id || selfId }));
          }
        } else {
          setMasterDataFetchFailed(true);
          setKhoas([]);
          setKhuVucs([]);
          setNhanSus([]);
          setNgheNghieps([]);
          setHistoryLocations([]);
          setHistoryLocationRows([]);
          setCurrentHoSoId(null);
          toast.error(result.error || "Lỗi tải danh mục.");
        }
      } catch {
        if (cancelled) return;
        setMasterDataFetchFailed(true);
        setKhoas([]);
        setKhuVucs([]);
        setNhanSus([]);
        setNgheNghieps([]);
        setHistoryLocations([]);
        setHistoryLocationRows([]);
        setCurrentHoSoId(null);
        toast.error("Không tải được danh mục. Vui lòng kiểm tra cấu hình máy chủ hoặc thử lại.");
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }
    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-khoa + sticky (create only).
  useEffect(() => {
    if (initialLoading || permLoading || editingSessionId) return;
    if (adminDefaultsAppliedRef.current) return;
    adminDefaultsAppliedRef.current = true;

    const defaultKhoa = resolveDefaultKhoaId({
      isMangLuoi: Boolean(isMangLuoi && !isAdmin),
      actorKhoaId,
      khoas,
    });
    const sticky = currentHoSoId ? readStickyAdminContext("vst", currentHoSoId) : null;
    setSession((prev) => {
      let next = { ...prev };
      if (!next.khoa_id && defaultKhoa) next = { ...next, khoa_id: defaultKhoa };
      if (sticky) {
        next = mergeStickyIntoSession(next, sticky, {
          isMangLuoi: Boolean(isMangLuoi && !isAdmin),
          actorKhoaId,
        });
        if (sticky.khoa_id || sticky.khu_vuc_id || sticky.vi_tri) setStickyHintActive(true);
      }
      return next;
    });
  }, [
    initialLoading,
    permLoading,
    editingSessionId,
    isMangLuoi,
    isAdmin,
    actorKhoaId,
    khoas,
    currentHoSoId,
  ]);

  const {
    updatePerson, toggleMoment, updateAction, updateAssessment, openOpportunity, submitOpportunity, handleFinalSave
  } = useVSTFormHandlers(
    persons,
    setPersons,
    session,
    setSession,
    setTimeLeft,
    ngheNghieps,
    khuVucs,
    setLoading,
    onSuccess,
    editingSessionId ?? null,
    handleCreateSaveSuccess,
  );

  const handleFinalSaveRef = useRef(handleFinalSave);
  useLayoutEffect(() => {
    handleFinalSaveRef.current = handleFinalSave;
  }, [handleFinalSave]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      toast.error("Hết thời gian phiên giám sát (30 phút). Hệ thống tự động lưu.");
      void handleFinalSaveRef.current();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const continueHere = useCallback(
    (keepSubjects: boolean) => {
      setSession((prev) => buildContinueAdminSession(prev, { keepSubjects: false }));
      if (keepSubjects) {
        setPersons(clonePersonIdentities(lastSavedPersonsRef.current));
      } else {
        setPersons(createDefaultVSTFormPersons());
      }
      setShowContinuePrompt(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [],
  );

  const changeLocation = useCallback(() => {
    const lockedId = lockKhoa ? String(actorKhoaId || "").trim() : "";
    setSession((prev) => buildFreshAdminSession(prev, { lockedKhoaId: lockedId || null }));
    setPersons(createDefaultVSTFormPersons());
    setShowContinuePrompt(false);
    if (currentHoSoId) clearStickyAdminContext("vst", currentHoSoId);
    setStickyHintActive(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [lockKhoa, actorKhoaId, currentHoSoId]);

  const finishToHistory = useCallback(() => {
    setShowContinuePrompt(false);
    onSuccess();
  }, [onSuccess]);

  const clearStickyHint = useCallback(() => {
    if (currentHoSoId) clearStickyAdminContext("vst", currentHoSoId);
    setStickyHintActive(false);
    setSession((prev) => {
      const lockedId = lockKhoa ? String(actorKhoaId || prev.khoa_id || "").trim() : "";
      return buildFreshAdminSession(prev, { lockedKhoaId: lockedId || null });
    });
  }, [currentHoSoId, lockKhoa, actorKhoaId]);

  const continueSummary = [
    khoas.find((k) => k.id === session.khoa_id)?.ten_danh_muc,
    khuVucs.find((k) => k.id === session.khu_vuc_id)?.ten_danh_muc,
    session.vi_tri,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    session, setSession,
    persons, setPersons,
    khoas, khuVucs,
    nhanSus, ngheNghieps, historyLocations, historyLocationRows,
    hinhThucGiamSats, cachThucGiamSats,
    loading, initialLoading, timeLeft,
    currentHoSoId,
    masterDataFetchFailed,
    lockKhoa,
    stickyHintActive,
    clearStickyHint,
    showContinuePrompt,
    continueSummary,
    continueHere,
    changeLocation,
    finishToHistory,
    updatePerson, toggleMoment, updateAction, updateAssessment, openOpportunity, submitOpportunity, handleFinalSave
  };
}
