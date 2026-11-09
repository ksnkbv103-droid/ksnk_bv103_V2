"use client";

import React from "react";
import { KsnkSupervisionHero } from "@/components/shared/ksnk-supervision-chrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

/** Vỏ trang CSSD — nhịp dọc = `pageOuter` SSOT. */
export const CSSD_PAGE_OUTER = `${T.pageOuter} animate-in fade-in duration-500 touch-manipulation`;

type Props = {
  title: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /**
   * P0-2 title policy: App Header (`getKsnkAppHeaderBreadcrumb`) is SSOT for the page name.
   * Keep false when Header already names this route (default). Pass true only if Header is still generic.
   */
  showTitle?: boolean;
};

/** Khung trang CSSD: hero (actions/tabs) + nội dung. Tên trang = App Header, không H1 đôi. */
export default function CSSDPageShell({ title, actions, children, showTitle = false }: Props) {
  return (
    <div className={CSSD_PAGE_OUTER}>
      <KsnkSupervisionHero title={title} actions={actions} showTitle={showTitle} />
      {children}
    </div>
  );
}
