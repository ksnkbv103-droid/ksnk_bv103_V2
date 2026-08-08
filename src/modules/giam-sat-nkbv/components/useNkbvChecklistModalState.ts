"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import type {
  BsiVerificationData,
  VaeVerificationData,
  UtiVerificationData,
  SsiVerificationData,
  DepartmentStay
} from "@/modules/giam-sat-nkbv/types/nkbv-verification";
import {
  evaluateBsiClabsi,
  evaluateVaeVap,
  evaluateUtiCauti,
  evaluateSsi,
  type RuleEvaluationResult
} from "@/modules/giam-sat-nkbv/lib/nkbv-rules-engine";
import {
  submitClinicalVerification,
  approveOrExcludeNkbvCase,
  syncNkbvAdmissionDate,
} from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv-write.actions";
import { getNkbvBenhAnByMa } from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv-read.actions";
import { 
  prepopulateBsiData, 
  prepopulateVaeData, 
  prepopulateUtiData, 
  prepopulateSsiData 
} from "@/modules/giam-sat-nkbv/lib/nkbv-pathogen-rules";
import { calculateCdcMetrics, addDays } from "@/modules/giam-sat-nkbv/lib/nkbv-timeline-math";
import {
  nkbvClinicalFormPathway,
  suggestNkbvTypeFromSpecimen,
  type NkbvChecklistTypeCode,
} from "@/modules/giam-sat-nkbv/lib/nkbv-loai-labels";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

/** Legacy tab ids — form xác định ca dùng một màn; giữ type cho tương thích. */
export type NkbvChecklistTab = "LAM_SANG" | "KSNK";
export type NkbvSuspectedType = NkbvChecklistTypeCode;
export type NkbvActiveChecklistType = Exclude<NkbvChecklistTypeCode, "LOAI_TRU">;

