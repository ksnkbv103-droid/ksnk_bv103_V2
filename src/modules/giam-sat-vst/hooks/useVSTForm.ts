// src/modules/giam-sat-vst/hooks/useVSTForm.ts
"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { mdmGetSupervisionMasterDataBundle } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";
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
    hinh_thuc_giam_sat: "Giám sát khách quan",
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
  const [historyLocations, setHistoryLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currentHoSoId, setCurrentHoSoId] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      setInitialLoading(true);
      const result = await mdmGetSupervisionMasterDataBundle({ permissionContext: "vst", includeNhanSu: true });
      if (result.success) {
        setKhoas(result.data.khoas || []);
        setKhuVucs(result.data.khuVucs || []);
        setNhanSus(result.data.nhanSus || []);
        setNgheNghieps(result.data.ngheNghieps || []);
        setHistoryLocations(result.data.historyLocations || []);
        const selfId = result.data.currentHoSoId;
        setCurrentHoSoId(selfId || null);
        if (selfId) {
          setSession((prev) => ({ ...prev, nguoi_giam_sat_id: prev.nguoi_giam_sat_id || selfId }));
        }
      }
      setInitialLoading(false);
    }
    loadInitialData();
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
    nhanSus, ngheNghieps, historyLocations,
    loading, initialLoading, timeLeft,
    currentHoSoId,
    updatePerson, toggleMoment, updateAction, updateAssessment, openOpportunity, submitOpportunity, handleFinalSave
  };
}
