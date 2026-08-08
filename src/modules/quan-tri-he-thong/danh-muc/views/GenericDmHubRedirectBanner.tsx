"use client";

import React from "react";
import Link from "next/link";
import { REGISTRY_LOAI_TRUNG_TAM_ONLY } from "@/lib/master-data/domain-registry";
import { getDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";
import { KsnkContextBanner } from "@/components/shared/KsnkContextBanner";

export default function GenericDmHubRedirectBanner({ registryKey }: { registryKey: string }) {
  if (!REGISTRY_LOAI_TRUNG_TAM_ONLY.has(registryKey)) return null;
  const hubPrimaryHref = getDanhMucAdminPath(registryKey);
  return (
    <KsnkContextBanner
      tone="amber"
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
