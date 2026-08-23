/**
 * Draft nhận xét / kiến nghị Phần III BCTH — thuần từ payload đã compose.
 * User chỉnh tay trước khi ký; không auto-ký; không dùng CCS trên surface.
 */

import type { BaoCaoTongHopPayload } from "../types/bao-cao-tong-hop.types";

export type PhanIiiDraft = {
  nhanXet: string;
  kienNghi: string;
};

function fmtPct(v: number | null | undefined): string {
  return v == null ? "—" : `${v}%`;
}

/** Top khoa GSC thấp (fallback VST) — có dữ liệu. */
function bottomKhoaLabels(payload: BaoCaoTongHopPayload, limit = 3): string[] {
  return [...payload.khoa_rank]
    .filter((r) => r.has_data !== false && (r.ty_le_gsc != null || r.ty_le_vst != null))
    .sort((a, b) => {
      const aG = a.ty_le_gsc;
      const bG = b.ty_le_gsc;
      if (aG != null && bG != null && aG !== bG) return aG - bG;
      if (aG != null && bG == null) return -1;
      if (aG == null && bG != null) return 1;
      return (a.ty_le_vst ?? 999) - (b.ty_le_vst ?? 999);
    })
    .slice(0, limit)
    .map((r) => {
      const parts = [
        r.ty_le_gsc != null ? `GSC ${fmtPct(r.ty_le_gsc)}` : null,
        r.ty_le_vst != null ? `VST ${fmtPct(r.ty_le_vst)}` : null,
      ].filter(Boolean);
      return `${r.label || r.ten} (${parts.join(", ")})`;
    });
}

function topGapLabels(payload: BaoCaoTongHopPayload, limit = 3): string[] {
  const gaps = [
    ...(payload.vst?.gap_analysis ?? []).map((g) => ({
      ten: String(g.ten || "Khoa"),
      abs: Math.abs(Number(g.do_lech ?? 0)),
      domain: "VST",
    })),
    ...(payload.gsc?.gap_analysis ?? []).map((g) => ({
      ten: String(g.ten || "Khoa"),
      abs: Math.abs(Number(g.do_lech ?? 0)),
      domain: "GSC",
    })),
  ]
    .filter((g) => g.abs > 5)
    .sort((a, b) => b.abs - a.abs);
  return gaps.slice(0, limit).map((g) => `${g.ten} (${g.domain}, Δ≈${Math.round(g.abs)})`);
}

function topBkRisk(payload: BaoCaoTongHopPayload, limit = 3): string[] {
  const rows = payload.gsc?.checklist_overview ?? payload.gsc?.dynamic_checklists ?? [];
  return [...rows]
    .filter((b) => b.ty_le_tuan_thu != null || Number(b.tong_vi_pham ?? 0) > 0)
    .sort((a, b) => {
      const ta = a.ty_le_tuan_thu ?? 100;
      const tb = b.ty_le_tuan_thu ?? 100;
      if (ta !== tb) return ta - tb;
      return Number(b.tong_vi_pham ?? 0) - Number(a.tong_vi_pham ?? 0);
    })
    .slice(0, limit)
    .map((b) => {
      const ma = String(b.ma_bk || "").trim() || "BK";
      const ten = String(b.ten_bang_kiem || "").trim();
      const pct = b.ty_le_tuan_thu != null ? `${b.ty_le_tuan_thu}%` : "—";
      return ten ? `${ma} · ${ten} (${pct})` : `${ma} (${pct})`;
    });
}

