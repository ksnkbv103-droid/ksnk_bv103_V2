// src/modules/giam-sat-vst/hooks/useVSTForm.ts
"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { mdmGetSupervisionMasterDataBundle } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";
import type { VstSessionLocationHistoryRow } from "@/modules/quan-tri-he-thong/danh-muc/actions/master-data-gateway.actions";
import { toast } from "sonner";
import { createDefaultVSTFormPersons, type VSTFormPerson, useVSTFormHandlers } from "./useVSTFormHandlers";
import type { GiamSatSession } from "@/components/shared/giam-sat-header.types";
import type { MasterOption } from "@/lib/master-data/gateway";

type NhanSuOption = { id?: string; khoa_id?: string; nghe_nghiep_id?: string; [key: string]: unknown };

export function useVSTForm(onSuccess: () => void, editingSessionId?: string | null) {
  const [session, setSession] = useState<GiamSatSession>({
    khoa_id: "",
    khu_vuc_id: "",
    vi_tri: "",
    hinh_thuc_giam_sat: "Giám sát chuyên trách",
    cach_thuc_giam_sat: "Giám sát trực tiếp tại chỗ",
    nguoi_giam_sat_id: "",
    ngay_giam_sat: new Date().toISOString().split("T")[0],
    thoi_gian_bat_dau: "",
  });



  const [persons, setPersons] = useState<VSTFormPerson[]>(createDefaultVSTFormPersons());

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
          setKhoas(result.data.khoas || []);
          setKhuVucs(result.data.khuVucs || []);
          setNhanSus(result.data.nhanSus || []);
          setNgheNghieps(result.data.ngheNghieps || []);
          setHinhThucGiamSats((result.data as any).hinhThucGiamSats || []);
          setCachThucGiamSats((result.data as any).cachThucGiamSats || []);
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
      } catch (err) {
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

  return {
    session, setSession,
    persons, setPersons,
    khoas, khuVucs,
    nhanSus, ngheNghieps, historyLocations, historyLocationRows,
    hinhThucGiamSats, cachThucGiamSats,
    loading, initialLoading, timeLeft,
    currentHoSoId,
    masterDataFetchFailed,
    updatePerson, toggleMoment, updateAction, updateAssessment, openOpportunity, submitOpportunity, handleFinalSave
  };
}
