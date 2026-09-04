"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stethoscope, ClipboardList } from "lucide-react";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { ThongKeChromeProvider } from "@/components/shared/ThongKeChromeContext";
import SupervisionModeNav from "@/components/shared/SupervisionModeNav";

const analyticsTabs = [
  { id: "vst", label: "Vệ sinh tay", href: "/thong-ke/vst", icon: Stethoscope },
  { id: "gsc", label: "Giám sát chung", href: "/thong-ke/gsc", icon: ClipboardList },
] as const;

function ThongKeModuleTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Module thống kê" className={`no-print ${C.navTabStrip}`}>
      {analyticsTabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`${C.navTabBtn} ${
              active
                ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ThongKeModeAndModuleTabs() {
  const pathname = usePathname();
  const isGsc = Boolean(pathname?.includes("/thong-ke/gsc"));
  const isVst = Boolean(pathname?.includes("/thong-ke/vst"));
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      {isVst || isGsc ? (
        <SupervisionModeNav
          module={isGsc ? "gsc" : "vst"}
          ariaLabel={isGsc ? "Giám sát tuân thủ KSNK" : "Giám sát vệ sinh tay"}
        />
      ) : null}
      <ThongKeModuleTabs />
    </div>
  );
}

export default function ThongKeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={bv103DesignTokens.pageOuter}>
      <Suspense fallback={null}>
        <ThongKeChromeProvider tabs={<ThongKeModeAndModuleTabs />}>
          <div className={bv103DesignTokens.pageSectionGap}>{children}</div>
        </ThongKeChromeProvider>
      </Suspense>
    </div>
  );
}
