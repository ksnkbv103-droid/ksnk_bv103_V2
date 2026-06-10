// src/app/lich-su/layout.tsx
"use client";

import React, { Suspense } from "react";
import { History, Stethoscope, ClipboardList } from "lucide-react";
import {
  KsnkSupervisionHero,
  KsnkSupervisionTabLinks,
  type SupervisionTabLinkDef,
} from "@/components/shared/ksnk-supervision-chrome";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const historyTabs: SupervisionTabLinkDef[] = [
  { id: "vst", label: "Vệ sinh tay", icon: Stethoscope, href: "/lich-su/vst" },
  { id: "gsc", label: "Giám sát chung", icon: ClipboardList, href: "/lich-su/gsc" },
];

export default function LichSuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 pb-12">
      <Suspense fallback={null}>
        <KsnkSupervisionHero
          eyebrow="Tra cứu"
          title={
            <>
              Lịch sử giám sát{" "}
              <span className="text-[var(--primary)]">KSNK</span>
            </>
          }
          trailing={
            <KsnkSupervisionTabLinks
              tabs={historyTabs}
              ariaLabel="Lịch sử giám sát"
            />
          }
        />
      </Suspense>

      {children}
    </div>
  );
}
