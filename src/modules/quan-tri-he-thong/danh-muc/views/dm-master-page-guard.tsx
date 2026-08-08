"use client";

import type { ReactNode } from "react";
import { useModulePermission } from "@/hooks/useModulePermission";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

/** Cổng quyền client cho trang master dedicated (khớp mã `permission-registry`). */
export function DmMasterPageGuard({
  moduleKey,
  label,
  children,
}: {
  moduleKey: string;
  label: string;
  children: ReactNode;
}) {
  const { loading, allowed } = useModulePermission(moduleKey);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }
  if (!allowed.view) {
    return (
      <div className={`mx-auto max-w-xl ${C.panelSurface} p-10 text-center`}>
        <p className="text-sm font-semibold text-slate-500">Không có quyền truy cập</p>
        <p className="mt-2 text-[11px] font-medium text-slate-500">{label}</p>
      </div>
    );
  }
  return <>{children}</>;
}
