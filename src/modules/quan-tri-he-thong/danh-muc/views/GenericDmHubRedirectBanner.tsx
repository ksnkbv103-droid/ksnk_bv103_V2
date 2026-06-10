"use client";

import React from "react";
import Link from "next/link";
import { REGISTRY_LOAI_TRUNG_TAM_ONLY } from "@/lib/master-data/domain-registry";
import { getDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";

export default function GenericDmHubRedirectBanner({ registryKey }: { registryKey: string }) {
  if (!REGISTRY_LOAI_TRUNG_TAM_ONLY.has(registryKey)) return null;
  const hubPrimaryHref = getDanhMucAdminPath(registryKey);
  return (
    <div className="rounded-[var(--radius-shell)] border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-bold text-amber-900">
      Loại <strong>{registryKey}</strong> được quản lý chính tại trang chuyên dụng (tab Trung tâm Danh mục). Nên dùng{" "}
      <Link href={hubPrimaryHref} className="text-[var(--primary)] underline">
        đường dẫn chuẩn
      </Link>{" "}
      để đồng bộ thống kê và giao diện.
    </div>
  );
}
