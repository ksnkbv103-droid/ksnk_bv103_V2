// src/modules/cssd-erp/hooks/useCSSDWorkflow.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Station, CSSDWaitingItem } from "../types/cssd.types";
import { scanQR, getWaitingListByStation } from "../actions/cssd.actions";
import { toast } from "sonner";
import { SCAN_STATIONS, WORKFLOW_STEPS, nextStationLabel } from "../domain/cssd-stations";

/** Các ô chọn được trên trang 6 bước — không có «trạm quét TK» (TK chỉ qua phiếu /cssd-erp/batch). */
export const CSSD_SCAN_STATIONS: Station[] = [...SCAN_STATIONS];

export function useCSSDWorkflow() {
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [waitingList, setWaitingList] = useState<CSSDWaitingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [lastScan, setLastScan] = useState<any>(null);

  const fetchWaitingList = useCallback(async (station: Station) => {
    try {
      const data = await getWaitingListByStation(station);
      setWaitingList(data);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi lấy danh sách chờ";
      console.error("Lỗi lấy danh sách chờ:", error);
      toast.error(msg);
    }
  }, []);

  const selectStation = (station: Station) => {
    setCurrentStation(station);
    setLastScan(null); // Reset scan result khi đổi trạm
    fetchWaitingList(station);
  };

  const handleQRScan = async (code: string, extraPayload?: Record<string, any>) => {
    if (!currentStation) return toast.error("Vui lòng chọn trạm trước");
    if (currentStation === "TIET_KHUAN") {
      toast.error(
        "Không quét tiệt khuẩn tại đây khi chưa quét trong phiếu mẻ. Mở Mẻ tiệt khuẩn (/cssd-erp/batch): tạo phiếu, rồi quét QR bộ trong ô quét của phiếu.",
        { duration: 9000 },
      );
      return;
    }
    setLoading(true);
    setLastScan(null);
    try {
      const scanRes = await scanQR(code, currentStation, extraPayload);

      const buocTiepTheo = nextStationLabel(currentStation);

      setLastScan({
        qrCode: code,
        tenBoDungCu: scanRes.tenBoDungCu || "Chưa gán bộ",
        nguoiThucHien: "Nhân viên KSNK",
        thoiGianQuet: new Date().toLocaleTimeString("vi-VN"),
        buocTiepTheo,
        maCaMoId: extraPayload?.ma_ca_mo_id,
      });

      toast.success(`Đã xử lý: ${code}`);
      fetchWaitingList(currentStation);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Lỗi quét mã");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStation) {
      const timer = setInterval(() => fetchWaitingList(currentStation), 5000);
      return () => clearInterval(timer);
    }
  }, [currentStation, fetchWaitingList]);

  return {
    currentStation,
    /** Chỉ 5 ô trạm quét tay (ông TK là link phiếu, không có tiêu đề TIET_KHUAN). */
    scanStations: CSSD_SCAN_STATIONS,
    /** Thứ tự đầy đủ (chứng minh chỗ TK nằm giữ DG và CAP khi đọc workflow). */
    stepOrderFull: [...WORKFLOW_STEPS],
    waitingList,
    loading,
    lastScan,
    scanSuccess: !!lastScan,
    selectStation,
    handleQRScan,
    refresh: () => currentStation && fetchWaitingList(currentStation),
  };
}
