"use client";

import React from "react";

/** Khe cắm link phụ (Mẻ TK, v.v.) — dùng trên mọi route module CSSD canonical. */
export default function CssdModuleChrome({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 space-y-3 sm:mb-6 sm:space-y-4 ${className}`.trim()}>
      {children}
    </div>
  );
}
