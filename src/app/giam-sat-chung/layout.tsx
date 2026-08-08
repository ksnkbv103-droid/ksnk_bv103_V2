// src/app/giam-sat-chung/layout.tsx
"use client";

import React, { Suspense } from "react";
import SupervisionModeNav from "@/components/shared/SupervisionModeNav";
import { KsnkPageChrome } from "@/components/shared/KsnkPageChrome";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { GscModuleAccessGate } from "@/modules/giam-sat-chung/components/GscModuleAccessGate";

export default function GiamSatChungLayout({ children }: { children: React.ReactNode }) {
  return (
    <GscModuleAccessGate>
      <div className={bv103DesignTokens.pageOuter}>
        <Suspense fallback={null}>
          <KsnkPageChrome
            showTitle={false}
            tabs={<SupervisionModeNav module="gsc" ariaLabel="Giám sát tuân thủ KSNK" />}
          />
        </Suspense>
        {children}
      </div>
    </GscModuleAccessGate>
  );
}
