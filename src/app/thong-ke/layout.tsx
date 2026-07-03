"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stethoscope, ClipboardList } from "lucide-react";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const analyticsTabs = [
  { id: "vst", label: "VST", href: "/thong-ke/vst", icon: Stethoscope },
  { id: "gsc", label: "GSC", href: "/thong-ke/gsc", icon: ClipboardList },
] as const;

function ThongKeToolbar() {
  const pathname = usePathname();

  return (
    <div className={`no-print sticky top-4 z-40 ${bv103DesignTokens.analyticsToolbarShell}`}>
      <div className="flex min-h-9 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-base font-semibold tracking-tight text-slate-900">Thống kê giám sát</h1>
        <nav aria-label="Module thống kê" className="flex shrink-0 gap-1 rounded-lg bg-slate-100 p-1">
          {analyticsTabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
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
