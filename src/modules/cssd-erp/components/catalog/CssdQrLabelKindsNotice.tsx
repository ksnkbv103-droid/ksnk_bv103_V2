"use client";

/**
 * D-19 — phân biệt tem bộ vĩnh viễn vs tem chu trình túi hấp (mặc định thu gọn).
 */
export function CssdQrLabelKindsNotice({ className = "" }: { className?: string }) {
  return (
    <details className={className}>
      <summary className="cursor-pointer text-[11px] font-semibold text-slate-500 hover:text-slate-800">
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
