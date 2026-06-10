"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

export type SupervisionTabDef = {
  id: string;
  label: string;
  icon: LucideIcon;
};

/** Tab dạng link — dùng cho sub-route navigation (VST, GSC). */
export type SupervisionTabLinkDef = SupervisionTabDef & {
  href: string;
};

const tabBtn =
  "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 sm:flex-initial sm:px-4 touch-manipulation";

/** Hero dùng chung: giám sát VST / giám sát chung — khớp shell Quản trị. */
export function KsnkSupervisionHero({
  eyebrow,
  title,
  description,
  actions,
  trailing,
}: {
  eyebrow?: string | null;
  title: React.ReactNode;
  /** Bỏ trống/undefined để không hiển thị dòng mô tả. */
  description?: string | null;
  actions?: React.ReactNode;
  /** Ví dụ: `KsnkSupervisionTabList` — đặt cùng hàng tiêu đề (desktop). */
  trailing?: React.ReactNode;
}) {
  const desc = description?.trim();
  const eye = (eyebrow ?? "").trim();
  return (
    <header className="no-print rounded-[var(--radius-shell)] border border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50/90 p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.04] md:p-6">
      <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1">
          {eye ? <p className={T.pageEyebrow}>{eye}</p> : null}
          <div className={`${T.pageTitle} ${eye ? "mt-1" : ""}`}>{title}</div>
          {desc ? <p className={T.pageSubtitle}>{desc}</p> : null}
        </div>
        <div className="flex w-full min-w-0 shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto lg:max-w-[55%] xl:max-w-[50%]">
          {trailing}
          {actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}

/** Tab dạng segmented — cùng họ với Trung tâm danh mục. */
export function KsnkSupervisionTabList({
  tabs,
  activeId,
  onChange,
  ariaLabel,
}: {
  tabs: SupervisionTabDef[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel ?? "Chế độ giám sát"}
      className="no-print flex flex-wrap gap-1 rounded-[var(--radius-control)] border border-slate-200/90 bg-slate-100/90 p-1 shadow-inner"
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const sel = activeId === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={sel}
            className={`${tabBtn} ${sel ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-white/70 hover:text-slate-800"}`}
            onClick={() => onChange(t.id)}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="truncate">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Tab dạng Link — dùng sub-route navigation (VST, GSC). Active state dựa trên pathname. */
export function KsnkSupervisionTabLinks({
  tabs,
  ariaLabel,
}: {
  tabs: SupervisionTabLinkDef[];
  ariaLabel?: string;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={ariaLabel ?? "Chế độ giám sát"}
      className="no-print flex flex-wrap gap-1 rounded-[var(--radius-control)] border border-slate-200/90 bg-slate-100/90 p-1 shadow-inner"
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        // Exact match cho root, startsWith cho sub-routes
        const sel = t.href === pathname || (t.href !== tabs[0]?.href && pathname.startsWith(t.href));
        return (
          <Link
            key={t.id}
            href={t.href}
            prefetch={false}
            aria-current={sel ? "page" : undefined}
            className={`${tabBtn} ${sel ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-white/70 hover:text-slate-800"}`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="truncate">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Vùng bọc nội dung tab (lịch sử, bảng). */
export function KsnkSupervisionPanel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`animate-in fade-in slide-in-from-bottom-2 duration-300 ${className}`}>{children}</div>;
}

