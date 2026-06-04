// src/components/shared/Sidebar.tsx
"use client";

import React, { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  ClipboardList,
  Clock,
  Box,
  LayoutDashboard,
  type LucideIcon,
  PanelsTopLeft,
  IdCard,
  Settings,
  Shield,
  Stethoscope,
  AlertTriangle,
  Wrench,
  Droplets,
  FileBarChart,
} from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import {
  canSeeNavGate,
  canSeeQuanTriSection,
  NAV_GATE_CONG_VIEC,
  NAV_GATE_CSSD_QUY_TRINH,
  NAV_GATE_CSSD_SU_CO,
  NAV_GATE_CSSD_DUNG_CU,
  NAV_GATE_CSSD_THIET_BI,
  NAV_GATE_CSSD_HOA_CHAT,
  NAV_GATE_DASHBOARD,
  NAV_GATE_DM_HUB,
  NAV_GATE_GSC,
  NAV_GATE_NKBV,
  NAV_GATE_QUAN_TRI,
  NAV_GATE_VST,
  type NavGate,
} from "@/lib/nav/ksnk-nav-gates";
import {
  isNavHiddenUnderPilotCoreModules,
  isPilotCoreModulesScopeEnabled,
} from "@/lib/ksnk-pilot-core-modules-scope";

type NavItem = { name: string; href: string; icon: LucideIcon };

type NavMainRow = NavItem & { gate: NavGate };

/** Nhóm điều hướng: lọc theo RBAC (module VIEW), admin xem hết. */
const navMain: NavMainRow[] = [
  { name: "Trung tâm điều hành", href: "/", icon: LayoutDashboard, gate: NAV_GATE_DASHBOARD },
  { name: "Báo cáo tổng hợp KSNK", href: "/bao-cao-tong-hop", icon: FileBarChart, gate: NAV_GATE_DASHBOARD },
  { name: "Vệ sinh tay (WHO)", href: "/giam-sat-vst", icon: Stethoscope, gate: NAV_GATE_VST },
  { name: "Giám sát tuân thủ thực hành KSNK", href: "/giam-sat-chung", icon: ClipboardList, gate: NAV_GATE_GSC },

  { name: "Giám sát NKBV", href: "/giam-sat-nkbv", icon: Activity, gate: NAV_GATE_NKBV },
  { name: "Công việc", href: "/quan-ly-cong-viec", icon: PanelsTopLeft, gate: NAV_GATE_CONG_VIEC },
  { name: "Quy trình xử lý dụng cụ", href: "/cssd-quy-trinh", icon: Clock, gate: NAV_GATE_CSSD_QUY_TRINH },
  { name: "Báo cáo sự cố", href: "/cssd-su-co", icon: AlertTriangle, gate: NAV_GATE_CSSD_SU_CO },
  { name: "Dụng cụ phẫu thuật", href: "/cssd-dung-cu", icon: Box, gate: NAV_GATE_CSSD_DUNG_CU },
  { name: "Thiết bị KSNK", href: "/cssd-thiet-bi", icon: Wrench, gate: NAV_GATE_CSSD_THIET_BI },
  { name: "Hóa chất & Vật tư", href: "/cssd-hoa-chat", icon: Droplets, gate: NAV_GATE_CSSD_HOA_CHAT },
];




type NavAdminRow = NavItem & { gate: NavGate };

const navAdmin: NavAdminRow[] = [
  { name: "Quản trị hệ thống", href: "/quan-tri-he-thong", icon: Settings, gate: NAV_GATE_QUAN_TRI },
  { name: "Lookup danh mục", href: "/quan-tri-he-thong?tab=dm_registry", icon: Shield, gate: NAV_GATE_DM_HUB },
];

function menuItemIsActive(pathname: string, href: string, urlTab: string | null) {
  const [path, query] = href.split("?");
  if (path === "/giam-sat-chung" && pathname.startsWith("/giam-sat-chung")) {
    return !query;
  }
  if (pathname !== path) return false;
  if (!query) return urlTab !== "dm_registry";
  const want = new URLSearchParams(query).get("tab");
  return want != null && want === urlTab;
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
      className={`app-shell-focus flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors touch-manipulation ${
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
  const mainVisible = !loading
    ? navMain.filter((row) => {
        if (pilotCore && isNavHiddenUnderPilotCoreModules(row.gate.id)) return false;
        return canSeeNavGate(isAdmin, canView, row.gate);
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="section-label mb-2 px-4">Nghiệp vụ</p>
        {loading ? (
          <div className="px-4 py-3 text-xs font-medium text-slate-400" aria-busy="true">
            Đang tải menu…
          </div>
        ) : mainVisible.length === 0 ? (
          <p className="px-4 py-3 text-xs leading-relaxed text-amber-800/90">
            Tài khoản chưa được gán quyền module. Vui lòng liên hệ chủ nhiệm khoa KSNK để được cấp vai trò trong{" "}
            <span className="font-semibold">Phân quyền</span>.
          </p>
        ) : (
          mainVisible.map((row) => {
            const { gate: _g, ...item } = row;
            return (
              <NavLinkRow
                key={row.href}
                item={item}
                isActive={menuItemIsActive(pathname, row.href, urlTab)}
                onClose={onClose}
              />
            );
          })
        )}
      </div>
      {showQt ? (
        <div className="space-y-1 border-t border-slate-200/90 pt-4">
          <p className="section-label mb-2 px-4">Quản trị</p>
          {navAdmin.map((row) => {
            if (!canSeeNavGate(isAdmin, canView, row.gate)) return null;
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
      fixed md:sticky left-0 top-0 z-[10000] flex min-h-0 w-[17.5rem] flex-col md:min-h-screen
      border-r border-slate-200/90 bg-[var(--bg-panel)] transition-transform duration-300
      ${isOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto"}
      touch-manipulation
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
              <p className="truncate whitespace-nowrap text-[10px] font-semibold leading-tight text-[var(--primary)] md:text-[11px]">
                Khoa Kiểm soát nhiễm khuẩn
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="app-shell-focus shrink-0 rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label="Đóng menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Điều hướng chính">
        <Suspense
          fallback={<div className="px-2 py-8 text-center text-xs font-medium text-slate-400">Đang tải menu…</div>}
        >
          <SidebarNavLinks onClose={onClose} />
        </Suspense>
      </nav>

      <div className="mt-auto shrink-0 border-t border-slate-200/80 px-3 py-3 text-center">
        <p className="text-[10px] font-medium leading-snug text-slate-500 md:text-[11px]">
          Số hóa quy trình kiểm soát nhiễm khuẩn
        </p>
      </div>
    </aside>
  );
}
