"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ClipboardList, ShieldCheck } from "lucide-react";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import { buildAnalyticsDeepLink } from "@/modules/dashboard/lib/bao-cao-tong-hop-core";
import { complianceToneFromPercent } from "@/modules/dashboard/lib/bao-cao-tong-hop-thresholds";
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
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
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
  const toneText = D.trafficText[tone];

  return (
    <p className={`min-w-[12rem] text-sm ${toneText}`}>
      <span className="inline-flex items-center gap-1.5 font-medium">
        <Icon size={14} aria-hidden />
        {title}
      </span>
      <span className="ml-2 text-lg font-semibold tabular-nums">
        {percent != null ? `${percent}%` : "N/A"}
      </span>
      <span className="ml-1.5 text-[11px] font-medium">
        {tone === "green" ? "Đạt" : tone === "yellow" ? "Cận ngưỡng" : tone === "red" ? "Nguy cơ" : "—"}
      </span>
      <Link href={detailHref} className="ml-2 text-[11px] font-semibold text-emerald-700 hover:underline">
        Xem thống kê
      </Link>
    </p>
  );
}
