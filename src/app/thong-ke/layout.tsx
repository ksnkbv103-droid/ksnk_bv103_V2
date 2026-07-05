"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stethoscope, ClipboardList } from "lucide-react";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";

const analyticsTabs = [
  { id: "vst", label: "VST", href: "/thong-ke/vst", icon: Stethoscope },
  { id: "gsc", label: "GSC", href: "/thong-ke/gsc", icon: ClipboardList },
] as const;

function ThongKeToolbar() {
  const pathname = usePathname();

  return (
    <div className={`no-print ${bv103DesignTokens.analyticsToolbarShell}`}>
      <div className="flex min-h-8 flex-col gap-2 sm:min-h-9 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h1 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">Thống kê giám sát</h1>
        <nav aria-label="Module thống kê" className="flex w-full shrink-0 gap-1 rounded-lg bg-slate-100 p-0.5 sm:w-auto sm:p-1">
          {analyticsTabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors touch-manipulation sm:h-8 sm:flex-initial sm:px-3 ${
                  active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon size={14} aria-hidden />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default function ThongKeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={bv103DesignTokens.pageOuterAnalytics}>
      <Suspense fallback={null}>
        <ThongKeToolbar />
      </Suspense>
      <div className={bv103DesignTokens.pageSectionGap}>{children}</div>
    </div>
  );
}
