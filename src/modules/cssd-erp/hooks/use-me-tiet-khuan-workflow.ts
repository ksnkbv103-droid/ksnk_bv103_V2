"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { usePrint } from "@/hooks/usePrint";
import {
  addQuyTrinhToSterilizationBatch,
  createCssdSterilizationBatch,
  fetchCssdBatchMembers,
  fetchCssdMeListData,
  finishCssdSterilizationBatch,
} from "../actions/cssd.actions";

export function useMeTietKhuanWorkflow() {
  const { printLabel } = usePrint();
  const [batches, setBatches] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"LIST" | "CREATE" | "PROCESS">("LIST");
  const [machineId, setMachineId] = useState("");
  const [nguoiLoad, setNguoiLoad] = useState("");
  const [activeMe, setActiveMe] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [nguoiUnload, setNguoiUnload] = useState("");
  const [nhietDo, setNhietDo] = useState("");
  const [testBI, setTestBI] = useState<"DAT" | "KHONG_DAT" | "">("");
  const [testCI, setTestCI] = useState<"DAT" | "KHONG_DAT" | "">("");
  const [testBD, setTestBD] = useState<"DAT" | "KHONG_DAT" | "NA">("NA");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetchCssdMeListData();
    if (!res.success) {
      toast.error(res.error || "Không tải dữ liệu mẻ TK");
      setBatches([]);
      setMachines([]);
    } else {
      if (res.batchError) toast.error("Không tải mẻ tiệt khuẩn: " + res.batchError);
      if (res.machineError) toast.error("Không tải thiết bị: " + res.machineError);
      setBatches(res.batches as any[]);
      setMachines(res.machines as any[]);
    }
    setLoading(false);
  }, []);

  const reloadBatchMembers = useCallback(async () => {
    if (!activeMe?.id) return;
    const r = await fetchCssdBatchMembers(activeMe.id);
    if (!r.success) toast.error(r.error);
    else setItems((r.data as any[]) || []);
  }, [activeMe]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (step !== "PROCESS" || !activeMe?.id) return;
    void reloadBatchMembers();
  }, [step, activeMe?.id, reloadBatchMembers]);

  const createMe = async () => {
    if (!machineId || !nguoiLoad) return toast.error("Vui lòng chọn Máy và Người load");
    const r = await createCssdSterilizationBatch(machineId, nguoiLoad);
    if (!r.success) return toast.error(r.error);
    setActiveMe(r.data);
    setStep("PROCESS");
    setItems([]);
    setTestBI("");
    setTestCI("");
    setTestBD("NA");
    setNhietDo("");
    setNguoiUnload("");
  };

  const addItem = async (code: string) => {
    if (!activeMe?.id) return toast.error("Chưa có phiếu/mẻ đang mở");
    if (!code) return;
    const r = await addQuyTrinhToSterilizationBatch(activeMe.id, code.trim());
    if (!r.success) return toast.error(r.error);
    if ("logWarning" in r && r.logWarning) toast.warning("Đã vào mẻ; nhật ký: " + r.logWarning);
    await reloadBatchMembers();
    toast.success(`Đã thêm vào phiếu TK: ${"tenBo" in r ? r.tenBo : code}`);
  };

  const finishMe = async () => {
    if (!nguoiUnload || !nhietDo || !testBI || !testCI) return toast.error("Vui lòng nhập đủ thông số QC");
    const isPass = testBI === "DAT" && testCI === "DAT" && (testBD === "DAT" || testBD === "NA");
    if (!confirm(isPass ? "Xác nhận mẻ ĐẠT và chuyển trạm Cấp phát?" : "CẢNH BÁO: Mẻ LỖI. Xác nhận kết thúc?")) return;
    const saved = await finishCssdSterilizationBatch({
      activeMeId: activeMe.id,
      maLo: activeMe.ma_lo_tiet_khuan,
      quyTrinhIds: items.map((i) => i.id),
      isPass,
      nguoiUnload,
      nhietDo,
      testBI,
      testCI,
      testBD,
    });
    if (!saved.success) return toast.error("Không lưu được mẻ: " + saved.error);
    if (isPass) {
      printLabel({
        qrCode: activeMe.ma_lo_tiet_khuan,
        tenBoDungCu: "NHÃN LÔ TIỆT KHUẨN",
        tram: "TIỆT KHUẨN",
        nguoiThucHien: nguoiUnload,
        thoiGian: new Date().toLocaleString("vi-VN"),
      });
      toast.success("Mẻ ĐẠT! Đã chuyển dụng cụ sang Cấp Phát và in nhãn lô.");
    } else toast.error("Mẻ LỖI QC. Dụng cụ cần được xử lý lại!");
    setStep("LIST");
    void fetchData();
  };

  const backToList = () => {
    setStep("LIST");
    void fetchData();
  };

  const openRowForProcess = (row: any) => {
    if (row.trang_thai !== "DANG_TIET_KHUAN") {
      toast.message("Mẻ đã kết thúc", {
        description: "Dùng báo cáo / kho để tra cứu theo mã lô hoặc mã QR bộ.",
      });
      return;
    }
    setActiveMe(row);
    setStep("PROCESS");
    setNguoiUnload("");
    setNhietDo("");
    setTestBI("");
    setTestCI("");
    setTestBD("NA");
  };

  return {
    batches,
    machines,
    loading,
    step,
    setStep,
    machineId,
    setMachineId,
    nguoiLoad,
    setNguoiLoad,
    activeMe,
    items,
    nguoiUnload,
    setNguoiUnload,
    nhietDo,
    setNhietDo,
    testBI,
    setTestBI,
    testCI,
    setTestCI,
    testBD,
    setTestBD,
    createMe,
    addItem,
    finishMe,
    backToList,
    openRowForProcess,
  };
}
