// src/app/giam-sat-chung/layout.tsx
"use client";

import React from "react";
import { useModulePermission } from "@/hooks/useModulePermission";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";

const MODULE_KEY = "GIAM_SAT_CHUNG";

export default function GiamSatChungLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useModulePermission(MODULE_KEY);

  if (loading) {
    return <SupervisionPageSkeleton />;
  }

  return <div className={bv103DesignTokens.pageOuter}>{children}</div>;
}
