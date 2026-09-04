// src/app/lich-su/layout.tsx
"use client";

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Stethoscope, ClipboardList } from "lucide-react";
import {
  KsnkSupervisionHero,
  KsnkSupervisionTabLinks,
  type SupervisionTabLinkDef,
} from "@/components/shared/ksnk-supervision-chrome";
import SupervisionModeNav from "@/components/shared/SupervisionModeNav";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";

const historyTabs: SupervisionTabLinkDef[] = [
  { id: "vst", label: "Vệ sinh tay", mobileLabel: "VST", icon: Stethoscope, href: "/lich-su/vst" },
  { id: "gsc", label: "Giám sát chung", mobileLabel: "GSC", icon: ClipboardList, href: "/lich-su/gsc" },
];

export default function LichSuLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const module = pathname?.includes("/lich-su/gsc") ? "gsc" : "vst";

  return (
    <div className={bv103DesignTokens.pageOuter}>
      <Suspense fallback={null}>
        <KsnkSupervisionHero
          title="Lịch sử giám sát"
          trailing={
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <SupervisionModeNav
                module={module}
                ariaLabel={module === "vst" ? "Giám sát vệ sinh tay" : "Giám sát tuân thủ KSNK"}
              />
              <KsnkSupervisionTabLinks tabs={historyTabs} ariaLabel="Lịch sử giám sát" />
            </div>
          }
        />
      </Suspense>

      {children}
    </div>
  );
}
