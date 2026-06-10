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
    <header className="mb-6 flex flex-col gap-3 border-b border-slate-200/90 pb-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pb-6">
      <div className="min-w-0">
        <h1 className={T.pageTitle}>{title}</h1>
        {subtitle ? <p className={T.pageSubtitle}>{subtitle}</p> : null}
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
    <header className={T.pageToolbar}>
      <div className="min-w-0">
        <h1 className={`inline-flex items-center gap-2.5 ${T.pageTitle}`}>
          {Icon ? <Icon className="h-6 w-6 shrink-0 text-[var(--primary)]" aria-hidden /> : null}
          {title}
        </h1>
        {eyebrow ? <p className={T.pageEyebrow}>{eyebrow}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-3 sm:w-auto sm:justify-end">{actions}</div> : null}
    </header>
  );
}
