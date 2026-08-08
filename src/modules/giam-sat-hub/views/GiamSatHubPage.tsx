"use client";

import Link from "next/link";
import { Activity, BarChart2, ClipboardList, History, QrCode, Stethoscope } from "lucide-react";
import { KsnkSupervisionHero } from "@/components/shared/ksnk-supervision-chrome";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
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
    <section className="space-y-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className={`${bv103LayoutChrome.panelSurface} group flex min-h-[3.25rem] flex-col justify-center gap-0.5 px-3 py-2.5 transition-colors hover:border-[var(--primary)]/30 hover:bg-slate-50/80 touch-manipulation active:scale-[0.99]`}
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 group-hover:text-[var(--primary)]">
                <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                {link.label}
              </span>
              <span className="text-[11px] leading-snug text-slate-500 line-clamp-1">{link.hint}</span>
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
    {
      href: "/giam-sat-vst",
      label: "Vệ sinh tay (WHO)",
      hint: "Nhập phiên quan sát",
      icon: Stethoscope,
      visible: seeVst,
    },
    {
      href: "/giam-sat-chung",
      label: "Giám sát tuân thủ KSNK",
      hint: "Nhập bảng kiểm",
      icon: ClipboardList,
      visible: seeGsc,
    },
    {
      href: "/giam-sat-nkbv",
      label: "Giám sát NKBV",
      hint: "Nhập sự kiện / vi sinh",
      icon: Activity,
      visible: seeNkbv,
    },
  ];

  const readLinks: HubLink[] = [
    {
      href: "/qr",
      label: "Quét QR truy vết",
      hint: "Mở lại phiếu / tem",
      icon: QrCode,
      visible: seeVst || seeGsc || seeNkbv,
    },
    { href: "/lich-su/vst", label: "Lịch sử VST", hint: "Phiên đã lưu", icon: History, visible: seeVst },
    { href: "/lich-su/gsc", label: "Lịch sử GSC", hint: "Phiên đã lưu", icon: History, visible: seeGsc },
    {
      href: "/giam-sat-nkbv?tab=cases",
      label: "Danh sách NKBV",
      hint: "Ca đã lưu",
      icon: History,
      visible: seeNkbv,
    },
    { href: "/thong-ke/vst", label: "Thống kê VST", hint: "Tỷ lệ tuân thủ", icon: BarChart2, visible: seeVst },
    { href: "/thong-ke/gsc", label: "Thống kê GSC", hint: "Tỷ lệ checklist", icon: BarChart2, visible: seeGsc },
  ];

  const hasAny = writeLinks.some((l) => l.visible) || readLinks.some((l) => l.visible);

  return (
    <div className={`${T.pageOuter}`}>
      <KsnkSupervisionHero
        eyebrow="Giám sát"
        title="Giám sát"
      />
      {!loading && !hasAny ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Tài khoản chưa có quyền giám sát. Liên hệ khoa KSNK.
        </p>
      ) : null}
      <HubSection title="Nhập liệu" links={writeLinks} />
      <HubSection title="Xem kết quả" links={readLinks} />
    </div>
  );
}
