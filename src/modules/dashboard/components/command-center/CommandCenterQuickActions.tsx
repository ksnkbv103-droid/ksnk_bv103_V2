"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ClipboardList, FileBarChart, PanelsTopLeft, Stethoscope } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import {
  canSeeNavGate,
  NAV_GATE_CONG_VIEC,
  NAV_GATE_DASHBOARD,
  NAV_GATE_GSC,
  NAV_GATE_VST,
} from "@/lib/nav/ksnk-nav-gates";
import {
  isPathBlockedUnderPilotCoreModules,
  isPilotCoreModulesScopeEnabled,
} from "@/lib/ksnk-pilot-core-modules-scope";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { buildAnalyticsDeepLink } from "@/modules/dashboard/lib/bao-cao-tong-hop-core";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

type Props = {
  tuNgay: string;
  denNgay: string;
  selectedKhoaIds: string[];
};

type QuickActionDef = {
  id: string;
  label: string;
  hint: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: "emerald" | "blue" | "amber" | "indigo";
};

export function CommandCenterQuickActions({ tuNgay, denNgay, selectedKhoaIds }: Props) {
  const { loading, isAdmin, canView } = usePermission(undefined, "view");

  const filterSeed = useMemo(
    () => ({
      tu_ngay: tuNgay,
      den_ngay: denNgay,
      khoa_ids: selectedKhoaIds.length > 0 ? selectedKhoaIds : undefined,
    }),
    [tuNgay, denNgay, selectedKhoaIds],
  );

  const actions = useMemo(() => {
    if (loading) return [];

    const pilotCore = isPilotCoreModulesScopeEnabled();
    const list: QuickActionDef[] = [];

    if (canSeeNavGate(isAdmin, canView, NAV_GATE_VST)) {
      list.push({
        id: "vst",
        label: "Bắt đầu phiên VST",
        hint: "Ghi nhận vệ sinh tay WHO",
        href: buildAnalyticsDeepLink("/giam-sat-vst", filterSeed),
        icon: Stethoscope,
        tone: "emerald",
      });
    }

    if (canSeeNavGate(isAdmin, canView, NAV_GATE_GSC)) {
      list.push({
        id: "gsc",
        label: "Giám sát chung",
        hint: "Mở phiên tuân thủ KSNK",
        href: buildAnalyticsDeepLink("/giam-sat-chung", filterSeed),
        icon: ClipboardList,
        tone: "blue",
      });
    }

    if (canSeeNavGate(isAdmin, canView, NAV_GATE_CONG_VIEC)) {
      list.push({
        id: "qlcv",
        label: "Công việc của tôi",
        hint: "Kanban và phiếu được giao",
        href: "/quan-ly-cong-viec",
        icon: PanelsTopLeft,
        tone: "amber",
      });
    }

    const showBaoCao =
      canSeeNavGate(isAdmin, canView, NAV_GATE_DASHBOARD) &&
      !(pilotCore && isPathBlockedUnderPilotCoreModules("/bao-cao-tong-hop"));

    if (showBaoCao) {
      list.push({
        id: "bao-cao",
        label: "Báo cáo kỳ",
        hint: "Xu hướng và in báo cáo",
        href: buildAnalyticsDeepLink("/bao-cao-tong-hop", filterSeed),
        icon: FileBarChart,
        tone: "indigo",
      });
    }

    return list;
  }, [loading, isAdmin, canView, filterSeed]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className={D.kpiLabel}>Đang tải thao tác nhanh…</p>
      </section>
    );
  }

  if (actions.length === 0) return null;

  return (
    <section aria-labelledby="cc-quick-actions-heading">
      <div className="mb-4">
        <h2 id="cc-quick-actions-heading" className={D.sectionHeading}>
          Việc cần làm hôm nay
        </h2>
        <p className={`mt-1 ${T.pageSubtitle}`}>Thao tác nhanh — chọn module để bắt đầu ngay.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <QuickActionCard key={action.id} {...action} />
        ))}
      </div>
    </section>
  );
}

function QuickActionCard({
  label,
  hint,
  href,
  icon: Icon,
  tone,
}: Omit<QuickActionDef, "id">) {
  const iconBg = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    indigo: "bg-indigo-500",
  }[tone];

  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-[var(--primary)]/30 hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20"
    >
      <div className={`shrink-0 rounded-xl p-2.5 text-white ${iconBg}`}>
        <Icon size={20} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className={T.tableCellTitle}>{label}</p>
        <p className={`mt-0.5 ${D.kpiLabel}`}>{hint}</p>
      </div>
    </Link>
  );
}
