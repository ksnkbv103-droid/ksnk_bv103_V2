"use client";

import { formatPercent1, formatPercent2 } from "@/lib/analytics/supervision-percent";
import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { resolveSortedChecklistOverview } from "@/lib/analytics/gsc-checklist-intervention";
import type { BaoCaoChuyenDe, BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { buildAnalyticsDeepLink } from "../../lib/bao-cao-tong-hop-core";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";
import { formatNkbvXacNhanVolume } from "@/modules/giam-sat-nkbv/lib/nkbv-dashboard-aggregate";

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
    <section className={`${D.shellPadded}`}>
      <div className="mb-[var(--bv103-space-3)] flex flex-wrap items-center justify-between gap-[var(--bv103-space-2)]">
        <div>
          <h2 className={D.sectionHeading}>Chuyên đề — tóm tắt điều hành</h2>
          <p className="mt-[var(--bv103-space-2)] bv103-type-label text-slate-500">
            Không nhân bản biểu đồ module. Chi tiết thống kê tại tab Thống kê từng mảng.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 p-0.5">
          {TOPIC_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChuyenDeChange(t.id)}
              className={`rounded-md px-3 py-1.5 bv103-type-label font-semibold ${
                chuyenDe === t.id ? "bg-[var(--primary)] text-white" : "text-slate-600 hover:bg-slate-50"
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
          deepHref={deep ? buildAnalyticsDeepLink("/thong-ke/vst", deep) : "/thong-ke/vst"}
          extraDeepLinks={[
            { href: "/thong-ke/gsc?bk=KSNK.QT.07.BM.02", label: "BM.02" },
            { href: "/thong-ke/gsc?bk=KSNK.QT.07.BM.03", label: "BM.03" },
          ]}
          lines={buildVstLines(payload)}
        />
      )}

      {(chuyenDe === "ALL" || chuyenDe === "GSC") && (
        <TopicSummary
          title="Giám sát chung"
          available={payload?.capabilities.topic_gsc}
          deepHref={
            deep ? buildAnalyticsDeepLink("/thong-ke/gsc", deep) : "/thong-ke/gsc"
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
  extraDeepLinks,
  lines,
}: {
  title: string;
  available?: boolean;
  deepHref: string;
  extraDeepLinks?: { href: string; label: string }[];
  lines: string[];
}) {
  return (
    <div className="mb-5 border-b border-slate-100 pb-5 last:mb-0 last:border-0 last:pb-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="bv103-type-section text-slate-700">{title}</h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={deepHref} className="inline-flex items-center gap-1 bv103-type-label font-semibold text-emerald-700 hover:underline">
            {extraDeepLinks?.length ? "WHO" : "Chi tiết thống kê"}
            <ExternalLink size={10} aria-hidden className="ml-0.5 inline" />
          </Link>
          {extraDeepLinks?.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="bv103-type-label font-semibold text-emerald-700 hover:underline"
            >
              {l.label}
            </Link>
          ))}
        </div>
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
    `Tuân thủ: ${formatPercent1(k.ty_le_tuan_thu)} (${k.da_tuan_thu}/${k.tong_co_hoi} cơ hội)`,
    `Kỹ thuật (phiếu WHO): ${k.ty_le_dung_ky_thuat == null ? "—" : `${k.ty_le_dung_ky_thuat}%`} · Bỏ sót khi đang mang găng: ${k.ty_le_lam_dung_gang == null ? "—" : `${k.ty_le_lam_dung_gang}%`}`,
  ];
  const worstMoment = [...(payload?.vst?.moments ?? [])].sort((a, b) => a.ty_le_tuan_thu - b.ty_le_tuan_thu)[0];
  if (worstMoment) lines.push(`Thời điểm thấp nhất: ${worstMoment.ten} (${formatPercent1(worstMoment.ty_le_tuan_thu)})`);
  return lines;
}

function buildGscLines(payload: BaoCaoTongHopPayload | null): string[] {
  const k = payload?.gsc?.kpis;
  if (!k) return [];
  const lines = [
    `Tuân thủ: ${formatPercent2(k.ty_le_tuan_thu)} (${k.tong_dat}/${k.tong_quan_sat} lượt quan sát, ${k.tong_phien} phiên)`,
    `Vi phạm ghi nhận: ${k.tong_vi_pham} lượt`,
  ];
  const topVp = payload?.gsc?.top_violations?.[0];
  if (topVp) lines.push(`Vi phạm nổi bật: ${topVp.ten_tieu_chi} (${topVp.so_vi_pham} lần, ${topVp.ten_bang_kiem})`);
  const bkLow = resolveSortedChecklistOverview(payload?.gsc ?? null)[0];
  if (bkLow) lines.push(`BK rủi ro nhất: ${bkLow.ma_bk} (${formatPercent2(bkLow.ty_le_tuan_thu)} · ${bkLow.tong_vi_pham} vi phạm)`);
  return lines;
}

function buildNkbvLines(payload: BaoCaoTongHopPayload | null): string[] {
  const k = payload?.nkbv?.kpis;
  if (!k) return [];
  const lines = [
    `Phiếu trong khoảng: ${k.tong_phieu} · Xác nhận/PA−LT: ${k.ti_le_xac_nhan_so_voi_pa == null ? "—" : `${k.ti_le_xac_nhan_so_voi_pa}%`} (${formatNkbvXacNhanVolume(k)})`,
    `Đang ghi/ chờ XN: ${k.dang_va_cho_xn} · Loại trừ: ${k.loai_tru}`,
  ];
  const topLoai = payload?.nkbv?.by_loai?.[0];
  if (topLoai) lines.push(`Loại NK nhiều nhất: ${topLoai.ten} (${topLoai.so_phieu} phiếu)`);
  return lines;
}
