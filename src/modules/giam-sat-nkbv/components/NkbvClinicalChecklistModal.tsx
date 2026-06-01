"use client";

import React, { useEffect, useState, useMemo } from "react";
import { X, CheckCircle, HelpCircle, ShieldAlert, FileText, Ban } from "lucide-react";
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
import { submitClinicalVerification, approveOrExcludeNkbvCase } from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv-write.actions";
import { 
  prepopulateBsiData, 
  prepopulateVaeData, 
  prepopulateUtiData, 
  prepopulateSsiData 
} from "@/modules/giam-sat-nkbv/lib/nkbv-pathogen-rules";
import { calculateCdcMetrics, addDays } from "@/modules/giam-sat-nkbv/lib/nkbv-timeline-math";
import BsiClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/BsiClinicalSubForm";
import UtiClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/UtiClinicalSubForm";
import PneuClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/PneuClinicalSubForm";
import VaeClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/VaeClinicalSubForm";
import SsiClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/SsiClinicalSubForm";
import NkbvStayHistoryTable from "@/modules/giam-sat-nkbv/components/NkbvStayHistoryTable";
import NkbvCdcMetricsPanel from "@/modules/giam-sat-nkbv/components/NkbvCdcMetricsPanel";
import NkbvAdjudicationPanel from "@/modules/giam-sat-nkbv/components/NkbvAdjudicationPanel";

export type NkbvClinicalChecklistModalProps = {
  row: Record<string, any>;
  onClose: () => void;
  onSuccess: () => void;
  allowedEdit: boolean;
  khoas?: Array<{ id: string; ten_danh_muc: string }>;
};

