"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useModulePermission } from "@/hooks/useModulePermission";
import { quanTriHubHref } from "@/lib/master-data/quan-tri-paths";
import { KsnkContextBanner } from "@/components/shared/KsnkContextBanner";

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
      <div className="mx-auto max-w-lg py-6">
        <KsnkContextBanner
          tone="amber"
          dismissible={false}
          icon={<ShieldAlert className="h-4 w-4" aria-hidden />}
          summary={<span className="text-sm font-semibold">Không có quyền xem {label}</span>}
          detail={
            <div className="space-y-2">
              <p className="text-xs">
                Cần quyền <span className="font-mono font-semibold">{moduleKey}</span> → View trên ma trận phân quyền.
              </p>
              <Link
                href={quanTriHubHref("PHAN_QUYEN")}
                className="inline-block text-xs font-semibold text-[var(--primary)] underline"
              >
                Mở ma trận phân quyền
              </Link>
            </div>
          }
        />
      </div>
    );
  }
  return <>{children}</>;
}