export function useNkbvChecklistModalState({
  row,
  onClose,
  onSuccess,
  allowedEdit,
}: {
  row: Record<string, any>;
  onClose: () => void;
  onSuccess: () => void;
  allowedEdit: boolean;
}) {
  const rowRef = useRef(row);
  rowRef.current = row;
  const [submitting, setSubmitting] = useState(false);
  const [adjudicating, setAdjudicating] = useState(false);
  
  const [activeTab, setActiveTab] = useState<NkbvChecklistTab>("LAM_SANG");
  const [simulatedRole, setSimulatedRole] = useState<"KSNK" | "LAM_SANG">("LAM_SANG");

  const [treatmentHistory, setTreatmentHistory] = useState<DepartmentStay[]>([]);
  const [symptomDates, setSymptomDates] = useState<Record<string, string>>({});
  const [ghiChuTuyBien, setGhiChuTuyBien] = useState("");
  /** Ngày vào viện ưu tiên từ hồ sơ bệnh án (HAI/POA). */
  const [ngayVaoVienEffective, setNgayVaoVienEffective] = useState(() =>
    String(row.ngay_vao_vien || "").slice(0, 10),
  );
  const [benhAnLoaded, setBenhAnLoaded] = useState(false);
  const [benhAnMissing, setBenhAnMissing] = useState(false);

  const handleTabChange = (tab: NkbvChecklistTab) => {
    setActiveTab(tab);
    setSimulatedRole(tab);
  };

  const specimenSuggestion = useMemo(
    () =>
      suggestNkbvTypeFromSpecimen({
        loai_benh_pham: row.loai_benh_pham,
        vi_tri_nhiem_khuan: row.vi_tri_nhiem_khuan,
        loai_ma: row.loai_ma || row.loai_nkbv?.ma_loai,
      }),
    [row],
  );
  const suggestedType = specimenSuggestion.type;
  const suggestedReason = specimenSuggestion.reason;

  // Suspected infection type selected by user
  const [suspectedType, setSuspectedType] = useState<NkbvSuspectedType | null>(null);

  // Compute active checklist type for evaluation
  const checklistType = useMemo<NkbvActiveChecklistType>(() => {
    if (suspectedType && suspectedType !== "LOAI_TRU") return suspectedType;
    return "BSI";
  }, [suspectedType]);

  const clinicalPathway = useMemo(
    () => nkbvClinicalFormPathway(checklistType),
    [checklistType],
  );

  // States for each form
  const [bsiForm, setBsiForm] = useState<BsiVerificationData | null>(null);
  const [vaeForm, setVaeForm] = useState<VaeVerificationData | null>(null);
  const [utiForm, setUtiForm] = useState<UtiVerificationData | null>(null);
  const [ssiForm, setSsiForm] = useState<SsiVerificationData | null>(null);

  // Initialize suspectedType and prepopulate forms on mount
  useEffect(() => {
    // Gợi ý theo bệnh phẩm (đã xử lý mâu thuẫn loai_ma) — không ưu tiên SSI từ MDM lệch.
    setSuspectedType(suggestedType);

    const existing = row.verification_data || {};
    setSymptomDates(existing.symptom_dates || {});
    const notes =
      row.clinical_notes && typeof row.clinical_notes === "object" ? row.clinical_notes : {};
    setGhiChuTuyBien(
      String(
        (notes as { ghi_chu_tuy_bien?: string }).ghi_chu_tuy_bien ||
          existing.ghi_chu_tuy_bien ||
          "",
      ),
    );

    if (existing.treatment_history && existing.treatment_history.length > 0) {
      setTreatmentHistory(existing.treatment_history);
    } else {
      const defaultStay: DepartmentStay = {
        khoa_id: row.khoa_ghi_nhan_id || row.khoa_ghi_nhan?.id || "",
        ten_khoa: row.khoa_ghi_nhan?.ten_khoa || "Khoa hiện tại",
        ma_khoa: row.khoa_ghi_nhan?.ma_khoa,
        ngay_vao: row.ngay_vao_vien ? row.ngay_vao_vien.slice(0, 10) : "",
        ngay_ra: undefined,
      };
      setTreatmentHistory([defaultStay]);
    }

    setBsiForm(prepopulateBsiData(row, existing));
    setVaeForm(prepopulateVaeData(row, existing));
    setUtiForm(prepopulateUtiData(row, existing));
    setSsiForm(prepopulateSsiData(row, existing));
    setNgayVaoVienEffective(String(row.ngay_vao_vien || "").slice(0, 10));
    setBenhAnLoaded(false);
    setBenhAnMissing(false);
    // Identity = mốc BA (không đổi khi nháp → phiếu thật), tránh xóa dữ liệu đang nhập
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional identity
  }, [
    String((row as { _draft_milestone_id?: string })._draft_milestone_id || row.id),
    suggestedType,
  ]);

  useEffect(() => {
    const ma = String(row.ma_benh_an || "").trim();
    if (!ma) {
      setBenhAnMissing(true);
      setBenhAnLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await getNkbvBenhAnByMa(ma);
      if (cancelled) return;
      setBenhAnLoaded(true);
      if (!res.success || !res.data) {
        setBenhAnMissing(true);
        return;
      }
      setBenhAnMissing(false);
      const fromBa = String(res.data.ngay_vao_vien || "").slice(0, 10);
      if (fromBa) setNgayVaoVienEffective(fromBa);
    })();
    return () => {
      cancelled = true;
    };
  }, [row.ma_benh_an, row.id]);

  // Stay history handlers
  const handleAddStay = (newStay: DepartmentStay) => {
    const ngayVaoVien = row.ngay_vao_vien ? row.ngay_vao_vien.slice(0, 10) : "";
    if (ngayVaoVien && newStay.ngay_vao < ngayVaoVien) {
      toast.error(`Sai logic: Ngày vào khoa [${newStay.ngay_vao}] không thể trước Ngày nhập viện [${ngayVaoVien}]!`);
      return;
    }

    const tempHistory = [...treatmentHistory];

    // Tự động đóng ngày ra của khoa hiện tại nếu chưa có ngày ra và khoa mới bắt đầu sau đó
    const activeStayIdx = tempHistory.findIndex((s) => !s.ngay_ra);
    if (activeStayIdx !== -1) {
      const activeStay = tempHistory[activeStayIdx];
      if (newStay.ngay_vao > activeStay.ngay_vao) {
        tempHistory[activeStayIdx] = { ...activeStay, ngay_ra: newStay.ngay_vao };
      } else if (newStay.ngay_vao === activeStay.ngay_vao) {
        toast.error(`Sai logic: Đã có một khoa khác bắt đầu cùng ngày vào [${newStay.ngay_vao}]!`);
        return;
      }
    }

    // Kiểm tra trùng lặp hoặc chồng chéo thời gian (overlap)
    for (const stay of tempHistory) {
      const sIn = stay.ngay_vao;
      const sOut = stay.ngay_ra || "9999-12-31";
      const nIn = newStay.ngay_vao;
      const nOut = newStay.ngay_ra || "9999-12-31";

      if (Math.max(new Date(sIn).getTime(), new Date(nIn).getTime()) < Math.min(new Date(sOut).getTime(), new Date(nOut).getTime())) {
        toast.error(
          `Sai logic: Khoảng thời gian này chồng chéo với khoa [${formatKhoaCompactLabel(stay)}] (${stay.ngay_vao} -> ${stay.ngay_ra || "Hiện tại"})!`,
        );
        return;
      }
    }

    const updated = [...tempHistory, newStay].sort((a, b) => a.ngay_vao.localeCompare(b.ngay_vao));
    setTreatmentHistory(updated);
    toast.success("Đã thêm khoa điều trị vào lịch sử!");
  };

  const handleDeleteStay = (index: number) => {
    if (treatmentHistory.length <= 1) {
      toast.error("Phải có ít nhất một khoa điều trị!");
      return;
    }
    const updated = treatmentHistory.filter((_, i) => i !== index);
    setTreatmentHistory(updated);
    toast.success("Đã xóa khoa điều trị!");
  };

  // Live CDC mathematical calculations
  const liveCdcMetrics = useMemo(() => {
    const ngay_phat_hien = row.ngay_phat_hien ? row.ngay_phat_hien.slice(0, 10) : "";
    if (!ngay_phat_hien) return null;

    const activeForm =
      checklistType === "BSI"
        ? bsiForm
        : clinicalPathway === "VAE" || clinicalPathway === "PNEU"
          ? vaeForm
          : checklistType === "UTI"
            ? utiForm
            : ssiForm;

    if (!activeForm) return null;

    return calculateCdcMetrics({
      ngay_phat_hien,
      ngay_vao_vien: ngayVaoVienEffective || row.ngay_vao_vien || "",
      checklistType,
      activeForm,
      symptomDates,
      treatmentHistory,
    });
  }, [
    checklistType,
    clinicalPathway,
    bsiForm,
    vaeForm,
    utiForm,
    ssiForm,
    symptomDates,
    treatmentHistory,
    row,
    ngayVaoVienEffective,
  ]);

  const handleSyncAdmissionDate = async (next: string) => {
    const ngay = String(next || "").slice(0, 10);
    setNgayVaoVienEffective(ngay);
    if (!allowedEdit || !ngay) return;
    const ma = String(row.ma_benh_an || "").trim();
    if (!ma) {
      toast.error("Thiếu mã bệnh án — không đồng bộ được hồ sơ");
      return;
    }
    const res = await syncNkbvAdmissionDate({
      ma_benh_an: ma,
      su_kien_id: row.id ? String(row.id) : null,
      ngay_vao_vien: ngay,
    });
    if (!res.success) {
      toast.error(res.error || "Không lưu được ngày vào viện");
      return;
    }
    toast.success("Đã đồng bộ ngày vào viện vào hồ sơ bệnh án");
  };

  // Live rules engine evaluation preview
  const liveEvaluation = useMemo<RuleEvaluationResult>(() => {
    try {
      if (checklistType === "BSI" && bsiForm) {
        const enrichedForm = {
          ...bsiForm,
          cvc_placed_days: liveCdcMetrics?.device_placed_days ?? bsiForm.cvc_placed_days,
          cvc_active_on_event: liveCdcMetrics?.device_active_on_event ?? bsiForm.cvc_active_on_event,
        };
        return evaluateBsiClabsi(enrichedForm);
      } else if (clinicalPathway === "VAE" && vaeForm) {
        const enrichedForm = {
          ...vaeForm,
          vent_days: liveCdcMetrics?.device_placed_days ?? vaeForm.vent_days,
        };
        return evaluateVaeVap(enrichedForm, "VAE");
      } else if (clinicalPathway === "PNEU" && vaeForm) {
        const enrichedForm = {
          ...vaeForm,
          vent_days: liveCdcMetrics?.device_placed_days ?? vaeForm.vent_days,
        };
        return evaluateVaeVap(enrichedForm, "PNEU");
      } else if (checklistType === "UTI" && utiForm) {
        const enrichedForm = {
          ...utiForm,
          foley_placed_days: liveCdcMetrics?.device_placed_days ?? utiForm.foley_placed_days,
          foley_active_on_event: liveCdcMetrics?.device_active_on_event ?? utiForm.foley_active_on_event,
        };
        return evaluateUtiCauti(enrichedForm);
      } else if (checklistType === "SSI" && ssiForm) {
        return evaluateSsi(ssiForm);
      }
    } catch {
      // fail-safe
    }
    return { is_positive: false, classification: "ERROR", reason: "Chưa đủ dữ liệu để tính toán." };
  }, [checklistType, clinicalPathway, bsiForm, vaeForm, utiForm, ssiForm, liveCdcMetrics]);

  // Save / Submit checklist
  const handleSaveChecklist = async () => {
    if (!allowedEdit) {
      toast.error("Bạn không có quyền thực hiện chức năng này!");
      return;
    }

    const activePayload =
      suspectedType === "LOAI_TRU"
        ? { clinical_notes: { ly_do_loai_tru: "Bác sĩ phán quyết loại trừ ca bệnh." } }
        : checklistType === "BSI"
          ? bsiForm
          : clinicalPathway === "VAE" || clinicalPathway === "PNEU"
            ? vaeForm
            : checklistType === "UTI"
              ? utiForm
              : ssiForm;

    if (!activePayload) {
      toast.error("Biểu mẫu chưa được khởi tạo!");
      return;
    }

    if (suspectedType === "LOAI_TRU") {
      setSubmitting(true);
      try {
        const res = await submitClinicalVerification(String(rowRef.current.id), "LOAI_TRU", {
          ...activePayload,
          clinical_notes: {
            ...((activePayload as any).clinical_notes || {}),
            ly_do_loai_tru:
              ghiChuTuyBien.trim() ||
              (activePayload as any).clinical_notes?.ly_do_loai_tru ||
              "Bác sĩ phán quyết loại trừ ca bệnh.",
            ghi_chu_tuy_bien: ghiChuTuyBien.trim() || undefined,
          },
          ghi_chu_tuy_bien: ghiChuTuyBien.trim() || undefined,
        });
        if (res.success) {
          toast.success("Đã lưu phán quyết loại trừ ca bệnh thành công!");
          onSuccess();
          onClose();
        } else {
          toast.error(res.error || "Lỗi loại trừ ca bệnh");
        }
      } catch (e: any) {
        toast.error(e.message || "Lỗi lưu loại trừ");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // --- KHUNG KIỂM SOÁT NHẬP LIỆU CHẶT CHẼ ---
    const ngayPhatHien = row.ngay_phat_hien ? row.ngay_phat_hien.slice(0, 10) : "";
    const khoaGhiNhanId = row.khoa_ghi_nhan_id || row.khoa_ghi_nhan?.id || "";
    const khoaGhiNhanLabel = formatKhoaCompactLabel({
      ma_khoa: row.khoa_ghi_nhan?.ma_khoa,
      ten_khoa: row.khoa_ghi_nhan?.ten_khoa || "khoa ghi nhận xét nghiệm",
    });

    // 1. Kiểm tra chỉ định xét nghiệm vs Lịch sử nằm khoa
    if (ngayPhatHien && khoaGhiNhanId) {
      const hasReportingWardStay = treatmentHistory.some(s => s.khoa_id === khoaGhiNhanId);
      if (!hasReportingWardStay) {
        toast.error(`Lỗi logic nhập liệu: Phiếu xét nghiệm được ghi nhận tại khoa [${khoaGhiNhanLabel}] vào ngày [${ngayPhatHien}], nhưng trong lịch sử điều trị của bệnh nhân không hề có khoa này! Vui lòng bổ sung.`);
        return;
      }

      // Xác định khoa bệnh nhân đang nằm vào ngày xét nghiệm
      const stayAtTestDate = treatmentHistory.find(s => {
        const v = s.ngay_vao;
        const r = s.ngay_ra || "9999-12-31";
        return ngayPhatHien >= v && ngayPhatHien <= r;
      });

      if (stayAtTestDate && stayAtTestDate.khoa_id !== khoaGhiNhanId) {
        const index = treatmentHistory.findIndex(s => s.khoa_id === stayAtTestDate.khoa_id);
        const prevStay = index > 0 ? treatmentHistory[index - 1] : null;

        const isTransferDay = stayAtTestDate.ngay_vao === ngayPhatHien;
        const isDayAfterTransfer = stayAtTestDate.ngay_vao === addDays(ngayPhatHien, 1);

        const isValidTransfer = (isTransferDay || isDayAfterTransfer) && prevStay?.khoa_id === khoaGhiNhanId;
        if (!isValidTransfer) {
          toast.error(
            `Lỗi logic nhập liệu: Ngày xét nghiệm (${ngayPhatHien}) thuộc khoa [${khoaGhiNhanLabel}] nhưng lịch sử nằm viện hiển thị bệnh nhân đang nằm điều trị tại khoa [${formatKhoaCompactLabel(stayAtTestDate)}]. Vui lòng điều chỉnh lại cho chính xác.`,
          );
          return;
        }
      }
    }

    // 2. Kiểm tra chéo ngày đặt/rút thiết bị xâm lấn
    const dpDate = (activePayload as any).device_placed_date;
    const drDate = (activePayload as any).device_removed_date;
    const ngayVaoVien = row.ngay_vao_vien ? row.ngay_vao_vien.slice(0, 10) : "";

    if (dpDate) {
      if (ngayVaoVien && dpDate < ngayVaoVien) {
        toast.error(`Lỗi logic thiết bị: Ngày đặt [${dpDate}] không thể trước Ngày nhập viện [${ngayVaoVien}]!`);
        return;
      }
      if (ngayPhatHien && dpDate > ngayPhatHien) {
        toast.error(`Lỗi logic thiết bị: Ngày đặt [${dpDate}] không thể sau Ngày xét nghiệm phát hiện [${ngayPhatHien}]!`);
        return;
      }
      if (drDate) {
        if (drDate < dpDate) {
          toast.error(`Lỗi logic thiết bị: Ngày rút [${drDate}] không thể trước Ngày đặt [${dpDate}]!`);
          return;
        }
        const todayStr = new Date().toISOString().slice(0, 10);
        if (drDate > todayStr) {
          toast.error(`Lỗi logic thiết bị: Ngày rút [${drDate}] không thể ở tương lai!`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const mergedPayload = {
        ...activePayload,
        treatment_history: treatmentHistory,
        symptom_dates: symptomDates,
        ghi_chu_tuy_bien: ghiChuTuyBien.trim() || undefined,
        calculated_doe: liveCdcMetrics?.doe,
        calculated_iwp_start: liveCdcMetrics?.iwp_start,
        calculated_iwp_end: liveCdcMetrics?.iwp_end,
        calculated_sbap_start: liveCdcMetrics?.sbap_start,
        calculated_sbap_end: liveCdcMetrics?.sbap_end,
        attributed_khoa_id: liveCdcMetrics?.attributedStay?.khoa_id || row.khoa_ghi_nhan_id || "",
        attributed_khoa_name: formatKhoaCompactLabel(
          liveCdcMetrics?.attributedStay || {
            ma_khoa: row.khoa_ghi_nhan?.ma_khoa,
            ten_khoa: row.khoa_ghi_nhan?.ten_khoa,
          },
        ),
        hai_status: liveCdcMetrics?.haiStatus,
        
        ...(checklistType === 'BSI' && {
          cvc_placed_days: liveCdcMetrics?.device_placed_days || 0,
          cvc_active_on_event: liveCdcMetrics?.device_active_on_event || false,
        }),
        ...(checklistType === 'UTI' && {
          foley_placed_days: liveCdcMetrics?.device_placed_days || 0,
          foley_active_on_event: liveCdcMetrics?.device_active_on_event || false,
        }),
        ...(checklistType === "VAE" || checklistType === "VAP" || checklistType === "HAP"
          ? { vent_days: liveCdcMetrics?.device_placed_days || 0 }
          : {}),
      };

      const res = await submitClinicalVerification(
        String(rowRef.current.id),
        suspectedType || checklistType,
        mergedPayload,
      );
      if (res.success) {
        toast.success(`Đã lưu checklist lâm sàng! Đề xuất CDC: ${res.evaluation?.classification} (${res.evaluation?.is_positive ? 'Dương tính' : 'Âm tính'})`);
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Gặp lỗi khi lưu checklist");
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi lưu xác minh");
    } finally {
      setSubmitting(false);
    }
  };

  // KSNK Adjudication (Approve or Exclude)
  const handleAdjudicate = async (decision: "APPROVE" | "EXCLUDE", reason?: string) => {
    setAdjudicating(true);
    try {
      const res = await approveOrExcludeNkbvCase(String(rowRef.current.id), decision, reason);
      if (res.success) {
        toast.success(decision === "APPROVE" ? "Đã phê duyệt ca bệnh NKBV chính thức!" : "Đã từ chối/loại trừ ca bệnh khỏi thống kê.");
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Gặp lỗi khi lưu quyết định thẩm định");
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi cập nhật thẩm định");
    } finally {
      setAdjudicating(false);
    }
  };

  return {
    submitting,
    adjudicating,
    activeTab,
    simulatedRole,
    handleTabChange,
    treatmentHistory,
    symptomDates,
    setSymptomDates,
    ghiChuTuyBien,
    setGhiChuTuyBien,
    suggestedType,
    suggestedReason,
    suspectedType,
    setSuspectedType,
    checklistType,
    clinicalPathway,
    bsiForm,
    setBsiForm,
    vaeForm,
    setVaeForm,
    utiForm,
    setUtiForm,
    ssiForm,
    setSsiForm,
    handleAddStay,
    handleDeleteStay,
    liveCdcMetrics,
    liveEvaluation,
    handleSaveChecklist,
    handleAdjudicate,
    ngayVaoVienEffective,
    setNgayVaoVienEffective,
    handleSyncAdmissionDate,
    benhAnLoaded,
    benhAnMissing,
  };
}
