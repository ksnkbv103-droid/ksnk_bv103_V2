"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

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

/** Khối tiêu đề trang dùng chung — `bv103DesignTokens.pageTitle` */
export function KsnkPageHeader({ title, subtitle, actions }: KsnkPageHeaderProps) {
  return (
    <header className="mb-4 flex flex-col gap-2 border-b border-slate-200/90 pb-3 sm:mb-8 sm:gap-3 sm:flex-row sm:items-end sm:justify-between sm:pb-6">
      <div className="min-w-0">
        <h1 className={`${T.pageTitle} max-sm:text-lg`}>{title}</h1>
        {subtitle ? <p className={`${T.pageSubtitle} max-sm:hidden`}>{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

type KsnkListPageHeaderProps = {
  title: string;
  eyebrow?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
};

/** Toolbar danh sách MDM / master — card header + CTA (Phase 1 Quản trị). */
export function KsnkListPageHeader({ title, eyebrow, icon: Icon, actions }: KsnkListPageHeaderProps) {
  return (
    <header className={`${T.pageToolbar} max-sm:p-4`}>
      <div className="min-w-0">
        <h1 className={`inline-flex items-center gap-2 ${T.pageTitle} max-sm:text-lg`}>
          {Icon ? <Icon className="h-5 w-5 shrink-0 text-[var(--primary)] sm:h-6 sm:w-6" aria-hidden /> : null}
          {title}
        </h1>
        {eyebrow ? <p className={`${T.pageEyebrow} max-sm:hidden`}>{eyebrow}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:gap-3 sm:justify-end">{actions}</div> : null}
    </header>
  );
}
