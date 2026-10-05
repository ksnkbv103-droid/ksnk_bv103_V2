// src/app/lich-su/layout.tsx
"use client";

import React, { Suspense } from "react";
import Link from "next/link";
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
  const supervisionModule = pathname?.includes("/lich-su/gsc") ? "gsc" : "vst";
  const isVst = supervisionModule === "vst";

  return (
    <div className={bv103DesignTokens.pageOuter}>
      <Suspense fallback={null}>
        <KsnkSupervisionHero
          title="Lịch sử giám sát"
          sticky
          trailing={
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <SupervisionModeNav
                module={supervisionModule}
                ariaLabel={
                  supervisionModule === "vst"
                    ? "Giám sát vệ sinh tay"
                    : "Giám sát tuân thủ KSNK"
                }
              />
              <KsnkSupervisionTabLinks tabs={historyTabs} ariaLabel="Lịch sử giám sát" />
            </div>
          }
        />
      </Suspense>

      {isVst ? (
        <p className="no-print mb-2 px-0.5 text-[11px] leading-snug text-slate-500">
          Khối Vệ sinh tay ·{" "}
          <Link
            href="/lich-su/gsc?bk=KSNK.QT.07.BM.02"
            className="font-medium text-[var(--primary)] underline"
          >
            BM.02
          </Link>
          {" / "}
          <Link
            href="/lich-su/gsc?bk=KSNK.QT.07.BM.03"
            className="font-medium text-[var(--primary)] underline"
          >
            BM.03
          </Link>
        </p>
      ) : null}

      {children}
    </div>
  );
}
