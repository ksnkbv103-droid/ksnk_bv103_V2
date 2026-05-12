// src/modules/cssd-erp/components/navigation/CSSDSubNav.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Droplets, LayoutDashboard, Package, ShieldCheck, FileText, Library, Wrench, type LucideIcon } from "lucide-react";

type NavEntry = { name: string; href: string; icon: LucideIcon };

const navItems: NavEntry[] = [
  { name: "Quy trình", href: "/cssd-erp", icon: LayoutDashboard },
  { name: "Mẻ hấp", href: "/cssd-erp/batch", icon: ShieldCheck },
  { name: "Bảo trì TB", href: "/cssd-erp/equipment-maintenance", icon: Wrench },
  { name: "Kho HC-VT", href: "/cssd-erp/kho-hoa-chat", icon: Droplets },
  { name: "Kho", href: "/cssd-erp/inventory", icon: Package },
  { name: "Danh mục CSSD", href: "/cssd-erp/catalog", icon: Library },
  { name: "Báo cáo", href: "/cssd-erp/report", icon: FileText },
];

const linkBase =
  "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 sm:flex-initial sm:px-4 touch-manipulation";

export default function CSSDSubNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng module CSSD"
      className="no-scrollbar mb-2 flex flex-wrap gap-1 overflow-x-auto rounded-xl border border-slate-200/90 bg-slate-100/90 p-1 shadow-inner"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            aria-current={isActive ? "page" : undefined}
            className={`${linkBase} ${isActive ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-white/70 hover:text-slate-800"}`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="whitespace-nowrap">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
