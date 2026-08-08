"use client";

import { Building2 } from "lucide-react";
import { KsnkContextBanner } from "@/components/shared/KsnkContextBanner";

export function AnalyticsKhoaScopeBanner({ khoaLabel }: { khoaLabel: string }) {
  return (
    <KsnkContextBanner
      tone="sky"
      icon={<Building2 size={16} className="mt-0.5 shrink-0 text-sky-600" aria-hidden />}
      summary={
        <span>
          <span className="font-semibold">Phạm vi khoa:</span> {khoaLabel}
        </span>
      }
    />
  );
}
