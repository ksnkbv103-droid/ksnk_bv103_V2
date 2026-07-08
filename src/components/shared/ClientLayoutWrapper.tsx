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
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
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
    <div className="flex min-h-screen bg-slate-50 touch-manipulation pointer-events-auto">
      <GuestStatsRouteGuard />
      <StaffSessionGate />
      <RbacRefreshListener />
      <SupervisionOfflineSyncListener />
      <Sidebar isOpen={isOpen} onClose={closeSidebar} />

      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        <Header onMenuClick={toggleSidebar} />
        <main className="relative z-0 flex-1 min-h-0 touch-manipulation px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-4 md:p-8 pointer-events-auto overscroll-y-contain">
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
          className="md:hidden fixed inset-0 bg-black/50 z-[9999] cursor-pointer pointer-events-auto touch-manipulation"
        />
      )}
    </div>
  );
}
