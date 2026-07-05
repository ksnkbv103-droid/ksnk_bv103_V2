// src/app/lich-su/layout.tsx
"use client";

import React, { Suspense } from "react";
import { Stethoscope, ClipboardList } from "lucide-react";
import {
  KsnkSupervisionHero,
  KsnkSupervisionTabLinks,
  type SupervisionTabLinkDef,
} from "@/components/shared/ksnk-supervision-chrome";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";

const historyTabs: SupervisionTabLinkDef[] = [
  { id: "vst", label: "Vệ sinh tay", mobileLabel: "VST", icon: Stethoscope, href: "/lich-su/vst" },
  { id: "gsc", label: "Giám sát chung", mobileLabel: "GSC", icon: ClipboardList, href: "/lich-su/gsc" },
];

export default function LichSuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={bv103DesignTokens.pageOuter}>
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
            <KsnkSupervisionTabLinks tabs={historyTabs} ariaLabel="Lịch sử giám sát" />
          }
        />
      </Suspense>

      {children}
    </div>
  );
}
