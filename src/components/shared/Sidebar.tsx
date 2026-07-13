// src/components/shared/Sidebar.tsx
"use client";

import React, { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { IdCard, KeyRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { SIDEBAR_ADMIN_GROUPS } from "@/lib/nav/sidebar-admin-nav-groups";
import { SIDEBAR_NAV_GROUPS, type SidebarNavItem } from "@/lib/nav/sidebar-nav-groups";
import { canSeeCommandCenterNav, canSeeNavGate, canSeeQuanTriSection } from "@/lib/nav/ksnk-nav-gates";
import {
  isNavHiddenUnderPilotCoreModules,
  isPilotCoreModulesScopeEnabled,
} from "@/lib/ksnk-pilot-core-modules-scope";

type NavItem = { name: string; href: string; icon: LucideIcon };

function menuItemIsActive(pathname: string, href: string, urlTab: string | null) {
  const [path, query] = href.split("?");
  if (path === "/giam-sat-chung" && pathname.startsWith("/giam-sat-chung")) {
    return !query;
  }
  if (path === "/giam-sat" && (pathname === "/giam-sat" || pathname.startsWith("/giam-sat/"))) {
    return pathname === "/giam-sat";
  }
  if (pathname !== path) return false;
  if (!query) return urlTab !== "dm_registry";
  const want = new URLSearchParams(query).get("tab");
  return want != null && want === urlTab;
}

function filterVisibleItems(
  items: SidebarNavItem[],
  isAdmin: boolean,
  canView: (module: string) => boolean,
  pilotCore: boolean,
): SidebarNavItem[] {
  return items.filter((row) => {
    if (pilotCore && isNavHiddenUnderPilotCoreModules(row.gate.id)) return false;
    if (row.requireCommandCenterShell) {
      return canSeeCommandCenterNav(isAdmin, canView);
    }
    return canSeeNavGate(isAdmin, canView, row.gate);
  });
}

function NavLinkRow({
  item,
  isActive,
  onClose,
}: {
  item: NavItem;
  isActive: boolean;
  onClose: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onClose}
      aria-current={isActive ? "page" : undefined}
      className={`app-shell-focus flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] px-4 py-3.5 text-[0.9375rem] font-medium transition-colors md:min-h-0 md:py-3 md:text-sm ${
        isActive
          ? "bg-[var(--primary)] text-white shadow-sm shadow-[var(--primary)]/20"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${isActive ? "opacity-100" : "opacity-80"}`} aria-hidden />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

function SidebarNavLinks({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const { loading, isAdmin, canView, can } = usePermission(undefined, "view");
  const showQt = !loading && canSeeQuanTriSection(isAdmin, canView);
  const showTaiKhoanKsnk = !loading && (isAdmin || can("PHAN_QUYEN", "edit"));
  const pilotCore = isPilotCoreModulesScopeEnabled();
  const visibleGroups = !loading
    ? SIDEBAR_NAV_GROUPS.map((group) => ({
        ...group,
        items: filterVisibleItems(group.items, isAdmin, canView, pilotCore),
      })).filter((group) => group.items.length > 0)
    : [];
  const hasAnyNav = visibleGroups.length > 0;

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="px-4 py-3 text-xs font-medium text-slate-400" aria-busy="true">
          Đang tải menu…
        </div>
      ) : !hasAnyNav ? (
        <p className="px-4 py-3 text-xs leading-relaxed text-amber-800/90">
          Tài khoản chưa được gán quyền module. Vui lòng liên hệ chủ nhiệm khoa KSNK để được cấp vai trò trong{" "}
          <span className="font-semibold">Phân quyền</span>.
        </p>
      ) : (
        visibleGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            <p className="section-label mb-2 px-4">{group.label}</p>
            {group.items.map((row) => {
              const { gate: _g, ...item } = row;
              return (
                <NavLinkRow
                  key={row.href}
                  item={item}
                  isActive={menuItemIsActive(pathname, row.href, urlTab)}
                  onClose={onClose}
                />
              );
            })}
          </div>
        ))
      )}
      {showQt ? (
        <div className="space-y-4 border-t border-slate-200/90 pt-4">
          <p className="section-label mb-2 px-4">Quản trị</p>
          {SIDEBAR_ADMIN_GROUPS.map((group) => {
            const visible = group.items.filter((row) => canSeeNavGate(isAdmin, canView, row.gate));
            if (!visible.length) return null;
            return (
              <div key={group.id} className="space-y-0.5">
                <p className="px-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
                {visible.map((row) => {
                  const { gate: _g, ...item } = row;
                  return (
                    <NavLinkRow
                      key={row.href}
                      item={item}
                      isActive={menuItemIsActive(pathname, row.href, urlTab)}
                      onClose={onClose}
                    />
                  );
                })}
              </div>
            );
          })}
          {showTaiKhoanKsnk ?
            <NavLinkRow
              item={{
                name: "Tài khoản KSNK",
                href: "/quan-tri-he-thong/tai-khoan-nhan-su",
                icon: IdCard,
              }}
              isActive={pathname === "/quan-tri-he-thong/tai-khoan-nhan-su"}
              onClose={onClose}
            />
          : null}
        </div>
      ) : null}
    </div>
  );
}

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <aside
      className={`
      fixed md:sticky left-0 top-0 z-[10000] flex h-dvh max-h-dvh w-[min(18.5rem,92vw)] flex-col md:h-auto md:max-h-none md:min-h-screen md:w-[17.5rem]
      border-r border-slate-200/90 bg-[var(--bg-panel)] transition-transform duration-300
      ${isOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto"}
      max-md:pt-[env(safe-area-inset-top,0px)]
    `}
    >
      <div className="shrink-0 border-b border-slate-100 px-4 pb-4 pt-5 md:px-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            prefetch={false}
            className="app-shell-focus flex min-w-0 flex-1 items-center gap-3 rounded-2xl outline-offset-2"
            aria-label="Về trang chủ"
          >
            <Image
              src="/brand/logo-bv103.png"
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 bg-transparent object-contain drop-shadow-[0_6px_18px_rgba(15,23,42,0.12)]"
              priority
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <p className="truncate whitespace-nowrap text-[11px] font-bold leading-tight tracking-wide text-slate-900 md:text-xs">
                BỆNH VIỆN QUÂN Y 103
              </p>
              <p className="truncate whitespace-nowrap text-[11px] font-semibold leading-tight text-[var(--primary)] md:text-[11px]">
                Khoa Kiểm soát nhiễm khuẩn
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="app-shell-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 md:hidden touch-manipulation"
            aria-label="Đóng menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <nav
        className="custom-scrollbar bv103-scroll-y min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4"
        aria-label="Điều hướng chính"
      >
        <Suspense
          fallback={<div className="px-2 py-8 text-center text-xs font-medium text-slate-400">Đang tải menu…</div>}
        >
          <SidebarNavLinks onClose={onClose} />
        </Suspense>
      </nav>

      <div className="mt-auto shrink-0 space-y-2 border-t border-slate-200/80 px-3 py-3">
        <div className="md:hidden">
          <Link
            href="/tai-khoan/doi-mat-khau"
            prefetch={false}
            onClick={onClose}
            className="app-shell-focus flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 touch-manipulation"
          >
            <KeyRound className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
            Đổi mật khẩu
          </Link>
        </div>
        <p className="text-center text-[11px] font-medium leading-snug text-slate-500 md:text-[11px]">
          Số hóa quy trình kiểm soát nhiễm khuẩn
        </p>
      </div>
    </aside>
  );
}
