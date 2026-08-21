// src/modules/cssd-erp/hooks/useCSSDWorkflow.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Station, CSSDWaitingItem } from "../types/cssd.types";
import { scanQR, getWaitingListByStation, prepareLamSachWashGateScan } from "../actions/cssd.actions";
import { prepareDongGoiBomGateScan } from "../actions/cssd-bom-checkpoint.actions";
import { usePermission } from "@/hooks/usePermission";
import { toast } from "sonner";
import { SCAN_STATIONS, WORKFLOW_STEPS, nextStationLabel } from "../workflow/domain/cssd-stations";
import { formatTimeVi } from "@/lib/format-datetime-vi";
import { cssdQuyTrinhBatchTabHref } from "@/lib/cssd-routes";

/** Các ô chọn được trên trang 6 bước — không có «trạm quét TK» (TK chỉ qua phiếu mẻ). */
const CSSD_SCAN_STATIONS: Station[] = [...SCAN_STATIONS];

type ScanResultPayload = {
  maQr?: string;
  tenBoDungCu?: string;
  quyTrinhId?: string;
  boDungCuId?: string;
  maCycleQr?: string | null;
  maLoTietKhuan?: string;
  issuanceOnly?: boolean;
};

export type DongGoiGateState = {
  code: string;
  quyTrinhId: string;
  boDungCuId: string;
  tenBoDungCu: string;
};

export type LamSachGateState = {
  code: string;
  quyTrinhId: string;
  tenBoDungCu: string;
};

