/**
 * nkbv-clinical-rationale.ts
 * Mô hình biện luận lâm sàng và suy luận chẩn đoán ca bệnh NKBV chuẩn mực.
 * Tuân thủ CDC/NHSN 2026, Quyết định 3916/QĐ-BYT và Quy trình KSNK.QT.33 BV Quân y 103.
 */

import type { RuleEvaluationResult } from "./nkbv-rules-engine";
import type { CdcMetricsResult } from "./nkbv-timeline-math";
import { formatNkbvChecklistTypeLabel } from "./nkbv-loai-labels";
import { haiPoaLabel } from "./nkbv-shared-timeline";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

export type ClinicalDeductionStep = {
  step: number;
  title: string;
  verdict: "MET" | "NOT_MET" | "EXCLUDED" | "INFO";
  summary: string;
  details: string[];
  citation: string;
};

export type StructuredClinicalDeduction = {
  syndromeCode: string;
  syndromeTitle: string;
  isPositive: boolean;
  statusBadge: "HAI_CONFIRMED" | "POA_EXCLUDED" | "CONTAMINATION" | "RULED_OUT" | "INSUFFICIENT";
  statusLabel: string;
  executiveSummary: string;
  steps: ClinicalDeductionStep[];
  ipcRecommendations: string[];
};

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  const s = String(d).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
}

