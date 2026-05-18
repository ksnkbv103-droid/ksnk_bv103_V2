// src/hooks/useGiamSatHeader.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import { MasterOption } from "@/lib/master-data/gateway";
import { mdmGetSupervisionMasterDataBundle } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";
import type { VstSessionLocationHistoryRow } from "@/modules/quan-tri-he-thong/danh-muc/actions/master-data-gateway.actions";

export type GiamSatHeaderPermissionContext = "admin" | "vst" | "gsc" | "nkbv";

/**
 * Hook quản lý logic Header cho các module Giám sát (VST, Giám sát chung...)
 * Hỗ trợ tự động tải danh mục Khoa, Khu vực và quản lý state chọn.
 */
export function useGiamSatHeader(permissionContext: GiamSatHeaderPermissionContext = "admin", includeNhanSu = false) {
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

  // Tải danh mục khởi tạo
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const result = await mdmGetSupervisionMasterDataBundle({ permissionContext, includeNhanSu });
        if (result.success) {
          setKhoas(result.data.khoas || []);
          setKhuVucs(result.data.khuVucs || []);
          setNgheNghieps(result.data.ngheNghieps || []);
          setHinhThucGiamSats((result.data as any).hinhThucGiamSats || []);
          setCachThucGiamSats((result.data as any).cachThucGiamSats || []);
          setNhanSus(result.data.nhanSus || []);
          setHistoryLocations(result.data.historyLocations || []);
          setHistoryLocationRows((result.data as { historyLocationRows?: VstSessionLocationHistoryRow[] }).historyLocationRows || []);
          setCurrentHoSoId(result.data.currentHoSoId ?? null);
        }
      } catch (error) {
        console.error("Lỗi tải danh mục header:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [permissionContext, includeNhanSu]);

  const resetHeader = useCallback(() => {
    setSelectedKhoa("");
    setSelectedKhuVuc("");
    setNgayGiamSat(new Date().toISOString().split('T')[0]);
  }, []);

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