export function buildPhanIiiDraft(payload: BaoCaoTongHopPayload | null): PhanIiiDraft {
  if (!payload) {
    return {
      nhanXet:
        "Chưa tải đủ dữ liệu báo cáo trong phạm vi lọc. Đề nghị kiểm tra quyền và kỳ lọc trước khi nhận xét.",
      kienNghi:
        "Bổ sung dữ liệu giám sát / CSSD trong kỳ, sau đó cập nhật nhận xét và kiến nghị gửi Ban Giám đốc.",
    };
  }

  const k = payload.kpis;
  const lines: string[] = [];
  lines.push(
    `Trong kỳ ${payload.filters.tu_ngay} → ${payload.filters.den_ngay}, tỷ lệ tuân thủ VST đạt ${fmtPct(k.ty_le_vst)}, GSC đạt ${fmtPct(k.ty_le_gsc)} (theo dõi riêng từng nguồn — không gộp chỉ số tổng hợp).`,
  );

  const bottom = bottomKhoaLabels(payload);
  if (bottom.length > 0) {
    lines.push(`Các khoa tuân thủ thấp cần ưu tiên theo dõi: ${bottom.join("; ")}.`);
  } else {
    lines.push("Chưa đủ xếp hạng khoa có dữ liệu VST/GSC trong kỳ lọc để nêu tên cụ thể.");
  }

  const gaps = topGapLabels(payload);
  if (gaps.length > 0) {
    lines.push(`Gap tự giám sát–chuyên trách đáng chú ý: ${gaps.join("; ")}.`);
  }

  const bks = topBkRisk(payload);
  if (bks.length > 0) {
    lines.push(`Bảng kiểm cần can thiệp (tuân thủ thấp / vi phạm): ${bks.join("; ")}.`);
  }

  if (payload.nkbv?.kpis) {
    const cho = payload.nkbv.kpis.dang_va_cho_xn ?? 0;
    const tong = payload.nkbv.kpis.tong_phieu ?? 0;
    lines.push(
      cho > 0
        ? `NKBV: ${cho} phiếu đang chờ xác nhận trên tổng ${tong} phiếu kỳ (outcome — tách khỏi tuân thủ process).`
        : `NKBV: không có phiếu chờ xác nhận; tổng ${tong} phiếu trong kỳ (outcome — tách khỏi tuân thủ process).`,
    );
  } else if (payload.sources.nkbv !== "ok") {
    lines.push("NKBV: chưa có số liệu outcome trong phạm vi quyền / nguồn.");
  }

  if (payload.cssd) {
    const c = payload.cssd;
    lines.push(
      `Phụ lục CSSD: cấp phát ${c.san_luong_cap_phat.toLocaleString()} · tỷ lệ quy trình không sự cố ${fmtPct(c.ty_le_quy_trinh_khong_su_co)} · máy sẵn ${c.may_ready}/sửa ${c.may_repairing} (vận hành — tách khỏi VST/GSC).`,
    );
  }

  const nhanXet = lines.join(" ");

  const kn: string[] = [];
  if (bottom.length > 0 || gaps.length > 0) {
    kn.push(
      "Đề nghị khoa lâm sàng tăng cường tự giám sát và phối hợp khoa KSNK đối soát các khoa/gap nêu trên trong tháng tới.",
    );
  } else {
    kn.push(
      "Duy trì lịch giám sát định kỳ; bổ sung dữ liệu tự giám sát và chuyên trách đủ cặp để đối soát khi triển khai thêm khoa.",
    );
  }
  if (bks.length > 0) {
    kn.push("Ưu tiên huấn luyện / kiểm tra lại các bảng kiểm có tuân thủ thấp hoặc vi phạm cao.");
  }
  if ((payload.nkbv?.kpis?.dang_va_cho_xn ?? 0) > 0) {
    kn.push("Đôn đốc xác nhận phiếu NKBV đang chờ để đóng vòng kết cục lâm sàng.");
  }
  if (payload.cssd && (payload.cssd.may_repairing > 0 || (payload.cssd.ty_le_quy_trinh_khong_su_co ?? 100) < 95)) {
    kn.push("Rà soát vận hành CSSD (máy sửa / sự cố quy trình) để bảo đảm an toàn dụng cụ.");
  }
  kn.push("Báo cáo này do hệ thống gợi ý từ số liệu — Chủ nhiệm khoa KSNK chỉnh sửa trước khi ký gửi Ban Giám đốc.");

  return { nhanXet, kienNghi: kn.join(" ") };
}
