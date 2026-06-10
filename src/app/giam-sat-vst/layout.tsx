// src/app/giam-sat-vst/layout.tsx
"use client";

import React, { Suspense } from "react";
import { useModulePermission } from "@/hooks/useModulePermission";
import { KsnkSupervisionHero } from "@/components/shared/ksnk-supervision-chrome";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const MODULE_KEY = "GIAM_SAT_VST";

export default function GiamSatVstLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useModulePermission(MODULE_KEY);

  if (loading) {
    return <SupervisionPageSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12">
      <Suspense fallback={null}>
        <KsnkSupervisionHero
          eyebrow="Giám sát thực hành"
          title={
            <>
              Vệ sinh tay <span className="text-[var(--primary)]">(WHO)</span>
            </>
          }
        />
      </Suspense>

      {children}
    </div>
  );
}
