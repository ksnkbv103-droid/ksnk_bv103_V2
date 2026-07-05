"use client";

import { AlertTriangle } from "lucide-react";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { MobileCollapsibleNotice } from "@/components/shared/MobileCollapsibleNotice";

export default function VstModuleLockBanner({
  lockedUntilDate,
  lockMessage,
}: {
  lockedUntilDate: string | null;
  lockMessage: string | null;
}) {
  if (!lockedUntilDate || !lockMessage) return null;
  return (
    <MobileCollapsibleNotice
      className={`${C.noticeAmber} px-3 py-2 text-sm sm:px-4 sm:py-3`}
      icon={<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />}
      summary={<span className="font-semibold">VST khóa báo cáo đến {lockedUntilDate}</span>}
      detail={lockMessage}
      dismissible={false}
    />
  );
}
