"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useCssdPrint } from "./use-cssd-print";
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
  nhapKetQuaBiMeTietKhuan,
} from "../actions/cssd.actions";
import { isMeMaLoScan } from "../lib/me-tiet-khuan-qc";
import {
  filterWaitingSetsForSlip,
  meQcDraftStorageKey,
  parseMeQcDraft,
  serializeMeQcDraft,
  type MeQcDraft,
} from "../lib/me-tiet-khuan-slip-ux";

import { usePermission } from "@/hooks/usePermission";
import { cssdSuCoIncidentJournalHref } from "@/lib/cssd-routes";
export function useMeTietKhuanWorkflow() {
  const { isPrinting: isCssdPrinting, printState, onPrintBatch } = useCssdPrint();
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
  const itemsRef = useRef<any[]>([]);
  const [nguoiUnload, setNguoiUnload] = useState("");

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (userData?.ho_ten) {
      if (!nguoiLoad) setNguoiLoad(userData.ho_ten);
      if (!nguoiUnload) setNguoiUnload(userData.ho_ten);
    }
  }, [userData, nguoiLoad, nguoiUnload]);
  const [chuongTrinh, setChuongTrinh] = useState("");
  const [nhietDo, setNhietDo] = useState("");
  const [apSuat, setApSuat] = useState("");
  const [thoiGianChuKy, setThoiGianChuKy] = useState("");
  const [thongSoVatLy, setThongSoVatLy] = useState<"DAT" | "KHONG_DAT" | "">("");
  const [ciNgoaiGoi, setCiNgoaiGoi] = useState<"DAT" | "KHONG_DAT" | "">("");
  const [ciPcd, setCiPcd] = useState<"DAT" | "KHONG_DAT" | "">("");
  const [trangThaiBi, setTrangThaiBi] = useState<"CHUA_CO" | "AM" | "DUONG" | "">("");
  const [confirmAsk, setConfirmAsk] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    danger?: boolean;
  } | null>(null);
  const confirmResolver = useRef<((ok: boolean) => void) | null>(null);
  const skipDraftSave = useRef(true);

  const qcDraft = useCallback((): MeQcDraft => ({
    chuongTrinh,
    nhietDo,
    apSuat,
    thoiGianChuKy,
    thongSoVatLy,
    ciNgoaiGoi,
    ciPcd,
    trangThaiBi,
  }), [chuongTrinh, nhietDo, apSuat, thoiGianChuKy, thongSoVatLy, ciNgoaiGoi, ciPcd, trangThaiBi]);

  const applyQcDraft = (draft: MeQcDraft) => {
    setChuongTrinh(draft.chuongTrinh);
    setNhietDo(draft.nhietDo);
    setApSuat(draft.apSuat);
    setThoiGianChuKy(draft.thoiGianChuKy);
    setThongSoVatLy(draft.thongSoVatLy);
    setCiNgoaiGoi(draft.ciNgoaiGoi);
    setCiPcd(draft.ciPcd);
    setTrangThaiBi(draft.trangThaiBi);
  };

  const resetQcFields = () => {
    setChuongTrinh("");
    setNhietDo("");
    setApSuat("");
    setThoiGianChuKy("");
    setThongSoVatLy("");
    setCiNgoaiGoi("");
    setCiPcd("");
    setTrangThaiBi("");
  };

  const askConfirm = (ask: { title: string; body: string; confirmLabel: string; danger?: boolean }) =>
    new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve;
      setConfirmAsk(ask);
    });

  const settleConfirm = (ok: boolean) => {
    const resolve = confirmResolver.current;
    confirmResolver.current = null;
    setConfirmAsk(null);
    resolve?.(ok);
  };

  const clearQcDraft = (batchId: string) => {
    try {
      localStorage.removeItem(meQcDraftStorageKey(batchId));
    } catch {
      /* trình duyệt chặn storage — nháp vẫn nằm trong state */
    }
  };

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
    const members = m.success ? ((m.data as any[]) || []) : itemsRef.current;
    if (m.success) setItems(members);
    else toast.error(m.error || "Không tải thành phần mẻ");
    if (w.success) {
      setWaitingRows(
        filterWaitingSetsForSlip((w.data as any[]) || [], {
          inSlipIds: members.map((row) => String(row?.id || "")),
          inSlipCodes: members.map((row) => String(row?.ma_vach_qr || "")),
        }),
      );
    } else toast.error(w.error || "Không tải danh sách chờ TK");
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

  useEffect(() => {
    const batchId = String(activeMe?.id || "").trim();
    if (step !== "PROCESS" || !batchId) return;
    skipDraftSave.current = true;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(meQcDraftStorageKey(batchId));
    } catch {
      raw = null;
    }
    const draft = parseMeQcDraft(raw);
    if (draft) applyQcDraft(draft);
    const timer = window.setTimeout(() => {
      skipDraftSave.current = false;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [step, activeMe?.id]);

  useEffect(() => {
    const batchId = String(activeMe?.id || "").trim();
    if (skipDraftSave.current || step !== "PROCESS" || !batchId) return;
    try {
      localStorage.setItem(meQcDraftStorageKey(batchId), serializeMeQcDraft(qcDraft()));
    } catch {
      /* nháp vẫn giữ trong state */
    }
  }, [step, activeMe?.id, qcDraft]);

  const createMe = async () => {
    if (!machineId || !nguoiLoad) return toast.error("Vui lòng chọn Máy và Người load");
    const r = await createCssdSterilizationBatch(machineId, nguoiLoad);
    if (!r.success) return toast.error(r.error);
    setActiveMe(r.data);
    setStep("PROCESS");
    setItems([]);
    setBatchGate(null);
    setWaitingRows([]);
    setChuongTrinh(String((r.data as { chuong_trinh?: string | null })?.chuong_trinh || ""));
    setNhietDo("");
    setApSuat("");
    setThoiGianChuKy("");
    setThongSoVatLy("");
    setCiNgoaiGoi("");
    setCiPcd("");
    setTrangThaiBi("");
  };

  const addItem = async (code: string) => {
    if (!activeMe?.id) return toast.error("Chưa có phiếu/mẻ đang mở");
    const raw = String(code || "").trim().toUpperCase();
    if (!raw) return;
    // Quét mã mẻ (LOT-*) khi đang PROCESS: xác nhận đúng phiếu, không coi là mã bộ.
    if (raw.startsWith("LOT-") || isMeMaLoScan(raw)) {
      const maLo = String(activeMe.ma_lo_tiet_khuan || "").trim().toUpperCase();
      if (maLo && raw === maLo) {
        toast.success("Đúng phiếu mẻ đang mở — tiếp tục quét mã bộ để nạp vào mẻ.");
        return;
      }
      toast.error("Đây là mã phiếu mẻ khác. Mở đúng mẻ từ danh sách, rồi quét mã bộ để nạp.");
      return;
    }
    const r = await addQuyTrinhToSterilizationBatch(activeMe.id, raw);
    if (!r.success) return toast.error(r.error);
    await reloadProcessContext();
    toast.success(`Đã thêm vào phiếu TK: ${"tenBo" in r ? r.tenBo : raw}`);
  };

  const assertBatchHeatAllows = async (batchId: string) => {
    const h = await fetchCssdBatchHeatRisk(batchId);
    if (!h.success) {
      toast.error(h.error || "Không kiểm tra được rủi ro nhiệt — đã chặn.");
      return false;
    }
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
    const ok = await askConfirm({
      title: "Bắt đầu chu trình",
      body: "Xác nhận bắt đầu tiệt khuẩn? Sau bước này không thể nạp thêm bộ vào mẻ.",
      confirmLabel: "Bắt đầu chu trình",
    });
    if (!ok) return;
    const r = await confirmBatDauTietKhuanBatch(activeMe.id);
    if (!r.success) return toast.error(r.error);
    toast.success("Đã chốt nạp — các bộ chuyển sang trạng thái đang tiệt khuẩn.");
    await reloadProcessContext();
  };

  const confirmKetThucChuTrinh = async () => {
    if (!activeMe?.id) return;
    const ok = await askConfirm({
      title: "Kết thúc",
      body: "Xác nhận đã kết thúc chu trình tiệt khuẩn trên máy? Form đánh giá sẽ mở.",
      confirmLabel: "Kết thúc",
    });
    if (!ok) return;
    const r = await confirmKetThucChuTrinhTietKhuan(activeMe.id);
    if (!r.success) return toast.error(r.error);
    toast.success("Đã mở form nhập thông số & đánh giá mẻ.");
    await reloadProcessContext();
  };

  const finishQc = async (isPass: boolean) => {
    if (!nguoiUnload) return toast.error("Thiếu người dỡ mẻ.");
    if (isPass && activeMe?.id && !(await assertBatchHeatAllows(activeMe.id))) return;

    const ok = await askConfirm(
      isPass
        ? {
            title: "Nhả mẻ",
            body: "Ghi nhận QC đạt? Nếu BI bắt buộc chưa có kết quả, mẻ chờ BI và bộ chưa sang kho vô khuẩn.",
            confirmLabel: "Nhả mẻ",
          }
        : {
            title: "Kết luận không đạt",
            body: "Kết luận không đạt — xác nhận?",
            confirmLabel: "Kết luận không đạt",
            danger: true,
          },
    );
    if (!ok) return;

    const saved = await finishCssdSterilizationBatch({
      activeMeId: activeMe.id,
      maLo: activeMe.ma_lo_tiet_khuan,
      isPass,
      nguoiUnload,
      chuongTrinh,
      nhietDo,
      apSuat,
      thoiGianChuKy,
      thongSoVatLy,
      ciNgoaiGoi,
      ciPcd,
      trangThaiBi,
      anhMinhChung: "",
    });
    if (!saved.success) return toast.error("Không lưu được mẻ: " + saved.error);
    clearQcDraft(activeMe.id);
    if (saved.outcome === "CHO_BI") {
      toast.message("Mẻ chờ kết quả BI. Bộ chưa sang kho vô khuẩn.");
      setStep("LIST");
      void fetchData();
      return;
    }
    if (saved.outcome === "HOAN_THANH") {
      void onPrintBatch({ batchId: activeMe.id });
      toast.success("Mẻ đã nhả. Bộ ở kho vô khuẩn.");
    } else {
      const created = saved.createdCount ?? 0;
      const skipped = saved.skippedCount ?? 0;
      const recalled = saved.recalledCount ?? 0;
      const held = saved.machineHeld;
      const listed = saved.listedUsed || [];
      const firstId = saved.incidentIds?.[0];
      const listedNames = listed.map((row) => row.maBo).filter(Boolean).join(", ");
      const extra = [
        recalled ? `Thu hồi ${recalled} bộ về Tiếp nhận` : "",
        held ? "máy tạm giữ để kiểm tra" : "",
        listed.length ? `${listed.length} bộ đã dùng chỉ liệt kê${listedNames ? `: ${listedNames}` : ""}` : "",
      ]
        .filter(Boolean)
        .join("; ");
      toast.error(
        skipped > 0
          ? `Mẻ không đạt — phiếu sự cố đã có, đã cập nhật thu hồi.${extra ? ` ${extra}.` : ""}`
          : `Mẻ không đạt — đã lập ${created} phiếu sự cố.${extra ? ` ${extra}.` : ""}`,
        {
          duration: 8000,
          action: firstId
            ? {
                label: "Xem nhật ký",
                onClick: () => {
                  window.location.href = cssdSuCoIncidentJournalHref(firstId);
                },
              }
            : undefined,
        },
      );
    }
    setStep("LIST");
    void fetchData();
  };

  const submitBi = async (ketQua: "AM" | "DUONG") => {
    if (!activeMe?.id) return;
    const ok = await askConfirm(
      ketQua === "AM"
        ? { title: "Nhả mẻ", body: "BI âm — nhả mẻ vào kho vô khuẩn?", confirmLabel: "Nhả mẻ" }
        : { title: "BI dương", body: "BI dương — lập sự cố và không nhả mẻ?", confirmLabel: "BI dương", danger: true },
    );
    if (!ok) return;
    const saved = await nhapKetQuaBiMeTietKhuan(activeMe.id, ketQua);
    if (!saved.success) return toast.error(saved.error || "Không lưu được kết quả BI.");
    clearQcDraft(activeMe.id);
    if (saved.outcome === "HOAN_THANH") toast.success("BI âm. Mẻ đã nhả.");
    else {
      const listed = saved.listedUsed || [];
      const names = listed.map((row) => row.maBo).filter(Boolean).join(", ");
      toast.error(
        `BI dương. Thu hồi ${saved.recalledCount || 0} bộ về Tiếp nhận.${
          listed.length ? ` ${listed.length} bộ đã dùng chỉ liệt kê${names ? `: ${names}` : ""}.` : ""
        }`,
      );
    }
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
    setChuongTrinh(String(row.chuong_trinh || ""));
    resetQcFields();
    if (row.chuong_trinh) setChuongTrinh(String(row.chuong_trinh));
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
    chuongTrinh,
    setChuongTrinh,
    nhietDo,
    setNhietDo,
    apSuat,
    setApSuat,
    thoiGianChuKy,
    setThoiGianChuKy,
    thongSoVatLy,
    setThongSoVatLy,
    ciNgoaiGoi,
    setCiNgoaiGoi,
    ciPcd,
    setCiPcd,
    trangThaiBi,
    setTrangThaiBi,
    confirmAsk,
    settleConfirm,
    createMe,
    addItem,
    confirmBatDau,
    confirmKetThucChuTrinh,
    finishQc,
    submitBi,
    backToList,
    openRowForProcess,
    printState,
    onPrintBatch,
    isCssdPrinting,
  };
}
