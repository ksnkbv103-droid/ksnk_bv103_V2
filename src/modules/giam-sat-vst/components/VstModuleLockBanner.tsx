"use client";

import { AlertTriangle } from "lucide-react";
import { KsnkContextBanner } from "@/components/shared/KsnkContextBanner";

export default function VstModuleLockBanner({
  lockedUntilDate,
  lockMessage,
}: {
  lockedUntilDate: string | null;
  lockMessage: string | null;
}) {
  if (!lockedUntilDate || !lockMessage) return null;
  return (
    <KsnkContextBanner
      tone="amber"
      dismissible={false}
      icon={<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />}
      summary={<span className="font-semibold">VST khóa báo cáo đến {lockedUntilDate}</span>}
      detail={lockMessage}
    />
  );
}
