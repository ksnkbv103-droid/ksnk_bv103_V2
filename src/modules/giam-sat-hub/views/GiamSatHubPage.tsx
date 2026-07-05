"use client";

import Link from "next/link";
import { Activity, BarChart2, ClipboardList, History, Stethoscope } from "lucide-react";
import { KsnkSupervisionHero } from "@/components/shared/ksnk-supervision-chrome";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { usePermission } from "@/hooks/usePermission";
import {
  NAV_GATE_GSC,
  NAV_GATE_NKBV,
  NAV_GATE_VST,
  canSeeNavGate,
} from "@/lib/nav/ksnk-nav-gates";

type HubLink = {
  href: string;
  label: string;
  hint: string;
  icon: typeof Stethoscope;
  visible: boolean;
};

function HubSection({ title, links }: { title: string; links: HubLink[] }) {
  const visible = links.filter((l) => l.visible);
  if (visible.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className={`${bv103LayoutChrome.panelSurface} group flex min-h-[5.5rem] flex-col gap-2 p-4 transition-colors hover:border-[var(--primary)]/30 hover:bg-slate-50/80 touch-manipulation active:scale-[0.99]`}
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 group-hover:text-[var(--primary)]">
                <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                {link.label}
              </span>
              <span className="text-xs leading-relaxed text-slate-500">{link.hint}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function GiamSatHubPage() {
  const { loading, isAdmin, canView } = usePermission(undefined, "view");
  const seeVst = !loading && canSeeNavGate(isAdmin, canView, NAV_GATE_VST);
  const seeGsc = !loading && canSeeNavGate(isAdmin, canView, NAV_GATE_GSC);
  const seeNkbv = !loading && canSeeNavGate(isAdmin, canView, NAV_GATE_NKBV);

  const writeLinks: HubLink[] = [
    { href: "/giam-sat-vst", label: "Vệ sinh tay (WHO)", hint: "Nhập phiên quan sát 5 thời điểm", icon: Stethoscope, visible: seeVst },
    { href: "/giam-sat-chung", label: "Giám sát tuân thủ KSNK", hint: "Bảng kiểm động theo loại giám sát", icon: ClipboardList, visible: seeGsc },
    { href: "/giam-sat-nkbv", label: "Giám sát NKBV", hint: "HAI — sự kiện, bệnh án, vi sinh", icon: Activity, visible: seeNkbv },
  ];

  const readLinks: HubLink[] = [
    { href: "/lich-su/vst", label: "Lịch sử VST", hint: "Tra cứu phiên đã lưu", icon: History, visible: seeVst },
    { href: "/lich-su/gsc", label: "Lịch sử GSC", hint: "Tra cứu phiên giám sát chung", icon: History, visible: seeGsc },
    { href: "/thong-ke/vst", label: "Thống kê VST", hint: "Phân tích tuân thủ vệ sinh tay", icon: BarChart2, visible: seeVst },
    { href: "/thong-ke/gsc", label: "Thống kê GSC", hint: "Phân tích tuân thủ checklist", icon: BarChart2, visible: seeGsc },
  ];

  const hasAny = writeLinks.some((l) => l.visible) || readLinks.some((l) => l.visible);

  return (
    <div className="space-y-8 pb-12">
      <KsnkSupervisionHero
        eyebrow="Giám sát KSNK"
        title={
          <>
            Trung tâm <span className="text-[var(--primary)]">giám sát</span>
          </>
        }
        description="Chọn chế độ nhập liệu hoặc tra cứu — một cổng vào cho VST, GSC và NKBV."
      />
      {!loading && !hasAny ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tài khoản chưa có quyền giám sát. Liên hệ khoa KSNK để được cấp vai trò VST, GSC hoặc NKBV.
        </p>
      ) : null}
      <HubSection title="Nhập liệu" links={writeLinks} />
      <HubSection title="Tra cứu và phân tích" links={readLinks} />
    </div>
  );
}
