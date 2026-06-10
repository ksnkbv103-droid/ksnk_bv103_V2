// src/app/giam-sat-vst/layout.tsx
"use client";

import React from "react";
import { useModulePermission } from "@/hooks/useModulePermission";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const MODULE_KEY = "GIAM_SAT_VST";

export default function GiamSatVstLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useModulePermission(MODULE_KEY);

  if (loading) {
    return <SupervisionPageSkeleton />;
  }

  return <div className="space-y-6 pb-12">{children}</div>;
}
