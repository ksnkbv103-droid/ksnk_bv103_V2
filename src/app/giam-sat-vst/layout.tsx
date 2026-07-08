// src/app/giam-sat-vst/layout.tsx
"use client";

import React, { Suspense } from "react";
import { VstModuleAccessGate } from "@/modules/giam-sat-vst/components/VstModuleAccessGate";
import SupervisionModeNav from "@/components/shared/SupervisionModeNav";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";

export default function GiamSatVstLayout({ children }: { children: React.ReactNode }) {
  return (
    <VstModuleAccessGate>
      <div className={`${bv103DesignTokens.pageOuter} space-y-3`}>
        <Suspense fallback={null}>
          <SupervisionModeNav module="vst" ariaLabel="Giám sát vệ sinh tay" />
        </Suspense>
        {children}
      </div>
    </VstModuleAccessGate>
  );
}
