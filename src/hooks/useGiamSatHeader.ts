// src/hooks/useGiamSatHeader.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import { MasterOption } from "@/lib/master-data/gateway";
import { mdmGetSupervisionMasterDataBundle } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";
import type { VstSessionLocationHistoryRow } from "@/modules/quan-tri-he-thong/danh-muc/actions/master-data-gateway.actions";
import { getGscHeaderDmDropdowns } from "@/modules/giam-sat-chung/actions/giam-sat-chung-read.actions";
import { resolveDefaultKhoaId } from "@/lib/supervision-admin-context";
import { usePermission } from "@/hooks/usePermission";

export type GiamSatHeaderPermissionContext = "admin" | "vst" | "gsc" | "nkbv";

/**
 * Hook quản lý logic Header cho các module Giám sát (VST, Giám sát chung...)
 * Hỗ trợ tự động tải danh mục Khoa, Khu vực và quản lý state chọn.
 */
export function useGiamSatHeader(permissionContext: GiamSatHeaderPermissionContext = "admin", includeNhanSu = false) {
  const { isMangLuoi, isAdmin, userData, loading: permLoading } = usePermission();
  const [khoas, setKhoas] = useState<MasterOption[]>([]);
  const [khuVucs, setKhuVucs] = useState<MasterOption[]>([]);
  const [ngheNghieps, setNgheNghieps] = useState<MasterOption[]>([]);
  const [hinhThucGiamSats, setHinhThucGiamSats] = useState<MasterOption[]>([]);
  const [cachThucGiamSats, setCachThucGiamSats] = useState<MasterOption[]>([]);
  const [nhanSus, setNhanSus] = useState<Record<string, unknown>[]>([]);
  const [historyLocations, setHistoryLocations] = useState<string[]>([]);
  const [historyLocationRows, setHistoryLocationRows] = useState<VstSessionLocationHistoryRow[]>([]);
  const [currentHoSoId, setCurrentHoSoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // State chọn
  const [selectedKhoa, setSelectedKhoa] = useState<string>("");
  const [selectedKhuVuc, setSelectedKhuVuc] = useState<string>("");
  const [ngayGiamSat, setNgayGiamSat] = useState<string>(new Date().toISOString().split('T')[0]);
  const [khoaDefaultsApplied, setKhoaDefaultsApplied] = useState(false);

  const lockKhoa = Boolean(isMangLuoi && !isAdmin);

  // Tải danh mục khởi tạo
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setKhoaDefaultsApplied(false);
      try {
        const result = await mdmGetSupervisionMasterDataBundle({ permissionContext, includeNhanSu });
        if (cancelled) return;
        if (result.success) {
          let nextKhoas = result.data.khoas || [];
          let nextKhuVucs = result.data.khuVucs || [];
          let nextNghe = result.data.ngheNghieps || [];

          // GSC create: parity VST — lọc khoa/NV theo phạm vi mạng lưới.
          if (permissionContext === "gsc") {
            const scoped = await getGscHeaderDmDropdowns();
            if (!cancelled && scoped.success && scoped.data) {
              if (scoped.data.khoas?.length) nextKhoas = scoped.data.khoas as MasterOption[];
              if (scoped.data.khuVucs?.length) nextKhuVucs = scoped.data.khuVucs as MasterOption[];
              if (scoped.data.ngheNghieps?.length) nextNghe = scoped.data.ngheNghieps as MasterOption[];
            }
          }

          setKhoas(nextKhoas);
          setKhuVucs(nextKhuVucs);
          setNgheNghieps(nextNghe);
          setHinhThucGiamSats((result.data as { hinhThucGiamSats?: MasterOption[] }).hinhThucGiamSats || []);
          setCachThucGiamSats((result.data as { cachThucGiamSats?: MasterOption[] }).cachThucGiamSats || []);
          setNhanSus(result.data.nhanSus || []);
          setHistoryLocations(result.data.historyLocations || []);
          setHistoryLocationRows((result.data as { historyLocationRows?: VstSessionLocationHistoryRow[] }).historyLocationRows || []);
          setCurrentHoSoId(result.data.currentHoSoId ?? null);
        }
      } catch (error) {
        console.error("Lỗi tải danh mục header:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [permissionContext, includeNhanSu]);

  // Auto-chọn khoa mạng lưới / danh sách 1 khoa (create — không đụng khi đã chọn tay).
  useEffect(() => {
    if (loading || permLoading || khoaDefaultsApplied) return;
    if (selectedKhoa) {
      setKhoaDefaultsApplied(true);
      return;
    }
    const defaultKhoa = resolveDefaultKhoaId({
      isMangLuoi: Boolean(isMangLuoi && !isAdmin),
      actorKhoaId: userData?.khoa_id ?? null,
      khoas,
    });
    if (defaultKhoa) setSelectedKhoa(defaultKhoa);
    setKhoaDefaultsApplied(true);
  }, [
    loading,
    permLoading,
    khoaDefaultsApplied,
    selectedKhoa,
    isMangLuoi,
    isAdmin,
    userData?.khoa_id,
    khoas,
  ]);

  const resetHeader = useCallback(() => {
    const lockedId =
      isMangLuoi && !isAdmin ? String(userData?.khoa_id || "").trim() : "";
    const fallback =
      lockedId ||
      resolveDefaultKhoaId({
        isMangLuoi: Boolean(isMangLuoi && !isAdmin),
        actorKhoaId: userData?.khoa_id ?? null,
        khoas,
      });
    setSelectedKhoa(fallback);
    setSelectedKhuVuc("");
    setNgayGiamSat(new Date().toISOString().split('T')[0]);
  }, [isMangLuoi, isAdmin, userData?.khoa_id, khoas]);

  return {
    // Data
    khoas,
    khuVucs,
    ngheNghieps,
    hinhThucGiamSats,
    cachThucGiamSats,
    nhanSus,
    historyLocations,
    historyLocationRows,
    currentHoSoId,
    loading,
    lockKhoa,
    
    // Selection state
    selectedKhoa,
    selectedKhuVuc,
    ngayGiamSat,
    
    // Setters
    setSelectedKhoa,
    setSelectedKhuVuc,
    setNgayGiamSat,
    
    // Actions
    resetHeader,
  };
}
