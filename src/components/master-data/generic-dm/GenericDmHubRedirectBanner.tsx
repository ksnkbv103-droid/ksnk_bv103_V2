"use client";

import React from "react";
import Link from "next/link";
import { DM_HUB_LABELS, REGISTRY_LOAI_TRUNG_TAM_ONLY } from "@/lib/master-data/domain-registry";
import { getDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";
import { KsnkContextBanner } from "@/components/shared/KsnkContextBanner";

export default function GenericDmHubRedirectBanner({ registryKey }: { registryKey: string }) {
  if (!REGISTRY_LOAI_TRUNG_TAM_ONLY.has(registryKey)) return null;
  const hubPrimaryHref = getDanhMucAdminPath(registryKey);
  const label = DM_HUB_LABELS[registryKey] || "Danh mục này";
  return (
    <KsnkContextBanner
      tone="amber"
      dismissible={false}
      summary={
        <span>
          {label} quản lý tại trang chuyên dụng —{" "}
          <Link href={hubPrimaryHref} className="font-semibold text-[var(--primary)] underline">
            Mở trang chuyên dụng
          </Link>
          .
        </span>
      }
    />
  );
}
