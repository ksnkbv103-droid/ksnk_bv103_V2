"use client";

import { AlertTriangle } from "lucide-react";

export default function GscModuleLockBanner({
  lockedUntilDate,
  lockMessage,
}: {
  lockedUntilDate: string | null;
  lockMessage: string | null;
}) {
  if (!lockedUntilDate || !lockMessage) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <div>
        <p className="font-semibold">Module GSC đang khóa báo cáo đến {lockedUntilDate}</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-900/90">{lockMessage}</p>
      </div>
    </div>
  );
}
