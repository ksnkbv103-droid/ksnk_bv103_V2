"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { BaoCaoChuyenDe, BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { buildAnalyticsDeepLink } from "../../lib/bao-cao-tong-hop-core";

type Props = {
  payload: BaoCaoTongHopPayload | null;
  chuyenDe: BaoCaoChuyenDe;
  onChuyenDeChange: (v: BaoCaoChuyenDe) => void;
};

const TOPIC_TABS: { id: BaoCaoChuyenDe; label: string }[] = [
  { id: "ALL", label: "Tổng hợp" },
  { id: "VST", label: "Vệ sinh tay" },
  { id: "GSC", label: "Giám sát chung" },
  { id: "NKBV", label: "NKBV" },
];

export function ComprehensiveTopicHybrid({ payload, chuyenDe, onChuyenDeChange }: Props) {
  const f = payload?.filters;
  const deep = f
    ? {
        tu_ngay: f.tu_ngay,
        den_ngay: f.den_ngay,
        khoa_ids: f.khoa_ids,
      }
    : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800">Chuyên đề — tóm tắt điều hành</h2>
          <p className="mt-1 text-xs text-slate-500">
            Không nhân bản biểu đồ module. Phân tích đầy đủ tại tab Thống kê từng mảng.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 p-0.5">
          {TOPIC_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChuyenDeChange(t.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                chuyenDe === t.id ? "bg-[#026f17] text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {(chuyenDe === "ALL" || chuyenDe === "VST") && (
        <TopicSummary
          title="Vệ sinh tay"
          available={payload?.capabilities.topic_vst}
          deepHref={deep ? buildAnalyticsDeepLink("/giam-sat-vst", deep, "analytics") : "/giam-sat-vst"}
          lines={buildVstLines(payload)}
        />
      )}

      {(chuyenDe === "ALL" || chuyenDe === "GSC") && (
        <TopicSummary
          title="Giám sát chung"
          available={payload?.capabilities.topic_gsc}
          deepHref={
            deep
              ? buildAnalyticsDeepLink("/giam-sat-chung", deep, "analytics")
              : "/thong-ke/gsc"
          }
          lines={buildGscLines(payload)}
        />
      )}

      {(chuyenDe === "ALL" || chuyenDe === "NKBV") && (
        <TopicSummary
          title="Nhiễm khuẩn bệnh viện"
          available={payload?.capabilities.topic_nkbv}
          deepHref="/giam-sat-nkbv"
          lines={buildNkbvLines(payload)}
        />
      )}
    </section>
  );
}

function TopicSummary({
  title,
  available,
  deepHref,
  lines,
}: {
  title: string;
  available?: boolean;
  deepHref: string;
  lines: string[];
}) {
  return (
    <div className="mb-5 border-b border-slate-100 pb-5 last:mb-0 last:border-0 last:pb-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        <Link href={deepHref} className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:underline">
          Phân tích đầy đủ <ExternalLink size={10} aria-hidden />
        </Link>
      </div>
      {!available ? (
        <p className="text-xs text-slate-500">N/A — không có dữ liệu hoặc không có quyền nguồn.</p>
      ) : (
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function buildVstLines(payload: BaoCaoTongHopPayload | null): string[] {
  const k = payload?.vst?.kpis;
  if (!k) return [];
  const lines = [
    `Tuân thủ: ${k.ty_le_tuan_thu}% (${k.da_tuan_thu}/${k.tong_co_hoi} cơ hội)`,
    `Đúng kỹ thuật: ${k.ty_le_dung_ky_thuat}% · Lạm dụng găng: ${k.ty_le_lam_dung_gang}%`,
  ];
  const worstMoment = [...(payload?.vst?.moments ?? [])].sort((a, b) => a.ty_le_tuan_thu - b.ty_le_tuan_thu)[0];
  if (worstMoment) lines.push(`Thời điểm thấp nhất: ${worstMoment.ten} (${worstMoment.ty_le_tuan_thu}%)`);
  return lines;
}

function buildGscLines(payload: BaoCaoTongHopPayload | null): string[] {
  const k = payload?.gsc?.kpis;
  if (!k) return [];
  const lines = [
    `Tuân thủ: ${k.ty_le_tuan_thu}% (${k.tong_dat}/${k.tong_quan_sat} lượt quan sát, ${k.tong_phien} phiên)`,
    `Vi phạm ghi nhận: ${k.tong_vi_pham} lượt`,
  ];
  const topVp = payload?.gsc?.top_violations?.[0];
  if (topVp) lines.push(`Vi phạm nổi bật: ${topVp.ten_tieu_chi} (${topVp.so_vi_pham} lần, ${topVp.ten_bang_kiem})`);
  const bkLow = [...(payload?.gsc?.dynamic_checklists ?? [])].sort((a, b) => a.ty_le_tuan_thu - b.ty_le_tuan_thu)[0];
  if (bkLow) lines.push(`Bảng kiểm thấp nhất: ${bkLow.ten_bang_kiem} (${bkLow.ty_le_tuan_thu}%)`);
  return lines;
}

function buildNkbvLines(payload: BaoCaoTongHopPayload | null): string[] {
  const k = payload?.nkbv?.kpis;
  if (!k) return [];
  const lines = [
    `Phiếu trong khoảng: ${k.tong_phieu} · Xác nhận/PA: ${k.ti_le_xac_nhan_so_voi_pa}%`,
    `Đang ghi/ chờ XN: ${k.dang_va_cho_xn} · Loại trừ: ${k.loai_tru}`,
  ];
  const topLoai = payload?.nkbv?.by_loai?.[0];
  if (topLoai) lines.push(`Loại NK nhiều nhất: ${topLoai.ten} (${topLoai.so_phieu} phiếu)`);
  return lines;
}
