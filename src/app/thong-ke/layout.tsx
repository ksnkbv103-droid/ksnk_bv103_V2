// src/app/thong-ke/layout.tsx
"use client";

import React, { Suspense } from "react";
import { BarChart2, Stethoscope, ClipboardList } from "lucide-react";
import {
  KsnkSupervisionHero,
  KsnkSupervisionTabLinks,
  type SupervisionTabLinkDef,
} from "@/components/shared/ksnk-supervision-chrome";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const analyticsTabs: SupervisionTabLinkDef[] = [
  { id: "vst", label: "Vệ sinh tay", icon: Stethoscope, href: "/thong-ke/vst" },
  { id: "gsc", label: "Giám sát chung", icon: ClipboardList, href: "/thong-ke/gsc" },
];

export default function ThongKeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 pb-12">
      <Suspense fallback={null}>
        <KsnkSupervisionHero
          eyebrow="Phân tích"
          title={
            <>
              Thống kê giám sát{" "}
              <span className="text-[var(--primary)]">KSNK</span>
            </>
          }
          trailing={
            <KsnkSupervisionTabLinks
              tabs={analyticsTabs}
              ariaLabel="Thống kê giám sát"
            />
          }
        />
      </Suspense>

      {children}
    </div>
  );
}
