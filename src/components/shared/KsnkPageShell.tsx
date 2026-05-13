"use client";

import React from "react";

type KsnkPageShellProps = {
  children: React.ReactNode;
  /** Gắn telemetry / E2E: ví dụ `phase-1`. */
  rolloutPhase?: string;
};

/**
 * Vỏ nội dung KSNK (pha 1): max-width + nhịp ngang — dùng chung cho giám sát & quản trị.
 * Header toàn app + Sidebar vẫn do `ClientLayoutWrapper`; component này chỉ “khung” vùng `<main>`.
 */
export default function KsnkPageShell({ children, rolloutPhase = "phase-1" }: KsnkPageShellProps) {
  return (
    <div
      data-ksnk-page-shell={rolloutPhase}
      className="mx-auto w-full max-w-7xl min-h-[40vh] touch-manipulation"
    >
      {children}
    </div>
  );
}

type KsnkPageHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
};

/** Khối tiêu đề trang dùng chung — cỡ chữ khớp `--bv103-page-title*` trong globals.css */
export function KsnkPageHeader({ title, subtitle, actions }: KsnkPageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3 border-b border-slate-200/90 pb-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pb-6">
      <div className="min-w-0">
        <h1 className="text-[length:var(--bv103-page-title)] font-semibold leading-tight tracking-tight text-slate-900 md:text-[length:var(--bv103-page-title-md)]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:mt-2">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
