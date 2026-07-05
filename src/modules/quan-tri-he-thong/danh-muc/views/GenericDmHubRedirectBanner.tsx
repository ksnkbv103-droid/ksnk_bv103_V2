"use client";

import React from "react";
import Link from "next/link";
import { REGISTRY_LOAI_TRUNG_TAM_ONLY } from "@/lib/master-data/domain-registry";
import { getDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";
import { MobileCollapsibleNotice } from "@/components/shared/MobileCollapsibleNotice";

export default function GenericDmHubRedirectBanner({ registryKey }: { registryKey: string }) {
  if (!REGISTRY_LOAI_TRUNG_TAM_ONLY.has(registryKey)) return null;
  const hubPrimaryHref = getDanhMucAdminPath(registryKey);
  return (
    <MobileCollapsibleNotice
      className="rounded-[var(--radius-shell)] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-900 sm:px-4 sm:py-3"
      dismissible={false}
      summary={
        <span>
          Loại <strong>{registryKey}</strong> quản lý tại trang chuyên dụng.
        </span>
      }
      detail={
        <>
          Nên dùng{" "}
          <Link href={hubPrimaryHref} className="text-[var(--primary)] underline">
            đường dẫn chuẩn
          </Link>{" "}
          để đồng bộ thống kê và giao diện.
        </>
      }
    />
  );
}
