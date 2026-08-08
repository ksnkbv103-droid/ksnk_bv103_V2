"use client";

/**
 * D-19 — phân biệt tem bộ vĩnh viễn vs tem chu trình túi hấp (copy ngắn, không chiếm viewport).
 */
export function CssdQrLabelKindsNotice({ className = "" }: { className?: string }) {
  return (
    <aside
      className={`rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-[11px] text-slate-600 ${className}`}
      aria-label="Phân biệt loại tem QR CSSD"
    >
      <p>
        <span className="font-semibold text-emerald-800">Tem bộ</span> (mã bộ, lâu dài) ·{" "}
        <span className="font-semibold text-amber-800">Tem chu trình</span> (túi hấp, một vòng) — không trộn.
      </p>
    </aside>
  );
}
