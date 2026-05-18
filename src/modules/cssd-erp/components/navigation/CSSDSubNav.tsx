// src/modules/cssd-erp/components/navigation/CSSDSubNav.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Droplets, Clock, Box, Flame, Truck, ShieldCheck, FileText, Wrench, AlertTriangle, type LucideIcon } from "lucide-react";
import { CSSD_ROUTES } from "@/lib/cssd-routes";

type NavEntry = { name: string; href: string; icon: LucideIcon; group: "OPERATIONS" | "ASSETS" | "ANALYTICS" };

const navItems: NavEntry[] = [
  { name: "Tiếp nhận & Làm sạch", href: CSSD_ROUTES.tiepNhan, icon: Clock, group: "OPERATIONS" },
  { name: "Đóng gói vô khuẩn", href: CSSD_ROUTES.dongGoi, icon: Box, group: "OPERATIONS" },
  { name: "Mẻ tiệt khuẩn", href: CSSD_ROUTES.tietKhuan, icon: Flame, group: "OPERATIONS" },
  { name: "Cấp phát dụng cụ", href: CSSD_ROUTES.capPhat, icon: Truck, group: "OPERATIONS" },
  { name: "Ghi nhận sự cố", href: CSSD_ROUTES.suCo, icon: AlertTriangle, group: "OPERATIONS" },
  { name: "Kho & Danh mục", href: CSSD_ROUTES.quanTri, icon: ShieldCheck, group: "ASSETS" },
  { name: "Kho HC-VT", href: CSSD_ROUTES.khoHoaChat, icon: Droplets, group: "ASSETS" },
  { name: "Bảo trì thiết bị", href: CSSD_ROUTES.baoTriThietBi, icon: Wrench, group: "ASSETS" },
  { name: "Báo cáo CSSD", href: CSSD_ROUTES.baoCao, icon: FileText, group: "ANALYTICS" },
];


const linkBase =
  "flex min-w-0 items-center justify-start gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2";

export default function CSSDSubNav() {
  const pathname = usePathname();
  const activeItem = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const groups = [
    { id: "OPERATIONS", label: "Vận hành" },
    { id: "ASSETS", label: "Tài sản & kho" },
    { id: "ANALYTICS", label: "Phân tích" },
  ] as const;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-[var(--shadow-app-soft)] md:px-4 md:text-sm">
        <span className="text-slate-500">Đang mở:</span>{" "}
        <span className="font-semibold text-slate-800">{activeItem?.name || "CSSD"}</span>
      </div>
      <nav aria-label="Điều hướng module CSSD" className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-2">
        {groups.map((g) => (
          <div
            key={g.id}
            className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/90 bg-slate-100/80 p-2 shadow-inner md:p-1.5"
          >
            <p className="shrink-0 px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 md:px-2 md:pb-1 md:text-xs">
              {g.label}
            </p>
            <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
              {navItems
                .filter((item) => item.group === g.id)
                .map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      aria-current={isActive ? "page" : undefined}
                      className={`${linkBase} ${isActive ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80" : "text-slate-600 hover:bg-white/80 hover:text-slate-900"}`}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-90 md:h-5 md:w-5" aria-hidden />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
