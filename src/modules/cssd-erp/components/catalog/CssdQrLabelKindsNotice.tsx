"use client";

import { CSSD_UI_LINK_QUIET } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

/**
 * D-19 — phân biệt tem bộ vĩnh viễn vs tem chu trình túi hấp (mặc định thu gọn).
 * Quiet docs chrome in ops toolbars (P1-4 / X6) — not equal to primary scan.
 */
export function CssdQrLabelKindsNotice({ className = "" }: { className?: string }) {
  return (
    <details className={className}>
      <summary className={`cursor-pointer list-none ${CSSD_UI_LINK_QUIET}`}>
        Phân biệt tem QR
      </summary>
      <p className="mt-1.5 max-w-xl text-[11px] leading-snug text-slate-500">
        <span className="font-semibold text-slate-700">Tem bộ</span> (vd. B01.SET.01) ·{" "}
        <span className="font-semibold text-slate-700">Tem chu trình</span> (túi hấp BV103-CYC-…) ·{" "}
        <span className="font-semibold text-slate-700">Mẻ</span> (LOT-…) — không trộn. Dual-code:{" "}
        <span className="font-mono">B01.SET.*</span> alias <span className="font-mono">B01.CD*</span> /{" "}
        <span className="font-mono">BO-01-*</span>.
      </p>
    </details>
  );
}
