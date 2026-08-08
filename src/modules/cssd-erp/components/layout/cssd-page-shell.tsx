"use client";

import React from "react";
import { KsnkSupervisionHero } from "@/components/shared/ksnk-supervision-chrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

/** Vỏ trang CSSD — nhịp dọc = `pageOuter` SSOT. */
export const CSSD_PAGE_OUTER = `${T.pageOuter} animate-in fade-in duration-500 touch-manipulation`;

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/** Khung trang CSSD: hero (title/actions) + nội dung. Chuyển màn = sidebar (SSOT). */
export default function CSSDPageShell({
  title,
  subtitle: _subtitle,
  actions,
  children,
}: Props) {
  return (
    <div className={CSSD_PAGE_OUTER}>
      <KsnkSupervisionHero eyebrow="CSSD" title={title} actions={actions} />
      {children}
    </div>
  );
}
