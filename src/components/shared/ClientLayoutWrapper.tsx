// src/components/shared/ClientLayoutWrapper.tsx
"use client";

import React, { useEffect, useState, startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import KsnkPageShell from "./KsnkPageShell";
import { pathnameUsesPhase1KsnkUnifiedContentShell } from "@/lib/app-shell-scope";
import { supabase } from "@/lib/supabase";
import StaffSessionGate from "@/components/auth/StaffSessionGate";
import SupervisionOfflineSyncListener from "@/components/shared/SupervisionOfflineSyncListener";
import RbacRefreshListener from "@/components/shared/RbacRefreshListener";
import { GuestStatsShell } from "@/components/auth/GuestStatsShell";
import { GuestStatsRouteGuard } from "@/components/auth/GuestStatsRouteGuard";
import { forceReleaseScrollLock, useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { usePermission } from "@/hooks/usePermission";
import { canSeeCommandCenterNav } from "@/lib/nav/ksnk-nav-gates";
import { resolvePostLoginPath } from "@/lib/auth/guest-stats-access";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login" || pathname.startsWith("/login/");
  const { loading, isAdmin, canView, userRoles, isGuestStatsOnly } = usePermission(undefined, "view");

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  useEffect(() => {
    forceReleaseScrollLock();
  }, []);

  /** Mobile: khóa cuộn body — chỉ <main data-bv103-app-scroll> cuộn (Android). */
  useEffect(() => {
    const root = document.documentElement;
    if (isLoginPage) {
      root.classList.remove("bv103-app-inner-scroll");
      return;
    }
    root.classList.add("bv103-app-inner-scroll");
    return () => root.classList.remove("bv103-app-inner-scroll");
  }, [isLoginPage]);

  useEffect(() => {
    let mounted = true;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      startTransition(() => {
        if (!mounted) return;
        if (!session && !isLoginPage) router.replace("/login");
        if (session && isLoginPage) {
          const roles = userRoles.length > 0 ? userRoles : [];
          const canSeeCc = canSeeCommandCenterNav(isAdmin, canView);
          router.replace(resolvePostLoginPath(roles, canSeeCc));
        }
      });
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [isLoginPage, router, isAdmin, canView, userRoles]);

  useEffect(() => {
    setIsOpen(false);
    forceReleaseScrollLock();
  }, [pathname]);

  useBodyScrollLock(isOpen);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!loading && isGuestStatsOnly) {
    return (
      <>
        <GuestStatsRouteGuard />
        <RbacRefreshListener />
        <GuestStatsShell>{children}</GuestStatsShell>
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 pointer-events-auto max-md:h-dvh max-md:max-h-dvh max-md:min-h-0 max-md:overflow-hidden">
      <GuestStatsRouteGuard />
      <StaffSessionGate />
      <RbacRefreshListener />
      <SupervisionOfflineSyncListener />
      <Sidebar isOpen={isOpen} onClose={closeSidebar} />

      <div className="flex min-h-0 flex-1 flex-col min-w-0 max-md:overflow-hidden md:min-h-screen">
        <Header onMenuClick={toggleSidebar} />
        <main
          data-bv103-app-scroll
          className="relative z-0 flex-1 min-h-0 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3 sm:py-2.5 md:px-4 md:py-3 pointer-events-auto max-md:overflow-y-auto max-md:overscroll-y-contain max-md:bv103-scroll-y"
        >
          {pathnameUsesPhase1KsnkUnifiedContentShell(pathname) ? (
            <KsnkPageShell rolloutPhase="phase-1">{children}</KsnkPageShell>
          ) : (
            children
          )}
        </main>
      </div>

      {isOpen && (
        <div
          onClick={closeSidebar}
          className="md:hidden fixed inset-0 z-[9999] cursor-pointer bg-black/50 touch-none pointer-events-auto"
        />
      )}
    </div>
  );
}
