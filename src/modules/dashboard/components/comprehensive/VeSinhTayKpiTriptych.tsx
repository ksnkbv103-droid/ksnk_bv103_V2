"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { formatPercent1, formatPercent2 } from "@/lib/analytics/supervision-percent";
import { buildVeSinhTayKpiCards } from "@/lib/domain/ve-sinh-tay-kpi";
import { complianceToneFromPercent } from "@/modules/dashboard/lib/bao-cao-tong-hop-thresholds";
import { dashboardChrome as D } from "@/modules/dashboard/lib/dashboard-chrome";
import type { BaoCaoTongHopPayload } from "@/modules/dashboard/types/bao-cao-tong-hop.types";

/** Ba KPI cạnh nhau — WHO + BM.07.02 + BM.07.03; không gộp %. */
export function VeSinhTayKpiTriptych({ payload }: { payload: BaoCaoTongHopPayload | null }) {
  const cards = buildVeSinhTayKpiCards({
    vst: payload?.vst ?? null,
    gsc: payload?.gsc ?? null,
  });

  return (
    <div className="mb-[var(--bv103-space-3)] space-y-[var(--bv103-space-2)]">
      <p className="bv103-type-label text-slate-500">
        Ba tỷ lệ riêng — WHO 5 thời điểm · kỹ thuật thường quy (BM.07.02) · ngoại khoa (BM.07.03). Không gộp thành một %.
      </p>
      <div className="flex flex-col gap-[var(--bv103-space-3)] sm:flex-row sm:items-start sm:divide-x sm:divide-slate-200 sm:gap-0">
        {cards.map((card) => {
          const isWho = card.catalogMaBk == null;
          const value =
            card.tyLe == null ? "N/A" : isWho ? formatPercent1(card.tyLe) : formatPercent2(card.tyLe);
          const tone = complianceToneFromPercent(card.tyLe);
          return (
            <div
              key={card.qtMa}
              className={`min-w-0 flex-1 sm:px-4 sm:first:pl-0 ${D.trafficText[tone]}`}
            >
              <p className={D.kpiLabel}>
                {card.label}
                {card.catalogMaBk ? (
                  <span className="ml-1 font-normal text-slate-400">({card.catalogMaBk})</span>
                ) : null}
              </p>
              <p className={`mt-[var(--bv103-space-1)] ${D.kpiValue}`}>{value}</p>
              {card.volumeNote ? (
                <p className="mt-[var(--bv103-space-1)] bv103-type-label font-medium tabular-nums opacity-80">
                  {card.volumeNote}
                </p>
              ) : (
                <p className="mt-[var(--bv103-space-1)] bv103-type-label text-slate-400">
                  Chưa có phiên trong kỳ lọc
                </p>
              )}
              <Link
                href={card.statsHref}
                className="mt-[var(--bv103-space-1)] inline-flex items-center gap-1 bv103-type-label font-semibold text-emerald-700 hover:underline"
              >
                Chi tiết thống kê <ExternalLink size={10} aria-hidden />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
