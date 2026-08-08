/**
 * Câu mô tả 4 trụ Command Center — thuần.
 * Mẫu: giá trị (UI) + câu 1 dòng + ≤3 nguyên nhân + CTA (UI).
 * Spec 2026-07-31: Trụ A dùng VST/GSC riêng — không dùng CCS.
 */

export type PillarNarrative = {
  summary: string;
  reasons: string[];
};

export type FourPillarsNarrativeInput = {
  tyLeVst: number | null;
  tyLeGsc: number | null;
  /** @deprecated giữ tương thích — bỏ qua khi có tyLeVst/tyLeGsc */
  tyLeCcs?: number | null;
  cssd: {
    available: boolean;
    san_luong_cap_phat: number | null;
    red_alert_total: number | null;
    frozen_total: number | null;
    may_ready: number | null;
    may_repairing: number | null;
    so_me_ky: number | null;
    ty_le_qc_dat_me: number | null;
    ownership_summary?: string | null;
    destination_summary?: string | null;
  } | null;
  nkbv: {
    available: boolean;
    choXn: number | null;
    tongPhieu: number | null;
    outcome_summary?: string | null;
    clabsi_rate_per_1000?: number | null;
    clabsi_sir?: number | null;
  } | null;
  staff: {
    available: boolean;
    so_nv: number | null;
    tong_phien_gs: number | null;
    tong_co_hoi_vst: number | null;
  } | null;
  /** true khi pilot chặn path NKBV */
  nkbvBlocked?: boolean;
};

function processTone(vst: number | null, gsc: number | null): string {
  if (vst == null && gsc == null) return "Chưa đủ dữ liệu VST/GSC trong kỳ lọc.";
  const parts = [
    vst != null ? `VST ${vst}%` : null,
    gsc != null ? `GSC ${gsc}%` : null,
  ].filter(Boolean);
  const worst = [vst, gsc].filter((x): x is number => x != null).sort((a, b) => a - b)[0]!;
  if (worst >= 85) return `Tuân thủ process ổn (${parts.join(" · ")}).`;
  if (worst >= 70) return `Tuân thủ process cần theo dõi (${parts.join(" · ")}).`;
  return `Tuân thủ process dưới ngưỡng cảnh báo (${parts.join(" · ")}).`;
}

/** Trụ A — tuân thủ process VST / GSC (không CCS) */
export function buildPillarANarrative(
  tyLeVst: number | null,
  tyLeGsc?: number | null,
): PillarNarrative {
  // Tương thích call cũ buildPillarANarrative(ccs) khi chỉ 1 arg và tyLeGsc undefined từ test cũ
  const vst = tyLeVst;
  const gsc = tyLeGsc === undefined ? null : tyLeGsc;
  const reasons: string[] = [];
  if (vst == null && gsc == null) {
    reasons.push("Thiếu mẫu số VST và GSC trong kỳ");
    reasons.push("Mở thống kê VST/GSC để kiểm tra lọc khoa–thời gian");
  } else {
    reasons.push("Theo dõi riêng VST và GSC — không gộp chỉ số tổng hợp");
    const worst = [vst, gsc].filter((x): x is number => x != null).sort((a, b) => a - b)[0];
    if (worst != null && worst < 85) reasons.push("Ưu tiên khoa / chuyên đề tuân thủ thấp trên brief");
  }
  return { summary: processTone(vst, gsc), reasons: reasons.slice(0, 3) };
}

/** Trụ B — CSSD vận hành */
export function buildPillarBNarrative(
  cssd: FourPillarsNarrativeInput["cssd"],
): PillarNarrative {
  if (!cssd?.available) {
    return {
      summary: "Chưa tải được tín hiệu CSSD (thiếu quyền hoặc lỗi nguồn).",
      reasons: ["Mở báo cáo CSSD khi có quyền", "Không ảnh hưởng chỉ số VST/GSC"],
    };
  }
  const red = cssd.red_alert_total ?? 0;
  const frozen = cssd.frozen_total ?? 0;
  const cap = cssd.san_luong_cap_phat ?? 0;
  const reasons: string[] = [];
  if (red > 0) reasons.push(`${red} quy trình cảnh báo đỏ`);
  if (frozen > 0) reasons.push(`${frozen} quy trình đóng băng`);
  if (cssd.ty_le_qc_dat_me != null) {
    reasons.push(`QC đạt mẻ ${cssd.ty_le_qc_dat_me}% · ${cssd.so_me_ky ?? 0} mẻ kỳ`);
  }
  if (cssd.destination_summary) {
    reasons.push(cssd.destination_summary);
  } else if (cssd.ownership_summary) {
    reasons.push(cssd.ownership_summary);
  }
  if (reasons.length === 0) {
    reasons.push(`Sản lượng cấp phát: ${cap.toLocaleString()} lượt`);
    reasons.push("Không có đỏ/đóng băng trên bản đồ trạm");
  }
  const summary =
    red > 0 || frozen > 0
      ? `CSSD có rủi ro vận hành (đỏ ${red}, đóng băng ${frozen}) · sản lượng cấp phát ${cap.toLocaleString()}.`
      : `CSSD ổn định trong kỳ · sản lượng cấp phát ${cap.toLocaleString()} lượt.`;
  return { summary, reasons: reasons.slice(0, 3) };
}

