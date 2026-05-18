"use client";

import React from "react";
import CSSDSubNav from "../navigation/CSSDSubNav";

/** SubNav + khe cắm link phụ (Mẻ TK, v.v.) — dùng trên mọi route module CSSD canonical. */
export default function CssdModuleChrome({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-6 space-y-4 ${className}`.trim()}>
      <CSSDSubNav />
      {children}
    </div>
  );
}