export function buildClinicalDeduction(input: {
  checklistType: string;
  evaluation: RuleEvaluationResult;
  cdcMetrics: CdcMetricsResult | null;
  row: Record<string, unknown>;
  positiveCriteria?: Array<{ label: string; date?: string }>;
  ngayVaoVien?: string;
  khoas?: Array<{ id: string; ten_danh_muc?: string; ma_danh_muc?: string; ten?: string; ma?: string }>;
}): StructuredClinicalDeduction {
  const { checklistType, evaluation, cdcMetrics, row, positiveCriteria = [], ngayVaoVien, khoas = [] } = input;
  const isPos = Boolean(evaluation.is_positive);
  const classifRaw = String(evaluation.classification || checklistType || "").trim();
  const isClassifUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(classifRaw);
  const classif = isClassifUuid ? checklistType : classifRaw;
  const typeLabel = formatNkbvChecklistTypeLabel(checklistType as never);

  // 1. Phân loại trạng thái tổng thể
  let statusBadge: StructuredClinicalDeduction["statusBadge"] = "INSUFFICIENT";
  let statusLabel = "Chưa đủ tiêu chuẩn ca bệnh";

  if (isPos) {
    statusBadge = "HAI_CONFIRMED";
    statusLabel = "Đạt tiêu chuẩn ca bệnh NKBV (HAI)";
  } else if (classif === "POA" || classif === "COMMUNITY_ACQUIRED") {
    statusBadge = "POA_EXCLUDED";
    statusLabel = "Nhiễm khuẩn mắc phải tại cộng đồng / Khi vào viện (POA)";
  } else if (classif === "CONTAMINATION") {
    statusBadge = "CONTAMINATION";
    statusLabel = "Ngoại nhiễm vi sinh (Contamination)";
  } else if (classif === "CANDIDA_EXCLUSION" || classif === "LOW_CFU" || classif === "RULED_OUT") {
    statusBadge = "RULED_OUT";
    statusLabel = "Đã loại trừ ca bệnh theo tiêu chuẩn loại trừ";
  }

  const steps: ClinicalDeductionStep[] = [];

  // --- BƯỚC 1: CĂN CỨ VI SINH / YẾU TỐ INDEX ---
  const indexDate = fmtDate(String(row.ngay_phat_hien || ""));
  const specimen = String(row.loai_benh_pham || "Chưa ghi nhận");
  const pathogen = String(row.tac_nhan_vi_khuan || "Chưa phân lập");
  const cfu = String(row.cfu_ml || row.so_luong_khuan_lac || "");

  const step1Details: string[] = [
    `Bệnh phẩm: ${specimen}`,
    `Tác nhân vi sinh phân lập: ${pathogen}`,
    `Ngày lấy mẫu (Index Date): ${indexDate}`,
  ];
  if (cfu) step1Details.push(`Định lượng vi sinh: ${cfu}`);

  let step1Verdict: ClinicalDeductionStep["verdict"] = "MET";
  let step1Summary = `Có bằng chứng xét nghiệm vi sinh Index vào ngày ${indexDate}`;

  if (classif === "CONTAMINATION") {
    step1Verdict = "EXCLUDED";
    step1Summary = "Mẫu cấy nghi ngờ ngoại nhiễm (vi khuẩn thường trú da không đủ 2 mẫu riêng biệt hoặc cấy nước tiểu > 2 loài)";
  } else if (classif === "CANDIDA_EXCLUSION") {
    step1Verdict = "EXCLUDED";
    step1Summary = "Tác nhân là nấm men Candida spp. — CDC/NHSN loại trừ khỏi tiêu chuẩn CAUTI";
  } else if (classif === "LOW_CFU") {
    step1Verdict = "NOT_MET";
    step1Summary = "Số lượng khuẩn lạc không đạt ngưỡng quy định (yêu cầu ≥ 10^5 CFU/ml đối với vi khuẩn niệu)";
  }

  steps.push({
    step: 1,
    title: "Yếu tố xác định khung (Index) & Vi sinh",
    verdict: step1Verdict,
    summary: step1Summary,
    details: step1Details,
    citation: "CDC/NHSN 2026 Chapter 2 & Site-specific definitions",
  });

  // --- BƯỚC 2: CỬA SỔ CHẨN ĐOÁN (IWP) & TIÊU CHUẨN LÂM SÀNG ---
  const iwpStart = fmtDate(cdcMetrics?.iwp_start);
  const iwpEnd = fmtDate(cdcMetrics?.iwp_end);
  const windowLabel =
    checklistType === "VAE"
      ? "Khung theo dõi máy thở (Event Period 14 ngày)"
      : checklistType === "SSI"
        ? "Cửa sổ theo dõi sau mổ (30/90 ngày)"
        : checklistType === "CH17" && String(classif).includes("ENDO")
          ? "Cửa sổ IWP mở rộng viêm nội tâm mạc (±10 ngày)"
          : "Cửa sổ nhiễm khuẩn IWP (±3 ngày quanh Index)";

  const step2Details: string[] = [
    `Cửa sổ áp dụng: ${windowLabel} (${iwpStart} → ${iwpEnd})`,
  ];

  if (positiveCriteria.length > 0) {
    step2Details.push("Các tiêu chí dương tính ghi nhận trong cửa sổ:");
    for (const c of positiveCriteria) {
      step2Details.push(`• ${c.label}${c.date && c.date !== "—" ? ` (ngày ${c.date})` : ""}`);
    }
  } else {
    step2Details.push("Không ghi nhận triệu chứng lâm sàng thỏa mãn trong cửa sổ.");
  }

  let step2Verdict: ClinicalDeductionStep["verdict"] = "MET";
  let step2Summary = `Thu thập đủ ${positiveCriteria.length} tiêu chí cấu thành trong cửa sổ IWP`;
  if (positiveCriteria.length === 0 && checklistType !== "BSI") {
    step2Verdict = "NOT_MET";
    step2Summary = "Thiếu triệu chứng lâm sàng thỏa mãn trong cửa sổ khảo sát";
  }

  steps.push({
    step: 2,
    title: "Cửa sổ thời gian & Tiêu chuẩn lâm sàng",
    verdict: step2Verdict,
    summary: step2Summary,
    details: step2Details,
    citation: "CDC/NHSN 2026 Infection Window Period (IWP)",
  });

  // --- BƯỚC 3: NGÀY SỰ KIỆN (DOE) ---
  const doeStr = fmtDate(cdcMetrics?.doe);
  const step3Details: string[] = [
    `Ngày sự kiện (DOE / NSK): ${doeStr}`,
    "Nguyên tắc CDC: DOE là ngày đầu tiên xuất hiện bất kỳ phần tử nào cấu thành tiêu chuẩn chẩn đoán trong cửa sổ IWP.",
  ];
  if (checklistType === "BSI" && classif.includes("LCBI_1")) {
    step3Details.push("Với LCBI 1 (vi khuẩn gây bệnh chính thống): DOE được cố định là ngày cấy máu dương tính đầu tiên trong IWP (không phụ thuộc ngày triệu chứng).");
  } else if (checklistType === "VAE") {
    step3Details.push("Với VAE: DOE là ngày đầu tiên của đợt tăng PEEP hoặc FiO₂ liên tiếp 2 ngày sau giai đoạn ổn định baseline.");
  }

  steps.push({
    step: 3,
    title: "Ngày sự kiện nhiễm khuẩn (Date of Event — DOE)",
    verdict: cdcMetrics?.doe ? "MET" : "NOT_MET",
    summary: cdcMetrics?.doe ? `Xác định DOE chính xác vào ngày ${doeStr}` : "Chưa xác định được ngày sự kiện",
    details: step3Details,
    citation: "CDC/NHSN 2026 Chapter 2: Date of Event Rule",
  });

  // --- BƯỚC 4: PHÂN ĐỊNH POA VS HAI & QUY KẾT KHOA (LOA) ---
  const admStr = fmtDate(ngayVaoVien || String(row.ngay_vao_vien || ""));
  const hd = cdcMetrics?.dayOfHospitalization;
  const isHai = cdcMetrics?.haiStatus === "HAI";

  const resolveDeptName = (raw?: string | null): string => {
    if (!raw) return "Chưa xác định";
    const clean = String(raw).trim();
    if (!clean) return "Chưa xác định";
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
    if (isUuid) {
      const match = khoas.find((k) => k.id === clean);
      if (match) {
        return formatKhoaCompactLabel({
          ma_khoa: match.ma_danh_muc || match.ma,
          ten_khoa: match.ten_danh_muc || match.ten,
        });
      }
      return "Khoa điều trị";
    }
    return clean;
  };

  const rawLoa =
    cdcMetrics?.attributedStay?.ten_khoa ||
    cdcMetrics?.attributedStay?.khoa_id ||
    String(row.khoa_ten || row.ten_khoa || row.khoa_ghi_nhan_id || "");
  const loaDept = resolveDeptName(rawLoa);
  const transferReason = cdcMetrics?.attributionReason || "";

  const step4Details: string[] = [
    `Ngày vào viện (Hospital Day 1): ${admStr}`,
    `Ngày nằm viện tại sự kiện: Ngày thứ #${hd ?? "—"}`,
    `Phân định thời điểm: ${haiPoaLabel(cdcMetrics?.haiStatus)}`,
    `Khoa phòng quy kết trách nhiệm (LOA): ${loaDept}`,
  ];
  if (transferReason) {
    step4Details.push(`Quy tắc chuyển khoa (Transfer Rule): ${transferReason}`);
  }

  const step4Verdict: ClinicalDeductionStep["verdict"] = isHai ? "MET" : "EXCLUDED";
  const step4Summary = isHai
    ? `Xác định là Nhiễm khuẩn bệnh viện (HAI) — xuất hiện vào Ngày nằm viện thứ #${hd} (quy tắc NHSN Day-3)`
    : `Xác định là Hiện diện khi vào viện (POA) — xuất hiện tại Ngày nằm viện thứ #${hd ?? 1} (trước ngày thứ 3)`;

  steps.push({
    step: 4,
    title: "Phân loại thời điểm (POA / HAI) & Quy kết khoa (LOA)",
    verdict: step4Verdict,
    summary: step4Summary,
    details: step4Details,
    citation: "CDC/NHSN 2026 Chapter 2: Day-3 Rule & Transfer Rule",
  });

  // --- BƯỚC 5: YẾU TỐ DỤNG CỤ XÂM LẤN & KHUNG RIT/SBAP ---
  const deviceDays = cdcMetrics?.device_placed_days ?? 0;
  const activeOnEvent = Boolean(cdcMetrics?.device_active_on_event);
  const isDeviceAssoc = deviceDays >= 3 && activeOnEvent;
  const ritEndStr = cdcMetrics?.doe
    ? fmtDate(
        (() => {
          const d = cdcMetrics.doe.slice(0, 10);
          const dt = new Date(`${d}T12:00:00`);
          dt.setDate(dt.getDate() + 13);
          return dt.toISOString().slice(0, 10);
        })(),
      )
    : "—";

  const step5Details: string[] = [
    `Thời gian lưu dụng cụ trước sự kiện: ${deviceDays} ngày lịch liên tục`,
    `Hiện diện thiết bị tại ngày sự kiện: ${activeOnEvent ? "CÓ (tại DOE hoặc DOE-1)" : "KHÔNG"}`,
    `Liên quan dụng cụ: ${isDeviceAssoc ? "ĐẠT TIÊU CHUẨN LIÊN QUAN THIẾT BỊ" : "Không liên quan thiết bị (hoặc chưa đủ ngày)"}`,
    `Khung nhiễm khuẩn lặp lại (RIT 14 ngày): ${doeStr} → ${ritEndStr}`,
  ];

  if (cdcMetrics?.sbap_start && cdcMetrics?.sbap_end) {
    step5Details.push(`Cửa sổ Secondary BSI (SBAP): ${fmtDate(cdcMetrics.sbap_start)} → ${fmtDate(cdcMetrics.sbap_end)}`);
  }
  if (evaluation.is_secondary_bsi) {
    step5Details.push("CẢNH BÁO SECONDARY BSI: Cấy máu dương tính khớp tác nhân ổ nhiễm khuẩn tại chỗ. Đã quy kết là nhiễm khuẩn huyết thứ phát, loại trừ khỏi chỉ số CLABSI.");
  }

  steps.push({
    step: 5,
    title: "Yếu tố can thiệp thiết bị & Khung giám sát RIT / SBAP",
    verdict: isDeviceAssoc ? "MET" : "INFO",
    summary: isDeviceAssoc
      ? `Đạt tiêu chuẩn liên quan thiết bị (${deviceDays} ngày lưu liên tục, hiện diện tại DOE)`
      : `Không liên quan thiết bị (hoặc không lưu thiết bị đủ ≥ 3 ngày lịch)`,
    details: step5Details,
    citation: "CDC/NHSN 2026 Chapter 2: Device-Associated Criteria & Repeat Infection Timeframe",
  });

  // --- KHUYẾN CÁO KIỂM SOÁT NHIỄM KHUẨN ---
  const ipcRecommendations: string[] = [
    "Thực hiện nghiêm ngặt 5 thời điểm vệ sinh tay theo khuyến cáo WHO.",
    "Áp dụng biện pháp phòng ngừa chuẩn kết hợp phòng ngừa dựa trên đường lây truyền (tiếp xúc / giọt bắn).",
  ];
  if (checklistType === "BSI" || checklistType === "CLABSI") {
    ipcRecommendations.push("Đánh giá chỉ định lưu catheter tĩnh mạch trung tâm mỗi ngày; rút bỏ ngay khi không còn chỉ định.");
    ipcRecommendations.push("Sát khuẩn cổng bơm tiêm / màng ngắt bằng cồn 70° tối thiểu 15 giây trước mỗi lần tiếp cận.");
  } else if (checklistType === "UTI" || checklistType === "CAUTI") {
    ipcRecommendations.push("Đánh giá chỉ định lưu ống thông tiểu mỗi ngày; duy trì túi dẫn lưu thấp hơn mức bàng quang và hệ thống kín một chiều.");
  } else if (checklistType === "VAE" || checklistType === "VAP") {
    ipcRecommendations.push("Thực hiện đầy đủ gói can thiệp thở máy (Ventilator Bundle): nâng cao đầu giường 30-45°, vệ sinh răng miệng bằng Chlorhexidine, đánh giá cai thở máy hàng ngày.");
  } else if (checklistType === "SSI") {
    ipcRecommendations.push("Chăm sóc vết mổ bằng kỹ thuật vô khuẩn; giám sát liền vết thương và dịch tiết dẫn lưu.");
  }

  // --- BẢN TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY) ---
  let executiveSummary = "";
  if (isPos) {
    executiveSummary = `Ca bệnh được xác định là ${typeLabel} (${classif}) theo tiêu chuẩn CDC/NHSN 2026. ` +
      `Bệnh nhân xuất hiện ngày sự kiện (DOE) vào ${doeStr} (Ngày nằm viện thứ #${hd}), ` +
      `quy kết trách nhiệm cho ${loaDept}. ` +
      (isDeviceAssoc ? `Ca bệnh có liên quan đến dụng cụ xâm lấn (đặt ${deviceDays} ngày liên tục). ` : `Ca bệnh không liên quan dụng cụ. `) +
      `Khung RIT kéo dài đến ngày ${ritEndStr}, trong thời gian này mọi tác nhân cùng loại sẽ được bổ sung vào ca bệnh ban đầu.`;
  } else {
    executiveSummary = `Không xác nhận ca bệnh Nhiễm khuẩn bệnh viện (HAI). ` +
      `Lý do: ${evaluation.reason || "Chưa thỏa mãn đầy đủ các tiêu chuẩn cấu thành theo CDC/NHSN"}. ` +
      (classif === "POA" ? `Sự kiện xuất hiện trong vòng 48h đầu nhập viện (HD #${hd ?? 1}) nên được phân loại là Hiện diện khi vào viện (POA).` : "");
  }

  return {
    syndromeCode: classif,
    syndromeTitle: typeLabel,
    isPositive: isPos,
    statusBadge,
    statusLabel,
    executiveSummary,
    steps,
    ipcRecommendations,
  };
}
