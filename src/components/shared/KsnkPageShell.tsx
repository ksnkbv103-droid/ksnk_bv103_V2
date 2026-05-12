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

/** Khối tiêu đề trang dùng chung (từng module có thể thay dần header “tự chế” bằng component này). */
export function KsnkPageHeader({ title, subtitle, actions }: KsnkPageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-slate-200/90 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
