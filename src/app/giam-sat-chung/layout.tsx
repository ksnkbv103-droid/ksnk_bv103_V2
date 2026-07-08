// src/app/giam-sat-chung/layout.tsx
"use client";

import React, { Suspense } from "react";
import { useModulePermission } from "@/hooks/useModulePermission";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import SupervisionModeNav from "@/components/shared/SupervisionModeNav";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";

const MODULE_KEY = "GIAM_SAT_CHUNG";

export default function GiamSatChungLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useModulePermission(MODULE_KEY);

  if (loading) {
    return <SupervisionPageSkeleton />;
  }

  return (
    <div className={`${bv103DesignTokens.pageOuter} space-y-3`}>
      <Suspense fallback={null}>
        <SupervisionModeNav module="gsc" ariaLabel="Giám sát tuân thủ KSNK" />
      </Suspense>
      {children}
    </div>
  );
}