/** Trụ C — nguồn lực: tách NV KSNK vs máy CSSD */
function buildPillarCNarrative(input: {
  staff: FourPillarsNarrativeInput["staff"];
  cssd: FourPillarsNarrativeInput["cssd"];
}): { ksnk: PillarNarrative; may: PillarNarrative } {
  const staff = input.staff;
  const cssd = input.cssd;
  const ksnk: PillarNarrative = !staff?.available
    ? {
        summary: "Chưa có workload NV KSNK (thiếu quyền hoặc không có phiên).",
        reasons: ["Bảng NV trên Tổng quan khi đủ quyền giám sát"],
      }
    : {
        summary: `${staff.so_nv ?? 0} NV KSNK · ${staff.tong_phien_gs ?? 0} phiên GS trong kỳ.`,
        reasons: [
          `Cơ hội VST ghi nhận: ${(staff.tong_co_hoi_vst ?? 0).toLocaleString()}`,
          "Chi tiết theo NV ở bảng workload phía dưới",
        ].slice(0, 3),
      };

  const ready = cssd?.may_ready;
  const repairing = cssd?.may_repairing;
  const may: PillarNarrative = !cssd?.available
    ? {
        summary: "Chưa có trạng thái máy CSSD.",
        reasons: ["Mở tab Thiết bị trên báo cáo CSSD"],
      }
    : {
        summary: `Máy sẵn sàng ${ready ?? "—"} · đang sửa ${repairing ?? "—"}.`,
        reasons: [
          Number(repairing ?? 0) > 0
            ? "Ưu tiên bảo trì máy đang sửa"
            : "Fleet máy ổn định",
          "NV CSSD xem tab Nhân sự báo cáo CSSD",
        ].slice(0, 3),
      };

  return { ksnk, may };
}

/** Trụ D — NKBV outcome + cải tiến */
function buildPillarDNarrative(
  nkbv: FourPillarsNarrativeInput["nkbv"],
  nkbvBlocked?: boolean,
): PillarNarrative {
  if (nkbvBlocked) {
    return {
      summary: "NKBV đang ngoài phạm vi pilot — xem tóm tắt trên Báo cáo tổng hợp.",
      reasons: ["Không gộp NKBV vào tuân thủ process", "Mở BCTH mục kết quả NKBV"],
    };
  }
  if (!nkbv?.available) {
    return {
      summary: "NKBV chưa tải / không có quyền xem thống kê.",
      reasons: ["Kiểm tra quyền module NKBV", "Hoặc mở Báo cáo tổng hợp"],
    };
  }
  const cho = nkbv.choXn ?? 0;
  const tong = nkbv.tongPhieu ?? 0;
  const outcome = nkbv.outcome_summary?.trim();
  return {
    summary: outcome
      ? outcome
      : cho > 0
        ? `${cho} phiếu NKBV đang chờ xác nhận · tổng ${tong} trong kỳ.`
        : `Không có phiếu chờ XN · tổng ${tong} phiếu kỳ.`,
    reasons: [
      outcome
        ? cho > 0
          ? `${cho} phiếu chờ XN · tổng ${tong}`
          : `Tổng ${tong} phiếu kỳ · backlog XN ổn`
        : cho > 0
          ? "Ưu tiên xác nhận lâm sàng / hội chẩn"
          : "Outcome ổn định trong kỳ",
      "Rate/SIR không gộp vào tuân thủ process",
      "Mở module NKBV để xem bảng dịch tễ đầy đủ",
    ].slice(0, 3),
  };
}

export function buildFourPillarsNarratives(
  input: FourPillarsNarrativeInput,
): {
  a: PillarNarrative;
  b: PillarNarrative;
  cKsnk: PillarNarrative;
  cMay: PillarNarrative;
  d: PillarNarrative;
} {
  const c = buildPillarCNarrative({ staff: input.staff, cssd: input.cssd });
  return {
    a: buildPillarANarrative(input.tyLeVst ?? null, input.tyLeGsc ?? null),
    b: buildPillarBNarrative(input.cssd),
    cKsnk: c.ksnk,
    cMay: c.may,
    d: buildPillarDNarrative(input.nkbv, input.nkbvBlocked),
  };
}
