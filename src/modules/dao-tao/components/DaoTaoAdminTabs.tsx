"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dao-tao/admin/ngan-hang", label: "Ngân hàng" },
  { href: "/dao-tao/admin/muc-do", label: "Ôn tập" },
  { href: "/dao-tao/admin/ky-thi", label: "Kỳ thi" },
  { href: "/dao-tao/admin/ket-qua", label: "Kết quả" },
] as const;

export function DaoTaoAdminTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1" aria-label="Quản trị đào tạo">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex h-9 items-center rounded-[var(--radius-control)] px-3 text-sm font-medium touch-manipulation",
              active
                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
