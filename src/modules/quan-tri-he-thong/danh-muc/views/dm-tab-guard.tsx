"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useModulePermission } from "@/hooks/useModulePermission";
import { quanTriHubHref } from "@/lib/master-data/quan-tri-paths";

/** Cổng quyền theo tab — không chặn cả trang khi thiếu quyền một phân hệ. */
export function DmTabGuard({
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
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }
  if (!allowed.view) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50/60 p-8 text-center">
        <p className="text-sm font-semibold text-amber-900">Không có quyền xem {label}</p>
        <p className="mt-2 text-xs text-amber-800/90">
          Cần quyền <span className="font-mono font-bold">{moduleKey}</span> → View trên ma trận phân quyền.
        </p>
        <Link
          href={quanTriHubHref("PHAN_QUYEN")}
          className="mt-4 inline-block text-xs font-semibold text-[var(--primary)] underline"
        >
          Mở ma trận phân quyền
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
