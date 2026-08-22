"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ClipboardList, ExternalLink, ShieldCheck } from "lucide-react";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import { buildAnalyticsDeepLink } from "@/modules/dashboard/lib/bao-cao-tong-hop-core";
import {
  BAO_CAO_TONG_HOP_THRESHOLDS,
  complianceToneFromPercent,
} from "@/modules/dashboard/lib/bao-cao-tong-hop-thresholds";
import {
  isPathBlockedUnderPilotCoreModules,
  isPilotCoreModulesScopeEnabled,
} from "@/lib/ksnk-pilot-core-modules-scope";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

type Props = {
  vstPayload: VstStrategicPayload | null;
  gscPayload: GscStrategicPayload | null;
  tuNgay: string;
  denNgay: string;
  selectedKhoaIds: string[];
};

export function CommandCenterRateGlance({
  vstPayload,
  gscPayload,
  tuNgay,
  denNgay,
  selectedKhoaIds,
}: Props) {
  const filterSeed = useMemo(
    () => ({
      tu_ngay: tuNgay,
      den_ngay: denNgay,
      khoa_ids: selectedKhoaIds.length > 0 ? selectedKhoaIds : undefined,
    }),
    [tuNgay, denNgay, selectedKhoaIds],
  );

  const baoCaoHref = buildAnalyticsDeepLink("/bao-cao-tong-hop", filterSeed);
  const thongKeGscHref = buildAnalyticsDeepLink("/thong-ke/gsc", filterSeed);
  const thongKeVstHref = buildAnalyticsDeepLink("/thong-ke/vst", filterSeed);
  const showBaoCao = !(isPilotCoreModulesScopeEnabled() && isPathBlockedUnderPilotCoreModules("/bao-cao-tong-hop"));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TrafficLightCard
          title="Vệ sinh tay"
          icon={ShieldCheck}
          percent={vstPayload?.kpis?.ty_le_tuan_thu ?? null}
          detailHref={thongKeVstHref}
        />
        <TrafficLightCard
          title="Giám sát chung"
          icon={ClipboardList}
          percent={gscPayload?.kpis?.ty_le_tuan_thu ?? null}
          detailHref={thongKeGscHref}
        />
      </div>
      {showBaoCao ? (
        <p className="text-xs text-slate-500">
          In họp hội đồng:{" "}
          <Link href={baoCaoHref} className="font-semibold text-[var(--primary)] hover:underline">
            Báo cáo chính thức
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function TrafficLightCard({
  title,
  icon: Icon,
  percent,
  detailHref,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  percent: number | null;
  detailHref: string;
}) {
  const tone = complianceToneFromPercent(percent);
  const toneRing = D.trafficRing[tone];
  const toneText = D.trafficText[tone];

  return (
    <div className={`rounded-[var(--radius-shell)] border border-slate-200 p-4 ring-1 ${toneRing}`}>
      <div className="flex items-start justify-between gap-2">
        <h2 className={`flex items-center gap-2 ${D.sectionHeadingSm}`}>
          <Icon size={18} className={toneText} aria-hidden />
          {title}
        </h2>
        <span className={`text-[11px] font-medium ${toneText}`}>
          {tone === "green" ? "Đạt" : tone === "yellow" ? "Cận ngưỡng" : tone === "red" ? "Nguy cơ" : "—"}
        </span>
      </div>
      <p className={`mt-3 ${D.kpiValueLg} ${toneText}`}>{percent != null ? `${percent}%` : "N/A"}</p>
      <p className="mt-1 text-[11px] text-slate-400">
        Ngưỡng xanh ≥{BAO_CAO_TONG_HOP_THRESHOLDS.GREEN_MIN}% · vàng ≥{BAO_CAO_TONG_HOP_THRESHOLDS.YELLOW_MIN}%
      </p>
      <Link href={detailHref} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
        Xem thống kê <ExternalLink size={12} aria-hidden />
      </Link>
    </div>
  );
}
