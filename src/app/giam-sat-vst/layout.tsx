// src/app/giam-sat-vst/layout.tsx
"use client";

import React from "react";
import { VstModuleAccessGate } from "@/modules/giam-sat-vst/components/VstModuleAccessGate";

import { bv103DesignTokens } from "@/lib/bv103-design-tokens";

export default function GiamSatVstLayout({ children }: { children: React.ReactNode }) {
  return (
    <VstModuleAccessGate>
      <div className={bv103DesignTokens.pageOuter}>{children}</div>
    </VstModuleAccessGate>
  );
}
