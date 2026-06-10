"use client";

import Link from "next/link";
import { Activity, BarChart2, ClipboardList, History, Stethoscope } from "lucide-react";
import { KsnkSupervisionHero } from "@/components/shared/ksnk-supervision-chrome";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

type HubLink = {
  href: string;
  label: string;
  hint: string;
  icon: typeof Stethoscope;
};

const WRITE_LINKS: HubLink[] = [
  { href: "/giam-sat-vst", label: "Vệ sinh tay (WHO)", hint: "Nhập phiên quan sát 5 thời điểm", icon: Stethoscope },
  { href: "/giam-sat-chung", label: "Giám sát tuân thủ KSNK", hint: "Bảng kiểm động theo loại giám sát", icon: ClipboardList },
  { href: "/giam-sat-nkbv", label: "Giám sát NKBV", hint: "HAI — sự kiện, bệnh án, vi sinh", icon: Activity },
];

const READ_LINKS: HubLink[] = [
  { href: "/lich-su/vst", label: "Lịch sử VST", hint: "Tra cứu phiên đã lưu", icon: History },
  { href: "/lich-su/gsc", label: "Lịch sử GSC", hint: "Tra cứu phiên giám sát chung", icon: History },
  { href: "/thong-ke/vst", label: "Thống kê VST", hint: "Phân tích tuân thủ vệ sinh tay", icon: BarChart2 },
  { href: "/thong-ke/gsc", label: "Thống kê GSC", hint: "Phân tích tuân thủ checklist", icon: BarChart2 },
];

function HubSection({ title, links }: { title: string; links: HubLink[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className={`${bv103LayoutChrome.panelSurface} group flex min-h-[5.5rem] flex-col gap-2 p-4 transition-colors hover:border-[var(--primary)]/30 hover:bg-slate-50/80`}
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
      <HubSection title="Nhập liệu" links={WRITE_LINKS} />
      <HubSection title="Tra cứu và phân tích" links={READ_LINKS} />
    </div>
  );
}
