// src/modules/cssd-erp/hooks/useCSSDWorkflow.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Station, CSSDWaitingItem } from "../types/cssd.types";
import { scanQR, getWaitingListByStation } from "../actions/cssd.actions";
import { toast } from "sonner";
import { SCAN_STATIONS, WORKFLOW_STEPS, nextStationLabel } from "../workflow/domain/cssd-stations";

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
      // Nếu là lỗi phiên đăng nhập (session chưa restore), không crash UI — chỉ log nhẹ
      if (msg.includes("chưa đăng nhập") || msg.includes("not authenticated")) {
        console.warn("[CSSD] Phiên đăng nhập chưa sẵn sàng, thử lại sau.");
        setWaitingList([]);
      } else {
        console.error("Lỗi lấy danh sách chờ:", error);
        toast.error(msg);
      }
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
      let scanRes: { tenBoDungCu?: string } = {};
      
      if (code.startsWith("CATALOG::")) {
        const { registerPhysicalBoLabelFromDmAction } = await import("../actions/cssd-register-label.actions");
        const boId = code.replace("CATALOG::", "");
        const res = await registerPhysicalBoLabelFromDmAction(boId);
        if (!res.success) throw new Error(res.error || "Không thể khởi tạo bộ dụng cụ.");
        code = res.ma_vach_qr;
        scanRes = { tenBoDungCu: res.ten_bo };
      } else {
        scanRes = await scanQR(code, currentStation, extraPayload);
      }

      const buocTiepTheo = nextStationLabel(currentStation);

      setLastScan({
        qrCode: code,
        tenBoDungCu: scanRes.tenBoDungCu || "Chưa gán bộ",
        nguoiThucHien: "Nhân viên KSNK",
        thoiGianQuet: new Date().toLocaleTimeString("vi-VN"),
        buocTiepTheo,
        maCaMoId: extraPayload?.ma_ca_mo_id,
        ledgerWarning: (scanRes as any).ledgerWarning,
      });

      toast.success(`Đã xử lý: ${code}`);
      fetchWaitingList(currentStation);
    } catch (error: unknown) {
      const { isNetworkError, pushOfflineTask } = await import("@/lib/offline-sync");
      if (isNetworkError(error)) {
        await pushOfflineTask("SCAN_QR", { maQR: code, station: currentStation, extraPayload });
        toast.info("Đã lưu ngoại tuyến", {
          description: `Mã ${code} sẽ tự động đồng bộ khi có mạng.`,
        });
        
        // Mock success for UI flow continuity
        setLastScan({
          qrCode: code,
          tenBoDungCu: "Đang chờ đồng bộ...",
          nguoiThucHien: "Nhân viên KSNK",
          thoiGianQuet: new Date().toLocaleTimeString("vi-VN"),
          buocTiepTheo: nextStationLabel(currentStation),
          maCaMoId: extraPayload?.ma_ca_mo_id,
          isOffline: true
        });
        
        // Remove from waiting list optimistically
        setWaitingList(prev => prev.filter(item => item.ma_vach_qr !== code));
      } else {
        toast.error(error instanceof Error ? error.message : "Lỗi quét mã");
      }
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