export default function NkbvClinicalChecklistModal({
  row,
  onClose,
  onSuccess,
  allowedEdit,
  khoas = [],
}: NkbvClinicalChecklistModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [adjudicating, setAdjudicating] = useState(false);
  
  // Tab-based roles workflow
  const [activeTab, setActiveTab] = useState<'VI_SINH' | 'LAM_SANG' | 'KSNK'>('VI_SINH');
  const [simulatedRole, setSimulatedRole] = useState<'KSNK' | 'LAM_SANG' | 'VI_SINH'>('VI_SINH');

  // States
  const [treatmentHistory, setTreatmentHistory] = useState<DepartmentStay[]>([]);
  const [symptomDates, setSymptomDates] = useState<Record<string, string>>({});

  const handleTabChange = (tab: 'VI_SINH' | 'LAM_SANG' | 'KSNK') => {
    setActiveTab(tab);
    setSimulatedRole(tab);
  };

  // Smart suspected infection type guessing
  const suggestedType = useMemo<'BSI' | 'VAE' | 'UTI' | 'SSI' | 'LOAI_TRU'>(() => {
    const specimen = String(row.loai_benh_pham || "").toLowerCase();
    const viTri = String(row.vi_tri_nhiem_khuan || "").toLowerCase();
    const typeCode = String(row.loai_ma || row.loai_nkbv?.ma_loai || "").toUpperCase();

    if (typeCode.includes("CLABSI") || typeCode.includes("BSI") || viTri === "máu") return "BSI";
    if (typeCode.includes("VAP") || typeCode.includes("VAE") || typeCode.includes("PNEU") || viTri === "đường hô hấp" || viTri === "phổi") return "VAE";
    if (typeCode.includes("UTI") || typeCode.includes("CAUTI") || viTri === "đường tiết niệu") return "UTI";
    if (typeCode.includes("SSI") || viTri === "vết mổ") return "SSI";

    if (specimen.includes("nước tiểu") || specimen.includes("urine") || specimen.includes("niệu")) return "UTI";
    if (specimen.includes("máu") || specimen.includes("blood") || specimen.includes("cvc")) return "BSI";
    if (specimen.includes("đờm") || specimen.includes("sputum") || specimen.includes("phế quản") || specimen.includes("bal") || specimen.includes("eta") || specimen.includes("phổi")) return "VAE";
    if (specimen.includes("vết mổ") || specimen.includes("pus") || specimen.includes("mủ") || specimen.includes("mổ") || specimen.includes("vết thương")) return "SSI";

    return "BSI";
  }, [row]);

  // Suspected infection type selected by user
  const [suspectedType, setSuspectedType] = useState<'BSI' | 'VAE' | 'UTI' | 'SSI' | 'LOAI_TRU' | null>(null);

  // Compute active checklist type for evaluation
  const checklistType = useMemo<'BSI' | 'VAE' | 'UTI' | 'SSI'>(() => {
    if (suspectedType && suspectedType !== 'LOAI_TRU') return suspectedType;
    return "BSI";
  }, [suspectedType]);

  // States for each form
  const [bsiForm, setBsiForm] = useState<BsiVerificationData | null>(null);
  const [vaeForm, setVaeForm] = useState<VaeVerificationData | null>(null);
  const [utiForm, setUtiForm] = useState<UtiVerificationData | null>(null);
  const [ssiForm, setSsiForm] = useState<SsiVerificationData | null>(null);

  // Initialize suspectedType and prepopulate forms on mount
  useEffect(() => {
    const typeCode = String(row.loai_ma || row.loai_nkbv?.ma_loai || "").toUpperCase();
    let initialType: 'BSI' | 'VAE' | 'UTI' | 'SSI' | 'LOAI_TRU' = suggestedType;
    if (typeCode.includes("CLABSI") || typeCode.includes("BSI")) initialType = "BSI";
    else if (typeCode.includes("VAP") || typeCode.includes("VAE") || typeCode.includes("PNEU")) initialType = "VAE";
    else if (typeCode.includes("UTI") || typeCode.includes("CAUTI")) initialType = "UTI";
    else if (typeCode.includes("SSI")) initialType = "SSI";

    setSuspectedType(initialType);

    const existing = row.verification_data || {};
    setSymptomDates(existing.symptom_dates || {});
    
    if (existing.treatment_history && existing.treatment_history.length > 0) {
      setTreatmentHistory(existing.treatment_history);
    } else {
      const defaultStay: DepartmentStay = {
        khoa_id: row.khoa_ghi_nhan_id || row.khoa_ghi_nhan?.id || "",
        ten_khoa: row.khoa_ghi_nhan?.ten_khoa || "Khoa hiện tại",
        ngay_vao: row.ngay_vao_vien ? row.ngay_vao_vien.slice(0, 10) : "",
        ngay_ra: undefined,
      };
      setTreatmentHistory([defaultStay]);
    }

    setBsiForm(prepopulateBsiData(row, existing));
    setVaeForm(prepopulateVaeData(row, existing));
    setUtiForm(prepopulateUtiData(row, existing));
    setSsiForm(prepopulateSsiData(row, existing));
  }, [row, suggestedType]);

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
        toast.error(`Sai logic: Khoảng thời gian này chồng chéo với khoa [${stay.ten_khoa}] (${stay.ngay_vao} -> ${stay.ngay_ra || "Hiện tại"})!`);
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
      checklistType === "BSI" ? bsiForm :
      checklistType === "VAE" ? vaeForm :
      checklistType === "UTI" ? utiForm :
      ssiForm;

    if (!activeForm) return null;

    return calculateCdcMetrics({
      ngay_phat_hien,
      ngay_vao_vien: row.ngay_vao_vien || "",
      checklistType,
      activeForm,
      symptomDates,
      treatmentHistory,
    });
  }, [checklistType, bsiForm, vaeForm, utiForm, ssiForm, symptomDates, treatmentHistory, row]);

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
      } else if (checklistType === "VAE" && vaeForm) {
        const enrichedForm = {
          ...vaeForm,
          vent_days: liveCdcMetrics?.device_placed_days ?? vaeForm.vent_days,
        };
        return evaluateVaeVap(enrichedForm);
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
    } catch (e) {
      // fail-safe
    }
    return { is_positive: false, classification: "ERROR", reason: "Chưa đủ dữ liệu để tính toán." };
  }, [checklistType, bsiForm, vaeForm, utiForm, ssiForm, liveCdcMetrics]);

  // Save / Submit checklist
  const handleSaveChecklist = async () => {
    if (!allowedEdit) {
      toast.error("Bạn không có quyền thực hiện chức năng này!");
      return;
    }

    const activePayload = 
      suspectedType === "LOAI_TRU" ? { clinical_notes: { ly_do_loai_tru: "Bác sĩ phán quyết loại trừ ca bệnh." } } :
      checklistType === "BSI" ? bsiForm :
      checklistType === "VAE" ? vaeForm :
      checklistType === "UTI" ? utiForm :
      ssiForm;

    if (!activePayload) {
      toast.error("Biểu mẫu chưa được khởi tạo!");
      return;
    }

    if (suspectedType === "LOAI_TRU") {
      setSubmitting(true);
      try {
        const res = await submitClinicalVerification(String(row.id), "LOAI_TRU", activePayload);
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
    const khoaGhiNhanTen = row.khoa_ghi_nhan?.ten_khoa || "khoa ghi nhận xét nghiệm";

    // 1. Kiểm tra chỉ định xét nghiệm vs Lịch sử nằm khoa
    if (ngayPhatHien && khoaGhiNhanId) {
      const hasReportingWardStay = treatmentHistory.some(s => s.khoa_id === khoaGhiNhanId);
      if (!hasReportingWardStay) {
        toast.error(`Lỗi logic nhập liệu: Phiếu xét nghiệm được ghi nhận tại khoa [${khoaGhiNhanTen}] vào ngày [${ngayPhatHien}], nhưng trong lịch sử điều trị của bệnh nhân không hề có khoa này! Vui lòng bổ sung.`);
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
          toast.error(`Lỗi logic nhập liệu: Ngày xét nghiệm (${ngayPhatHien}) thuộc khoa [${khoaGhiNhanTen}] nhưng lịch sử nằm viện hiển thị bệnh nhân đang nằm điều trị tại khoa [${stayAtTestDate.ten_khoa}]. Vui lòng điều chỉnh lại cho chính xác.`);
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
        calculated_doe: liveCdcMetrics?.doe,
        calculated_iwp_start: liveCdcMetrics?.iwp_start,
        calculated_iwp_end: liveCdcMetrics?.iwp_end,
        calculated_sbap_start: liveCdcMetrics?.sbap_start,
        calculated_sbap_end: liveCdcMetrics?.sbap_end,
        attributed_khoa_id: liveCdcMetrics?.attributedStay?.khoa_id || row.khoa_ghi_nhan_id || "",
        attributed_khoa_name: liveCdcMetrics?.attributedStay?.ten_khoa || row.khoa_ghi_nhan?.ten_khoa || "",
        hai_status: liveCdcMetrics?.haiStatus,
        
        ...(checklistType === 'BSI' && {
          cvc_placed_days: liveCdcMetrics?.device_placed_days || 0,
          cvc_active_on_event: liveCdcMetrics?.device_active_on_event || false,
        }),
        ...(checklistType === 'UTI' && {
          foley_placed_days: liveCdcMetrics?.device_placed_days || 0,
          foley_active_on_event: liveCdcMetrics?.device_active_on_event || false,
        }),
        ...(checklistType === 'VAE' && {
          vent_days: liveCdcMetrics?.device_placed_days || 0,
        }),
      };

      const res = await submitClinicalVerification(String(row.id), suspectedType || checklistType, mergedPayload);
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
      const res = await approveOrExcludeNkbvCase(String(row.id), decision, reason);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-5xl rounded-[32px] border border-slate-100 bg-white p-6 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-50 transition"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title & Case Header Summary */}
        <div className="border-b border-slate-100 pb-4 pr-10">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black uppercase tracking-tight text-[#026f17] flex items-center gap-1.5">
              <FileText className="h-6 w-6" />
              Thẩm định triệu chứng lâm sàng (CDC/NHSN 2023)
            </h2>
            <span className="rounded-full bg-[#026f17]/10 px-3 py-1 text-[10px] font-black uppercase text-[#026f17]">
              Mẫu {checklistType}
            </span>
          </div>

          {/* Quick patient data banner */}
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 text-xs bg-slate-50 rounded-2xl p-3 border border-slate-100">
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[9px]">Mã ca / Mã BN</span>
              <strong className="text-slate-800">{String(row.ma_ca || "")}</strong> / <strong className="text-slate-600">{String(row.ma_benh_nhan || "—")}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[9px]">Họ tên bệnh nhân</span>
              <strong className="text-slate-800">{String(row.ho_ten_benh_nhan || "—")}</strong>
              <span className="text-[10px] text-slate-400"> {row.gioi_tinh ? `(${row.gioi_tinh})` : ""}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[9px]">Ngày phát hiện (LIS Culture)</span>
              <strong className="text-slate-800">{row.ngay_phat_hien ? new Date(row.ngay_phat_hien).toLocaleDateString("vi-VN") : "—"}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[9px]">Cấy vi sinh dương tính</span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700 font-mono italic">
                {String(row.tac_nhan_vi_khuan || "Chưa xác định")}
              </span>
            </div>
          </div>

          {/* Role-based Workflow Tabs Header */}
          <div className="mt-4 border-b border-slate-100 flex gap-1 bg-slate-50 rounded-2xl p-1 border border-slate-200">
            {[
              { id: 'VI_SINH', label: '🔬 1. KHOA VI SINH', desc: 'Copy LIS, cấy nấm, CFU...' },
              { id: 'LAM_SANG', label: '🥼 2. KHOA LÂM SÀNG', desc: 'Đặt sonde, history, triệu chứng...' },
              { id: 'KSNK', label: '👥 3. PHÁN QUYẾT KSNK', desc: 'Timeline, thẩm định, chốt ca...' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex-1 text-left pb-2 pt-1.5 px-4 rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-[#026f17] text-white font-black shadow-md shadow-[#026f17]/25'
                    : 'text-slate-655 hover:text-slate-800 hover:bg-white'
                }`}
              >
                <div className="text-[11px] font-black uppercase tracking-wider">{tab.label}</div>
                <div className={`text-[9px] font-bold mt-0.5 ${activeTab === tab.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {tab.desc}
                </div>
              </button>
            ))}
          </div>

          {/* Clinical Suspected Infection Selector (Phán quyết mẫu cấy) */}
          <div className="mt-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-3.5 space-y-2.5 shadow-sm shadow-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#026f17] flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-[#026f17]" />
                Phán quyết Dịch tễ: Xác định loại nhiễm khuẩn nghi ngờ
              </span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full">
                💡 Gợi ý hệ thống: {suggestedType}
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'UTI', label: '🚰 Tiết niệu (UTI)', color: 'border-blue-200 hover:bg-blue-50/50 text-blue-900 bg-blue-50/10' },
                { id: 'VAE', label: '🫁 Hô hấp (VAE/PNEU)', color: 'border-purple-200 hover:bg-purple-50/50 text-purple-900 bg-purple-50/10' },
                { id: 'BSI', label: '💉 Huyết (BSI/CLABSI)', color: 'border-rose-200 hover:bg-rose-50/50 text-rose-900 bg-rose-50/10' },
                { id: 'SSI', label: '✂️ Vết mổ (SSI)', color: 'border-amber-200 hover:bg-amber-50/50 text-amber-900 bg-amber-50/10' },
                { id: 'LOAI_TRU', label: '🚫 Loại trừ / Không', color: 'border-slate-200 hover:bg-slate-50/50 text-slate-900 bg-slate-50/10' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!allowedEdit || simulatedRole === 'VI_SINH'}
                  onClick={() => setSuspectedType(item.id as any)}
                  className={`border rounded-xl py-2 px-1 text-[11px] font-bold tracking-tight text-center transition-all duration-200 ${
                    suspectedType === item.id 
                      ? 'border-[#026f17] bg-white text-[#026f17] font-black shadow-sm ring-2 ring-emerald-500/10 scale-[1.02]'
                      : `${item.color} opacity-80 hover:opacity-100`
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Body Content based on Tabs */}
        <div className="flex-1 overflow-y-auto py-4 pr-1">
          
          {/* TAB 1: KHOA VI SINH */}
          {activeTab === 'VI_SINH' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-3xl flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-[#026f17] mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase">Yêu cầu đối với Khoa Vi Sinh</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed font-semibold">
                    Nhập kết quả cấy vi sinh từ LIS hoặc Dropdown. Hệ thống sẽ tự động lọc bỏ nấm Candida (đối với UTI) và mẫu cấy bị tạp nhiễm &gt; 2 chủng trước khi cho phép lâm sàng nhập liệu.
                  </p>
                </div>
              </div>

              <div className="max-w-3xl mx-auto space-y-4">
                {suspectedType === "LOAI_TRU" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center space-y-2">
                    <Ban className="h-10 w-10 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-black text-slate-700">CA BỆNH ĐÃ ĐƯỢC CHỌN LOẠI TRỪ VÌ KHÔNG ĐẠT TIÊU CHUẨN NKBV</h4>
                  </div>
                )}

                {suspectedType !== "LOAI_TRU" && checklistType === "BSI" && bsiForm && (
                  <BsiClinicalSubForm
                    form={bsiForm}
                    onChange={setBsiForm}
                    symptomDates={symptomDates}
                    onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                    allowedEdit={allowedEdit && (simulatedRole === 'VI_SINH' || simulatedRole === 'KSNK')}
                    liveDeviceDays={liveCdcMetrics?.device_placed_days}
                    liveDeviceActive={liveCdcMetrics?.device_active_on_event}
                    ngayVaoVien={row.ngay_vao_vien}
                    ngayPhatHien={row.ngay_phat_hien}
                    iwpStart={liveCdcMetrics?.iwp_start}
                    iwpEnd={liveCdcMetrics?.iwp_end}
                    activeTab="VI_SINH"
                  />
                )}

                {suspectedType !== "LOAI_TRU" && checklistType === "VAE" && vaeForm && (
                  <>
                    {vaeForm.patient_age >= 18 && vaeForm.vent_days >= 4 ? (
                      <VaeClinicalSubForm
                        form={vaeForm}
                        onChange={setVaeForm}
                        symptomDates={symptomDates}
                        onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                        allowedEdit={allowedEdit && (simulatedRole === 'VI_SINH' || simulatedRole === 'KSNK')}
                        liveDeviceDays={liveCdcMetrics?.device_placed_days}
                        ngayVaoVien={row.ngay_vao_vien}
                        ngayPhatHien={row.ngay_phat_hien}
                        iwpStart={liveCdcMetrics?.iwp_start}
                        iwpEnd={liveCdcMetrics?.iwp_end}
                        activeTab="VI_SINH"
                      />
                    ) : (
                      <PneuClinicalSubForm
                        form={vaeForm}
                        onChange={setVaeForm}
                        symptomDates={symptomDates}
                        onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                        allowedEdit={allowedEdit && (simulatedRole === 'VI_SINH' || simulatedRole === 'KSNK')}
                        ngayVaoVien={row.ngay_vao_vien}
                        ngayPhatHien={row.ngay_phat_hien}
                        iwpStart={liveCdcMetrics?.iwp_start}
                        iwpEnd={liveCdcMetrics?.iwp_end}
                        activeTab="VI_SINH"
                      />
                    )}
                  </>
                )}

                {suspectedType !== "LOAI_TRU" && checklistType === "UTI" && utiForm && (
                  <UtiClinicalSubForm
                    form={utiForm}
                    onChange={setUtiForm}
                    symptomDates={symptomDates}
                    onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                    allowedEdit={allowedEdit && (simulatedRole === 'VI_SINH' || simulatedRole === 'KSNK')}
                    liveDeviceDays={liveCdcMetrics?.device_placed_days}
                    liveDeviceActive={liveCdcMetrics?.device_active_on_event}
                    ngayVaoVien={row.ngay_vao_vien}
                    ngayPhatHien={row.ngay_phat_hien}
                    iwpStart={liveCdcMetrics?.iwp_start}
                    iwpEnd={liveCdcMetrics?.iwp_end}
                    activeTab="VI_SINH"
                  />
                )}

                {suspectedType !== "LOAI_TRU" && checklistType === "SSI" && ssiForm && (
                  <SsiClinicalSubForm
                    form={ssiForm}
                    onChange={setSsiForm}
                    symptomDates={symptomDates}
                    onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                    allowedEdit={allowedEdit && (simulatedRole === 'VI_SINH' || simulatedRole === 'KSNK')}
                    ngayVaoVien={row.ngay_vao_vien}
                    ngayPhatHien={row.ngay_phat_hien}
                    iwpStart={liveCdcMetrics?.iwp_start}
                    iwpEnd={liveCdcMetrics?.iwp_end}
                    activeTab="VI_SINH"
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 2: KHOA LÂM SÀNG */}
          {activeTab === 'LAM_SANG' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              {/* Left Part: Stay history (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">🏥 Lịch sử chuyển khoa điều trị (LOA/POA)</span>
                <NkbvStayHistoryTable
                  treatmentHistory={treatmentHistory}
                  onAddStay={handleAddStay}
                  onDeleteStay={handleDeleteStay}
                  khoas={khoas}
                  allowedEdit={allowedEdit && (simulatedRole === 'LAM_SANG' || simulatedRole === 'KSNK')}
                  ngayVaoVien={row.ngay_vao_vien}
                  ngayPhatHien={row.ngay_phat_hien}
                />
              </div>

              {/* Right Part: Device & Symptoms Checklist (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">🥼 Khai báo triệu chứng & Thiết bị</span>
                
                {suspectedType === "LOAI_TRU" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center space-y-2">
                    <Ban className="h-10 w-10 text-slate-400 mx-auto animate-pulse" />
                    <h4 className="text-xs font-black text-slate-700">ĐÃ CHỌN PHÁN QUYẾT LOẠI TRỪ</h4>
                  </div>
                )}

                {suspectedType !== "LOAI_TRU" && checklistType === "BSI" && bsiForm && (
                  <BsiClinicalSubForm
                    form={bsiForm}
                    onChange={setBsiForm}
                    symptomDates={symptomDates}
                    onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                    allowedEdit={allowedEdit && (simulatedRole === 'LAM_SANG' || simulatedRole === 'KSNK')}
                    liveDeviceDays={liveCdcMetrics?.device_placed_days}
                    liveDeviceActive={liveCdcMetrics?.device_active_on_event}
                    ngayVaoVien={row.ngay_vao_vien}
                    ngayPhatHien={row.ngay_phat_hien}
                    iwpStart={liveCdcMetrics?.iwp_start}
                    iwpEnd={liveCdcMetrics?.iwp_end}
                    activeTab="LAM_SANG"
                  />
                )}

                {suspectedType !== "LOAI_TRU" && checklistType === "VAE" && vaeForm && (
                  <>
                    {vaeForm.patient_age >= 18 && vaeForm.vent_days >= 4 ? (
                      <VaeClinicalSubForm
                        form={vaeForm}
                        onChange={setVaeForm}
                        symptomDates={symptomDates}
                        onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                        allowedEdit={allowedEdit && (simulatedRole === 'LAM_SANG' || simulatedRole === 'KSNK')}
                        liveDeviceDays={liveCdcMetrics?.device_placed_days}
                        ngayVaoVien={row.ngay_vao_vien}
                        ngayPhatHien={row.ngay_phat_hien}
                        iwpStart={liveCdcMetrics?.iwp_start}
                        iwpEnd={liveCdcMetrics?.iwp_end}
                        activeTab="LAM_SANG"
                      />
                    ) : (
                      <PneuClinicalSubForm
                        form={vaeForm}
                        onChange={setVaeForm}
                        symptomDates={symptomDates}
                        onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                        allowedEdit={allowedEdit && (simulatedRole === 'LAM_SANG' || simulatedRole === 'KSNK')}
                        ngayVaoVien={row.ngay_vao_vien}
                        ngayPhatHien={row.ngay_phat_hien}
                        iwpStart={liveCdcMetrics?.iwp_start}
                        iwpEnd={liveCdcMetrics?.iwp_end}
                        activeTab="LAM_SANG"
                      />
                    )}
                  </>
                )}

                {suspectedType !== "LOAI_TRU" && checklistType === "UTI" && utiForm && (
                  <UtiClinicalSubForm
                    form={utiForm}
                    onChange={setUtiForm}
                    symptomDates={symptomDates}
                    onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                    allowedEdit={allowedEdit && (simulatedRole === 'LAM_SANG' || simulatedRole === 'KSNK')}
                    liveDeviceDays={liveCdcMetrics?.device_placed_days}
                    liveDeviceActive={liveCdcMetrics?.device_active_on_event}
                    ngayVaoVien={row.ngay_vao_vien}
                    ngayPhatHien={row.ngay_phat_hien}
                    iwpStart={liveCdcMetrics?.iwp_start}
                    iwpEnd={liveCdcMetrics?.iwp_end}
                    activeTab="LAM_SANG"
                  />
                )}

                {suspectedType !== "LOAI_TRU" && checklistType === "SSI" && ssiForm && (
                  <SsiClinicalSubForm
                    form={ssiForm}
                    onChange={setSsiForm}
                    symptomDates={symptomDates}
                    onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                    allowedEdit={allowedEdit && (simulatedRole === 'LAM_SANG' || simulatedRole === 'KSNK')}
                    ngayVaoVien={row.ngay_vao_vien}
                    ngayPhatHien={row.ngay_phat_hien}
                    iwpStart={liveCdcMetrics?.iwp_start}
                    iwpEnd={liveCdcMetrics?.iwp_end}
                    activeTab="LAM_SANG"
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PHÁN QUYẾT KSNK */}
          {activeTab === 'KSNK' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              {/* Left Column: Expert analysis checks & Adjudication action (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Proposed CDC Diagnosis Card */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">🚨 ĐỀ XUẤT CHẨN ĐOÁN TỰ ĐỘNG (CDC / NHSN)</span>
                  
                  {suspectedType === "LOAI_TRU" ? (
                    <div className="p-4 rounded-2xl border border-red-200 bg-red-50/20 text-red-950">
                      <div className="flex items-center gap-2">
                        <Ban className="h-6 w-6 text-red-700 flex-shrink-0 animate-pulse" />
                        <div>
                          <span className="text-[10px] font-black text-slate-400 block uppercase">Kết quả đề xuất</span>
                          <h4 className="text-base font-black tracking-tight text-red-800">
                            ĐÃ PHÁN QUYẾT LOẠI TRỪ
                          </h4>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                      liveEvaluation.is_positive 
                        ? "bg-emerald-50 border-emerald-200/60 text-emerald-900 shadow-md shadow-emerald-500/5"
                        : "bg-slate-100 border-slate-200 text-slate-700"
                    }`}>
                      <div className="flex items-center gap-2">
                        {liveEvaluation.is_positive ? (
                          <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Ban className="h-6 w-6 text-slate-500 flex-shrink-0" />
                        )}
                        <div>
                          <span className="text-[10px] font-black text-slate-400 block uppercase">Kết quả đề xuất</span>
                          <h4 className="text-base font-black tracking-tight">
                            {liveEvaluation.is_positive ? "DƯƠNG TÍNH" : "ÂM TÍNH / LOẠI TRỪ"}
                          </h4>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-slate-200/40 pt-3">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Mã phân loại</span>
                        <span className={`inline-block mt-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          liveEvaluation.is_positive 
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}>
                          {liveEvaluation.classification}
                        </span>
                        {liveEvaluation.is_secondary_bsi && (
                          <span className="ml-1.5 inline-block mt-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                            SECONDARY BSI
                          </span>
                        )}
                      </div>

                      <div className="mt-3 text-xs font-semibold leading-relaxed">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Căn cứ y tế</span>
                        {liveEvaluation.reason}
                      </div>
                    </div>
                  )}
                </div>

                {/* Validation Checks Checklist Questions */}
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">📊 ĐIỀU TRA VÀ THẨM ĐỊNH LÂM SÀNG (DATA VALIDATION)</span>
                  <div className="space-y-2.5">
                    <label className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-350 text-[#026f17]" />
                      <span>
                        <strong>1. Xác minh kết quả Vi sinh:</strong> Tác nhân cấy dương tính ({String(row.tac_nhan_vi_khuan || "Chưa rõ")}) là vi sinh vật đạt chuẩn, không phải nấm hay tạp nhiễm phòng Lab.
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-350 text-[#026f17]" />
                      <span>
                        <strong>2. Xác minh Triệu chứng Lâm sàng:</strong> Các triệu chứng sốt/triệu chứng tại chỗ được ghi chép trung thực trong hồ sơ bệnh án khoa trong vòng IWP.
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 text-xs font-semibold text-[#026f17] cursor-pointer">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-350 text-[#026f17]" />
                      <span>
                        <strong>3. Xác minh Lịch sử Thiết bị:</strong> Ngày đặt/rút Foley, CVC, thở máy khớp hoàn toàn với tờ theo dõi chăm sóc bệnh án.
                      </span>
                    </label>
                  </div>
                </div>

                {/* KSNK Final Adjudication Form */}
                <NkbvAdjudicationPanel
                  onAdjudicate={handleAdjudicate}
                  allowedEdit={allowedEdit}
                  simulatedRole={simulatedRole}
                  adjudicating={adjudicating}
                />
              </div>

              {/* Right Column: CDC Live Timeline (5 cols) */}
              <div className="lg:col-span-5 flex flex-col h-full space-y-4 bg-slate-50/80 rounded-3xl p-4 border border-slate-100 overflow-y-auto">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-200 pb-2">
                  🗓️ CDC LIVE TIMELINE & ATTRIBUTION
                </span>
                
                {suspectedType !== "LOAI_TRU" && (
                  <NkbvCdcMetricsPanel
                    metrics={liveCdcMetrics}
                    checklistType={checklistType}
                    isSecondaryBsi={liveEvaluation.is_secondary_bsi}
                    treatmentHistory={treatmentHistory}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="mt-4 flex justify-between items-center border-t border-slate-100 pt-4">
          <span className="text-[10px] text-slate-400 italic">
            💡 KTV Vi sinh nhập LIS ở Tab 1, Bác sĩ LS nhập ở Tab 2, KSNK duyệt phán quyết ở Tab 3.
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-550 hover:bg-slate-50 transition"
            >
              Đóng
            </button>
            {activeTab !== 'KSNK' && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveChecklist}
                className="rounded-full bg-[#026f17] disabled:opacity-50 px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-[#026f17]/25 hover:bg-[#026615] transition animate-in fade-in"
              >
                {submitting ? "Đang lưu..." : `LƯU DỮ LIỆU KHOA ${activeTab === 'VI_SINH' ? 'VI SINH' : 'LÂM SÀNG'}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
