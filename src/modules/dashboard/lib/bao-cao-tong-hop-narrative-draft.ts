/**
 * Draft nhận xét / kiến nghị Phần III BCTH — thuần từ payload đã compose.
 * User chỉnh tay trước khi ký; không auto-ký; không dùng CCS trên surface.
 */

import {
  normalizeGapKhoaRow,
  type GapKhoaSourceRow,
} from "@/lib/analytics/supervision-matrix-mappers";
import { comparableGapRows } from "@/lib/analytics/supervision-source-lens";
import { DOI_SOAT_MIN_SAMPLE } from "@/lib/analytics/supervision-thresholds";
import { filterOutVstHubFromGscGenericList } from "@/lib/domain/gsc-lop-giam-sat-filter";
import type { BaoCaoTongHopPayload } from "../types/bao-cao-tong-hop.types";

export type PhanIiiDraft = {
  nhanXet: string;
  kienNghi: string;
};

function fmtPct(v: number | null | undefined): string {
  return v == null ? "—" : `${v}%`;
}

function bottomKhoaBySource(
  payload: BaoCaoTongHopPayload,
  source: "vst" | "gsc",
  limit = 3,
): string[] {
  const minN = DOI_SOAT_MIN_SAMPLE[source];
  return [...payload.khoa_rank]
    .filter((r) => {
      if (r.has_data === false) return false;
      if (source === "vst") {
        return r.ty_le_vst != null && r.tong_co_hoi_vst >= minN;
      }
      return r.ty_le_gsc != null && r.tong_quan_sat_gsc >= minN;
    })
    .sort((a, b) => {
      const av = source === "vst" ? a.ty_le_vst! : a.ty_le_gsc!;
      const bv = source === "vst" ? b.ty_le_vst! : b.ty_le_gsc!;
      return av - bv;
    })
    .slice(0, limit)
    .map((r) => {
      const pct = source === "vst" ? r.ty_le_vst : r.ty_le_gsc;
      return `${r.label || r.ten} (${source.toUpperCase()} ${fmtPct(pct)})`;
    });
}

function topGapLabels(payload: BaoCaoTongHopPayload, limit = 3): string[] {
  const gaps: { label: string; delta: number; domain: string }[] = [];

  const pushFrom = (source: "vst" | "gsc", analysis: GapKhoaSourceRow[] | undefined) => {
    for (const raw of analysis ?? []) {
      const norm = normalizeGapKhoaRow(raw);
      if (comparableGapRows([norm], { source }).length === 0) continue;
      const delta = Number(raw.do_lech ?? 0);
      if (Math.abs(delta) <= 5) continue;
      gaps.push({
        label: norm.label || String(raw.ten || "Khoa"),
        delta,
        domain: source.toUpperCase(),
      });
    }
  };

  pushFrom("vst", payload.vst?.gap_analysis);
  pushFrom("gsc", payload.gsc?.gap_analysis);

  return gaps
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, limit)
    .map((g) => {
      const signed =
        g.delta > 0 ? `+${Math.round(g.delta * 10) / 10}` : `${Math.round(g.delta * 10) / 10}`;
      return `${g.label} (${g.domain}, Δ${signed}%)`;
    });
}

function topBkRisk(payload: BaoCaoTongHopPayload, limit = 3): string[] {
  const raw = payload.gsc?.checklist_overview ?? payload.gsc?.dynamic_checklists ?? [];
  const rows = filterOutVstHubFromGscGenericList(raw);
  return [...rows]
    .filter((b) => b.ty_le_tuan_thu != null || Number(b.tong_vi_pham ?? 0) > 0)
    .sort((a, b) => {
      const ta = a.ty_le_tuan_thu;
      const tb = b.ty_le_tuan_thu;
      if (ta == null && tb == null) return Number(b.tong_vi_pham ?? 0) - Number(a.tong_vi_pham ?? 0);
      if (ta == null) return 1;
      if (tb == null) return -1;
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

  const bottomVst = bottomKhoaBySource(payload, "vst");
  const bottomGsc = bottomKhoaBySource(payload, "gsc");
  const bottomParts: string[] = [];
  if (bottomVst.length > 0) bottomParts.push(`VST: ${bottomVst.join("; ")}`);
  if (bottomGsc.length > 0) bottomParts.push(`GSC: ${bottomGsc.join("; ")}`);
  if (bottomParts.length > 0) {
    lines.push(`Các khoa tuân thủ thấp cần ưu tiên theo dõi: ${bottomParts.join(". ")}.`);
  } else {
    lines.push("Chưa đủ xếp hạng khoa có dữ liệu VST/GSC (đủ min-N) trong kỳ lọc để nêu tên cụ thể.");
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
        ? `NKBV: ${cho} phiếu đang chờ xác nhận trên tổng ${tong} phiếu kỳ (lâm sàng — tách khỏi tuân thủ quy trình).`
        : `NKBV: không có phiếu chờ xác nhận; tổng ${tong} phiếu trong kỳ (lâm sàng — tách khỏi tuân thủ quy trình).`,
    );
  } else if (payload.sources.nkbv !== "ok") {
    lines.push("NKBV: chưa có số liệu lâm sàng trong phạm vi quyền / nguồn.");
  }

  if (payload.cssd) {
    const c = payload.cssd;
    lines.push(
      `Phụ lục CSSD: cấp phát ${c.san_luong_cap_phat.toLocaleString()} · tỷ lệ quy trình không sự cố ${fmtPct(c.ty_le_quy_trinh_khong_su_co)} · máy sẵn ${c.may_ready}/sửa ${c.may_repairing} (vận hành — tách khỏi VST/GSC).`,
    );
  }

  const nhanXet = lines.join(" ");

  const kn: string[] = [];
  if (bottomParts.length > 0 || gaps.length > 0) {
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
  if (payload.cssd && payload.cssd.may_repairing > 0) {
    kn.push("Rà soát vận hành CSSD (máy đang sửa/bảo trì) để bảo đảm an toàn dụng cụ.");
  }
  if (
    payload.cssd &&
    payload.cssd.ty_le_quy_trinh_khong_su_co != null &&
    payload.cssd.ty_le_quy_trinh_khong_su_co < 90
  ) {
    kn.push("Rà soát sự cố quy trình CSSD trong kỳ — tỷ lệ không sự cố thấp hơn ngưỡng vận hành.");
  }
  kn.push("Báo cáo này do hệ thống gợi ý từ số liệu — Chủ nhiệm khoa KSNK chỉnh sửa trước khi ký gửi Ban Giám đốc.");

  return { nhanXet, kienNghi: kn.join(" ") };
}
