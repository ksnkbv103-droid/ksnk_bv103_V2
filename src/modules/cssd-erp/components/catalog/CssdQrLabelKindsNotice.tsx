"use client";

/**
 * D-19 — phân biệt tem bộ vĩnh viễn vs tem chu trình túi hấp (mặc định thu gọn).
 */
export function CssdQrLabelKindsNotice({ className = "" }: { className?: string }) {
  return (
    <details
      className={`rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-[11px] text-slate-600 ${className}`}
    >
      <summary className="cursor-pointer font-semibold text-slate-700">Phân biệt tem QR</summary>
      <p className="mt-1.5">
        <span className="font-semibold text-emerald-800">Tem bộ</span> (vd. B01.SET.01) ·{" "}
        <span className="font-semibold text-amber-800">Tem chu trình</span> (túi hấp BV103-CYC-…) ·{" "}
        <span className="font-semibold text-slate-700">Mẻ</span> (LOT-…) — không trộn.
      </p>
      <p className="mt-1 text-slate-500">
        Dual-code: tem quét <span className="font-mono font-semibold text-slate-700">B01.SET.*</span> alias{" "}
        <span className="font-mono">B01.CD*</span> / <span className="font-mono">BO-01-*</span> (cùng một bộ vật lý —
        resolve qua QR Hub).
      </p>
    </details>
  );
}
