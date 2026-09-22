"use client";

import { formatPercent1, formatPercent2 } from "@/lib/analytics/supervision-percent";
import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { resolveSortedChecklistOverview } from "@/lib/analytics/gsc-checklist-intervention";
import { pickVeSinhTayChecklistRates, VE_SINH_TAY_WHO } from "@/lib/domain/ve-sinh-tay-catalog";
import { buildGscAnalyticsDeepLink } from "@/lib/analytics/supervision-deep-link";
import type { BaoCaoChuyenDe, BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { buildAnalyticsDeepLink } from "../../lib/bao-cao-tong-hop-core";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";
import { complianceToneFromPercent } from "../../lib/bao-cao-tong-hop-thresholds";

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
        <VeSinhTayTripleMetrics payload={payload} deep={deep} />
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

/** Ba chỉ số cạnh nhau — WHO · BM.02 · BM.03; không average. */
function VeSinhTayTripleMetrics({
  payload,
  deep,
}: {
  payload: BaoCaoTongHopPayload | null;
  deep: { tu_ngay: string; den_ngay: string; khoa_ids?: string[] } | null;
}) {
  const vstK = payload?.vst?.kpis;
  const whoRate = vstK?.ty_le_tuan_thu ?? null;
  const whoVol =
    vstK != null ? `${vstK.da_tuan_thu}/${vstK.tong_co_hoi} cơ hội` : null;
  const checklistRows =
    payload?.gsc?.checklist_overview ?? payload?.gsc?.dynamic_checklists ?? [];
  const bkRates = pickVeSinhTayChecklistRates(checklistRows);

  const whoHref = deep ? buildAnalyticsDeepLink("/thong-ke/vst", deep) : "/thong-ke/vst";
  const cards = [
    {
      key: "who",
      label: VE_SINH_TAY_WHO.label,
      code: "QT.07 BM.01 · WHO",
      rate: whoRate,
      volume: whoVol,
      href: whoHref,
      available: Boolean(payload?.capabilities.topic_vst && vstK),
      format: "vst" as const,
    },
    ...bkRates.map((r) => ({
      key: r.ma_bk,
      label: r.label,
      code: r.ma_bk,
      rate: r.ty_le_tuan_thu,
      volume: r.found ? `${r.tong_dat}/${r.tong_quan_sat} quan sát` : "Chưa có phiên trong kỳ",
      href: deep ? buildGscAnalyticsDeepLink(deep, r.ma_bk) : `/thong-ke/gsc?bk=${r.ma_bk}`,
      available: Boolean(payload?.capabilities.topic_gsc),
      format: "gsc" as const,
    })),
  ];

  return (
    <div className="mb-5 border-b border-slate-100 pb-5 last:mb-0 last:border-0 last:pb-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h3 className="bv103-type-section text-slate-700">Vệ sinh tay</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Ba khối cạnh nhau · cùng kỳ/khoa/lens — không gộp thành một %.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const pct = c.rate;
          const tone = complianceToneFromPercent(pct);
          const value =
            !c.available || pct == null
              ? "N/A"
              : c.format === "vst"
                ? formatPercent1(pct)
                : formatPercent2(pct);
          return (
            <div
              key={c.key}
              className={`rounded-xl border border-slate-200 bg-white px-3 py-3 ${D.trafficText[tone]}`}
            >
              <p className="bv103-type-label font-semibold text-slate-700">{c.label}</p>
              <p className="mt-0.5 font-mono text-[10px] text-slate-400">{c.code}</p>
              <p className={`mt-2 ${D.kpiValue}`}>{value}</p>
              {c.volume ? (
                <p className="mt-1 bv103-type-label tabular-nums opacity-80">{c.volume}</p>
              ) : null}
              <Link
                href={c.href}
                className="mt-2 inline-flex items-center gap-1 bv103-type-label font-semibold text-emerald-700 hover:underline"
              >
                Chi tiết <ExternalLink size={10} aria-hidden />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
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
        <h3 className="bv103-type-section text-slate-700">{title}</h3>
        <Link href={deepHref} className="inline-flex items-center gap-1 bv103-type-label font-semibold text-emerald-700 hover:underline">
          Chi tiết thống kê <ExternalLink size={10} aria-hidden />
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
    `Phiếu trong khoảng: ${k.tong_phieu} · Xác nhận/PA: ${k.ti_le_xac_nhan_so_voi_pa == null ? "—" : formatPercent1(k.ti_le_xac_nhan_so_voi_pa)}`,
    `Đang ghi/ chờ XN: ${k.dang_va_cho_xn} · Loại trừ: ${k.loai_tru}`,
  ];
  const topLoai = payload?.nkbv?.by_loai?.[0];
  if (topLoai) lines.push(`Loại NK nhiều nhất: ${topLoai.ten} (${topLoai.so_phieu} phiếu)`);
  return lines;
}
