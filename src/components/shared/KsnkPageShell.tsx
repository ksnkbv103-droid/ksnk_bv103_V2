"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { KsnkPageChrome } from "@/components/shared/KsnkPageChrome";

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
      className="mx-auto w-full max-w-7xl min-h-[40vh]"
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

/** Khối tiêu đề trang Admin — cùng `KsnkPageChrome`. */
export function KsnkPageHeader({ title, subtitle, actions }: KsnkPageHeaderProps) {
  return <KsnkPageChrome title={title} subtitle={subtitle} actions={actions} showTitle />;
}

type KsnkListPageHeaderProps = {
  title: string;
  eyebrow?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
};

/** Toolbar danh sách MDM / master — cùng mật độ chrome với hub. */
export function KsnkListPageHeader({ title, eyebrow, icon: Icon, actions }: KsnkListPageHeaderProps) {
  return (
    <KsnkPageChrome
      eyebrow={eyebrow}
      title={
        <span className="inline-flex items-center gap-2">
          {Icon ? <Icon className="h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden /> : null}
          {title}
        </span>
      }
      actions={actions}
      showTitle
    />
  );
}