export function useCSSDWorkflow() {
  const { userData } = usePermission();
  const operatorLabel =
    String(userData?.ho_ten || "").trim() || String(userData?.email || "").trim() || "CSSD";

  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [waitingList, setWaitingList] = useState<CSSDWaitingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [lastScan, setLastScan] = useState<any>(null);
  const [dongGoiGate, setDongGoiGate] = useState<DongGoiGateState | null>(null);
  const [lamSachGate, setLamSachGate] = useState<LamSachGateState | null>(null);

  const fetchWaitingList = useCallback(async (station: Station) => {
    try {
      const data = await getWaitingListByStation(station);
      setWaitingList(data);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi lấy danh sách chờ";
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
    if (station === "TIET_KHUAN") {
      toast.message("Tiệt khuẩn chỉ qua tab Mẻ (phiếu hấp) — không chọn quét tại trang 6 bước.");
      return;
    }
    setCurrentStation(station);
    setLastScan(null);
    setDongGoiGate(null);
    setLamSachGate(null);
    fetchWaitingList(station);
  };

  const openLamSachGate = useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    setLoading(true);
    setLastScan(null);
    try {
      const prep = await prepareLamSachWashGateScan(normalized);
      setLamSachGate({
        code: prep.code,
        quyTrinhId: prep.quyTrinhId,
        tenBoDungCu: prep.tenBoDungCu,
      });
      toast.success(`Mở phiếu rửa: ${prep.tenBoDungCu}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không mở được phiếu làm sạch.");
      setLamSachGate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const openDongGoiGate = useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    setLoading(true);
    setLastScan(null);
    try {
      const prep = await prepareDongGoiBomGateScan(normalized);
      setDongGoiGate({
        code: prep.code,
        quyTrinhId: prep.quyTrinhId,
        boDungCuId: prep.boDungCuId,
        tenBoDungCu: prep.tenBoDungCu,
      });
      toast.success(`Mở bảng kiểm cấu phần: ${prep.tenBoDungCu}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không mở được bảng kiểm đóng gói.");
      setDongGoiGate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyScanSuccess = useCallback(
    (
      station: Station,
      code: string,
      scanRes: ScanResultPayload,
      opts?: { ledgerWarning?: string },
    ) => {
      const displayQr = String(scanRes.maQr || code).trim().toUpperCase();
      setLastScan({
        qrCode: displayQr,
        tenBoDungCu: scanRes.tenBoDungCu || "Chưa gán bộ",
        nguoiThucHien: operatorLabel,
        thoiGianQuet: formatTimeVi(new Date()),
        buocTiepTheo: nextStationLabel(station),
        quyTrinhId: scanRes.quyTrinhId,
        boDungCuId: scanRes.boDungCuId,
        maCycleQr: scanRes.maCycleQr,
        maLoTietKhuan: scanRes.maLoTietKhuan,
        issuanceOnly: scanRes.issuanceOnly,
        ledgerWarning: opts?.ledgerWarning,
      });
      toast.success(`Đã xử lý: ${displayQr}`);
      void fetchWaitingList(station);
    },
    [operatorLabel, fetchWaitingList],
  );

  const runStationScan = useCallback(
    async (
      station: Station,
      code: string,
      extraPayload?: Record<string, unknown>,
      opts?: { ledgerWarning?: string },
    ) => {
      setLoading(true);
      setLastScan(null);
      try {
        const scanRes = await scanQR(code, station, extraPayload);
        applyScanSuccess(station, code, scanRes, opts);
        return scanRes;
      } catch (error: unknown) {
        const { isNetworkError, pushOfflineTask } = await import("@/lib/offline-sync");
        if (isNetworkError(error)) {
          await pushOfflineTask("SCAN_QR", { maQR: code, station, extraPayload });
          toast.info("Đã lưu ngoại tuyến", {
            description: `Mã ${code} sẽ tự động đồng bộ khi có mạng.`,
          });
          setLastScan({
            qrCode: code,
            tenBoDungCu: "Đang chờ đồng bộ...",
            nguoiThucHien: operatorLabel,
            thoiGianQuet: formatTimeVi(new Date()),
            buocTiepTheo: nextStationLabel(station),
            isOffline: true,
          });
          setWaitingList((prev) => prev.filter((item) => item.ma_vach_qr !== code));
        } else {
          toast.error(error instanceof Error ? error.message : "Lỗi quét mã");
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [applyScanSuccess, operatorLabel],
  );

  const handleQRScan = async (code: string, extraPayload?: Record<string, unknown>) => {
    if (!currentStation) return toast.error("Vui lòng chọn trạm trước");
    if (currentStation === "TIET_KHUAN") {
      toast.error(
        `Không quét tiệt khuẩn tại đây. Mở tab Mẻ tiệt khuẩn (${cssdQuyTrinhBatchTabHref()}): tạo phiếu, rồi quét QR bộ trong màn hình mẻ.`,
        { duration: 9000 },
      );
      return;
    }

    if (currentStation === "DONG_GOI") {
      await openDongGoiGate(code);
      return;
    }
    if (currentStation === "LAM_SACH") {
      await openLamSachGate(code);
      return;
    }

    await runStationScan(currentStation, code, extraPayload);
  };

  const confirmDongGoiAdvance = useCallback(async () => {
    if (!dongGoiGate) return;
    await runStationScan("DONG_GOI", dongGoiGate.code);
    setDongGoiGate(null);
  }, [dongGoiGate, runStationScan]);

  const confirmLamSachAdvance = useCallback(async () => {
    if (!lamSachGate) return;
    await runStationScan("LAM_SACH", lamSachGate.code);
    setLamSachGate(null);
  }, [lamSachGate, runStationScan]);

  const cancelDongGoiGate = useCallback(() => {
    setDongGoiGate(null);
    toast.message("Đã đóng bảng kiểm — bộ chưa chuyển chờ tiệt khuẩn.");
  }, []);

  const cancelLamSachGate = useCallback(() => {
    setLamSachGate(null);
    toast.message("Đã đóng phiếu rửa — bộ chưa chuyển QC.");
  }, []);

  useEffect(() => {
    if (currentStation) {
      const timer = setInterval(() => fetchWaitingList(currentStation), 5000);
      return () => clearInterval(timer);
    }
  }, [currentStation, fetchWaitingList]);

  return {
    currentStation,
    scanStations: CSSD_SCAN_STATIONS,
    stepOrderFull: [...WORKFLOW_STEPS],
    waitingList,
    loading,
    lastScan,
    scanSuccess: !!lastScan,
    dongGoiGate,
    lamSachGate,
    selectStation,
    handleQRScan,
    confirmDongGoiAdvance,
    cancelDongGoiGate,
    confirmLamSachAdvance,
    cancelLamSachGate,
    refresh: () => currentStation && fetchWaitingList(currentStation),
  };
}
