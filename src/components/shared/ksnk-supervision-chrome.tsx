"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { KsnkPageChrome } from "@/components/shared/KsnkPageChrome";

export type SupervisionTabDef = {
  id: string;
  label: string;
  /** Nhãn rút gọn trên điện thoại (≤639px). */
  mobileLabel?: string;
  icon: LucideIcon;
};

/** Tab dạng link — dùng cho sub-route navigation (VST, GSC). */
export type SupervisionTabLinkDef = SupervisionTabDef & {
  href: string;
};

const tabBtn = C.navTabBtn;
const tabStrip = C.navTabStrip;

/**
 * Hero Ops — wrapper `KsnkPageChrome` (page-chrome-contract).
 * `density` giữ API tương thích; luôn compact.
 */
export function KsnkSupervisionHero({
  eyebrow,
  title,
  description,
  actions,
  trailing,
  density: _density = "compact",
}: {
  eyebrow?: string | null;
  title: React.ReactNode;
  /** Bỏ trống/undefined để không hiển thị dòng mô tả. */
  description?: string | null;
  actions?: React.ReactNode;
  /** Ví dụ: `KsnkSupervisionTabList` — đặt cùng hàng tiêu đề (desktop). */
  trailing?: React.ReactNode;
  /** @deprecated Luôn compact theo page-chrome-contract. */
  density?: "default" | "compact";
}) {
  const actionRow =
    trailing || actions ? (
      <>
        {trailing}
        {actions}
      </>
    ) : undefined;

  return (
    <KsnkPageChrome
      eyebrow={eyebrow}
      title={title}
      subtitle={description}
      actions={actionRow}
      showTitle
    />
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
      className={`no-print ${tabStrip}`}
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
            <Icon className="h-4 w-4 shrink-0 opacity-90 max-sm:h-3.5 max-sm:w-3.5" aria-hidden />
            <span className="truncate sm:hidden">{t.mobileLabel ?? t.label}</span>
            <span className="hidden truncate sm:inline">{t.label}</span>
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
      className={`no-print ${tabStrip}`}
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const sel = t.href === pathname || (t.href !== tabs[0]?.href && pathname.startsWith(t.href));
        return (
          <Link
            key={t.id}
            href={t.href}
            prefetch={false}
            aria-current={sel ? "page" : undefined}
            className={`${tabBtn} ${sel ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-white/70 hover:text-slate-800"}`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90 max-sm:h-3.5 max-sm:w-3.5" aria-hidden />
            <span className="truncate sm:hidden">{t.mobileLabel ?? t.label}</span>
            <span className="hidden truncate sm:inline">{t.label}</span>
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
