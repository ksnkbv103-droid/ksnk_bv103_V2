"use client";

import { formatPercent1 } from "@/lib/analytics/supervision-percent";
import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { BaoCaoChuyenDe, BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { PCT_SURFACE_LABEL } from "@/lib/analytics/supervision-source-labels";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

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
        <p className="mb-3 text-sm text-slate-600">
          Ba KPI vệ sinh tay (WHO · BM.02 · BM.03) ở mục{" "}
          <a href="#bc-vst" className="font-semibold text-emerald-700 hover:underline">
            Vệ sinh tay
          </a>
          . Không gộp thành một %.
        </p>
      )}

      {(chuyenDe === "ALL" || chuyenDe === "GSC") && (
        <p className="mb-3 text-sm text-slate-600">
          ty_le_bm và {PCT_SURFACE_LABEL.gscPool} ở mục{" "}
          <a href="#bc-gsc" className="font-semibold text-emerald-700 hover:underline">
            Giám sát chung
          </a>
          .
        </p>
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
