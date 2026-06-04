"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { usePrint } from "@/hooks/usePrint";
import {
  addQuyTrinhToSterilizationBatch,
  confirmBatDauTietKhuanBatch,
  confirmKetThucChuTrinhTietKhuan,
  createCssdSterilizationBatch,
  fetchCssdBatchMembers,
  fetchCssdBatchWorkflowState,
  fetchCssdMeListData,
  fetchCssdTietKhuanWaitingRows,
  finishCssdSterilizationBatch,
  fetchCssdBatchHeatRisk,
} from "../actions/cssd.actions";

import { usePermission } from "@/hooks/usePermission";
import { isSteamSterilizerProfile } from "../helpers/me-tiet-khuan-machine-kind";

export function useMeTietKhuanWorkflow() {
  const { printLabel } = usePrint();
  const { userData } = usePermission();
  const [batches, setBatches] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"LIST" | "CREATE" | "PROCESS">("LIST");
  const [machineId, setMachineId] = useState("");
  const [nguoiLoad, setNguoiLoad] = useState("");
  const [activeMe, setActiveMe] = useState<any>(null);
  const [batchGate, setBatchGate] = useState<any>(null);
  const [waitingRows, setWaitingRows] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [nguoiUnload, setNguoiUnload] = useState("");

  // Tự động điền người thực hiện từ thông tin đăng nhập
  useEffect(() => {
    if (userData?.ho_ten) {
      if (!nguoiLoad) setNguoiLoad(userData.ho_ten);
      if (!nguoiUnload) setNguoiUnload(userData.ho_ten);
    }
  }, [userData, nguoiLoad, nguoiUnload]);
  const [nhietDo, setNhietDo] = useState("");
  const [thongSoMay, setThongSoMay] = useState("");
  const [chiThiTiepXuc, setChiThiTiepXuc] = useState<"DAT" | "KHONG_DAT" | "">("");
  const [chiThiDaThongSo, setChiThiDaThongSo] = useState<"DAT" | "KHONG_DAT" | "">("");
  const [testSinhHoc, setTestSinhHoc] = useState<"DAT" | "KHONG_DAT" | "NA" | "">("NA");
  const [testCI, setTestCI] = useState<"DAT" | "KHONG_DAT" | "">("");
  const [testBD, setTestBD] = useState<"DAT" | "KHONG_DAT" | "NA">("NA");
  const [anhMay, setAnhMay] = useState("");
  const [anhTiepXuc, setAnhTiepXuc] = useState("");
  const [anhDaThongSo, setAnhDaThongSo] = useState("");
  const [anhSinhHoc, setAnhSinhHoc] = useState("");
  const [anhBowieDick, setAnhBowieDick] = useState("");

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

  const reloadProcessContext = useCallback(async () => {
    if (!activeMe?.id) return;
    const [g, w, m] = await Promise.all([
      fetchCssdBatchWorkflowState(activeMe.id),
      fetchCssdTietKhuanWaitingRows(),
      fetchCssdBatchMembers(activeMe.id),
    ]);
    if (g.success) setBatchGate(g.data);
    else toast.error(g.error || "Không tải trạng thái mẻ");
    if (w.success) setWaitingRows(w.data as any[]);
    else toast.error(w.error || "Không tải danh sách chờ TK");
    if (m.success) setItems((m.data as any[]) || []);
    else toast.error(m.error || "Không tải thành phần mẻ");
  }, [activeMe]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (step !== "PROCESS" || !activeMe?.id) return;
    void reloadProcessContext();
  }, [step, activeMe?.id, reloadProcessContext]);

  useEffect(() => {
    if (step !== "PROCESS" || !activeMe?.id) return;
    const t = setInterval(() => void reloadProcessContext(), 8000);
    return () => clearInterval(t);
  }, [step, activeMe?.id, reloadProcessContext]);

  const createMe = async () => {
    if (!machineId || !nguoiLoad) return toast.error("Vui lòng chọn Máy và Người load");
    const r = await createCssdSterilizationBatch(machineId, nguoiLoad);
    if (!r.success) return toast.error(r.error);
    setActiveMe(r.data);
    setStep("PROCESS");
    setItems([]);
    setBatchGate(null);
    setWaitingRows([]);
    setNguoiUnload("");
    setNhietDo("");
    setThongSoMay("");
    setChiThiTiepXuc("");
    setChiThiDaThongSo("");
    setTestSinhHoc("NA");
    setTestCI("");
    setTestBD("NA");
    setAnhMay("");
    setAnhTiepXuc("");
    setAnhDaThongSo("");
    setAnhSinhHoc("");
    setAnhBowieDick("");
  };

  const addItem = async (code: string) => {
    if (!activeMe?.id) return toast.error("Chưa có phiếu/mẻ đang mở");
    if (!code) return;
    const r = await addQuyTrinhToSterilizationBatch(activeMe.id, code.trim());
    if (!r.success) return toast.error(r.error);
    if ("logWarning" in r && r.logWarning) toast.warning("Đã vào mẻ; nhật ký: " + r.logWarning);
    await reloadProcessContext();
    toast.success(`Đã thêm vào phiếu TK: ${"tenBo" in r ? r.tenBo : code}`);
  };

  const assertBatchHeatAllows = async (batchId: string) => {
    const h = await fetchCssdBatchHeatRisk(batchId);
    if (!h.success) return true;
    if (h.risk.level === "BLOCK") {
      h.risk.messages.forEach((m) => toast.error(m, { duration: 10000 }));
      return false;
    }
    if (h.risk.level === "WARN") {
      toast.warning(h.risk.messages[0] || "Cảnh báo nhiệt/Spaulding", { duration: 8000 });
    }
    return true;
  };

  const confirmBatDau = async () => {
    if (!activeMe?.id) return;
    if (!items.length) return toast.error("Chưa có bộ trong mẻ.");
    if (!(await assertBatchHeatAllows(activeMe.id))) return;
    if (!confirm("Xác nhận bắt đầu tiệt khuẩn? Sau bước này không thể nạp thêm bộ vào mẻ.")) return;
    const r = await confirmBatDauTietKhuanBatch(activeMe.id);
    if (!r.success) return toast.error(r.error);
    toast.success("Đã chốt nạp — các bộ chuyển sang trạng thái đang tiệt khuẩn.");
    await reloadProcessContext();
  };

  const confirmKetThucChuTrinh = async () => {
    if (!activeMe?.id) return;
    if (!confirm("Xác nhận đã kết thúc chu trình tiệt khuẩn trên máy (dỡ mẻ)? Form đánh giá QC sẽ mở.")) return;
    const r = await confirmKetThucChuTrinhTietKhuan(activeMe.id);
    if (!r.success) return toast.error(r.error);
    toast.success("Đã mở form nhập thông số & đánh giá mẻ.");
    await reloadProcessContext();
  };

  const finishQc = async (isPass: boolean, overrideThongSoMay?: string) => {
    const finalThongSoMay = overrideThongSoMay ?? thongSoMay;
    if (!nguoiUnload || !nhietDo) return toast.error("Vui lòng nhập người dỡ và nhiệt độ/áp suất");
    if (isPass && !overrideThongSoMay && !finalThongSoMay.trim()) {
      return toast.error("Thiếu thông số máy.");
    }
    if (isPass && activeMe?.id && !(await assertBatchHeatAllows(activeMe.id))) return;

    const msg = isPass ? "Xác nhận mẻ ĐẠT và chuyển các bộ sang Cấp phát?" : "CẢNH BÁO: Kết luận KHÔNG ĐẠT — xác nhận?";
    if (!confirm(msg)) return;

    // Phân loại máy để tự động xử lý chỉ thị đa thông số cho máy EO/Plasma
    const isSteam = isSteamSterilizerProfile(activeMe?.thiet_bi || batchGate?.thiet_bi || null);
    const finalChiThiDaThongSo = isSteam ? chiThiDaThongSo : "DAT";

    const testBIMapped =
      testSinhHoc === "DAT" ? "DAT" : testSinhHoc === "KHONG_DAT" ? "KHONG_DAT" : "";
    const saved = await finishCssdSterilizationBatch({
      activeMeId: activeMe.id,
      maLo: activeMe.ma_lo_tiet_khuan,
      quyTrinhIds: items.map((i) => i.id),
      isPass,
      nguoiUnload,
      nhietDo,
      testBI: testBIMapped,
      testCI,
      testBD,
      thongSoMay: finalThongSoMay,
      chiThiTiepXuc,
      chiThiDaThongSo: finalChiThiDaThongSo,
      testSinhHoc: testSinhHoc || "NA",
      anhMinhChungMay: anhMay,
      anhMinhChungTiepXuc: anhTiepXuc,
      anhMinhChungDaThongSo: anhDaThongSo,
      anhMinhChungSinhHoc: anhSinhHoc,
      anhMinhChungBowieDick: anhBowieDick,
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
      toast.success("Mẻ ĐẠT! Đã chuyển dụng cụ sang Cấp phát và in nhãn lô.");
    } else toast.error("Mẻ KHÔNG ĐẠT — đã ghi nhận theo chính sách.");
    setStep("LIST");
    void fetchData();
  };

  const backToList = () => {
    setStep("LIST");
    void fetchData();
  };

  const openRowForProcess = (row: any) => {
    if (row.ket_qua_test === true || row.ket_qua_test === false) {
      toast.message("Mẻ đã kết thúc", {
        description: "Dùng báo cáo / kho để tra cứu theo mã lô hoặc mã QR bộ.",
      });
      return;
    }
    setActiveMe(row);
    setStep("PROCESS");
    setNguoiUnload("");
    setNhietDo("");
    setThongSoMay("");
    setChiThiTiepXuc("");
    setChiThiDaThongSo("");
    setTestSinhHoc("NA");
    setTestCI("");
    setTestBD("NA");
    setAnhMay("");
    setAnhTiepXuc("");
    setAnhDaThongSo("");
    setAnhSinhHoc("");
    setAnhBowieDick("");
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
    batchGate,
    waitingRows,
    items,
    nguoiUnload,
    setNguoiUnload,
    nhietDo,
    setNhietDo,
    thongSoMay,
    setThongSoMay,
    chiThiTiepXuc,
    setChiThiTiepXuc,
    chiThiDaThongSo,
    setChiThiDaThongSo,
    testSinhHoc,
    setTestSinhHoc,
    testCI,
    setTestCI,
    testBD,
    setTestBD,
    anhMay,
    setAnhMay,
    anhTiepXuc,
    setAnhTiepXuc,
    anhDaThongSo,
    setAnhDaThongSo,
    anhSinhHoc,
    setAnhSinhHoc,
    anhBowieDick,
    setAnhBowieDick,
    createMe,
    addItem,
    confirmBatDau,
    confirmKetThucChuTrinh,
    finishQc,
    backToList,
    openRowForProcess,
  };
}
