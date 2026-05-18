"use client";

import React from "react";
import { KsnkSupervisionHero } from "@/components/shared/ksnk-supervision-chrome";


/** Vỏ trang CSSD trong `KsnkPageShell` — không nhân đôi max-width/padding của `<main>`. */
export const CSSD_PAGE_OUTER =
  "w-full min-h-[40vh] space-y-6 pb-12 animate-in fade-in duration-500 touch-manipulation [-webkit-tap-highlight-color:transparent]";

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/** Khung trang CSSD ERP: hero + SubNav + nội dung — đồng bộ với giám sát / Quản trị. */
export default function CSSDPageShell({ title, subtitle, actions, children }: Props) {
  return (
    <div className={CSSD_PAGE_OUTER}>
      <KsnkSupervisionHero eyebrow="CSSD · BV103" title={title} description={typeof subtitle === "string" ? subtitle : undefined} actions={actions} />
      {children}
    </div>
  );
}

