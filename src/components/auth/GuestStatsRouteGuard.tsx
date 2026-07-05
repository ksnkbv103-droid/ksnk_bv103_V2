"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePermission } from "@/hooks/usePermission";
import { canSeeCommandCenterNav } from "@/lib/nav/ksnk-nav-gates";
import {
  GUEST_STATS_HOME_PATH,
  isGuestStatsPathAllowed,
  resolvePostLoginPath,
} from "@/lib/auth/guest-stats-access";

/** Điều hướng sau đăng nhập + chặn khách ra khỏi route vận hành. */
export function GuestStatsRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, isAdmin, canView, userRoles, isGuestStatsOnly } = usePermission(undefined, "view");

  useEffect(() => {
    if (loading) return;

    const canSeeCc = canSeeCommandCenterNav(isAdmin, canView);

    if (pathname === "/login" || pathname.startsWith("/login/")) {
      return;
    }

    if (isGuestStatsOnly) {
      if (!isGuestStatsPathAllowed(pathname)) {
        router.replace(GUEST_STATS_HOME_PATH);
      }
      return;
    }

    if (pathname === "/" && !canSeeCc) {
      router.replace(resolvePostLoginPath(userRoles, canSeeCc));
    }
  }, [loading, isAdmin, canView, userRoles, isGuestStatsOnly, pathname, router]);

  return null;
}
