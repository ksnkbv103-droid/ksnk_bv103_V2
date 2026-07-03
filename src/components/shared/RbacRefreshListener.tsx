"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { invalidateClientRbacCache } from "@/hooks/usePermission";

const POLL_MS = 30_000;

/** Refetch quyền client khi điều hướng / focus tab / poll — tránh giữ menu cũ tối đa 5 phút. */
export default function RbacRefreshListener() {
  const pathname = usePathname();

  useEffect(() => {
    invalidateClientRbacCache();
    window.dispatchEvent(new Event("rbac:invalidate"));
  }, [pathname]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      invalidateClientRbacCache();
      window.dispatchEvent(new Event("rbac:invalidate"));
    };

    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        invalidateClientRbacCache();
        window.dispatchEvent(new Event("rbac:invalidate"));
      }
    }, POLL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
