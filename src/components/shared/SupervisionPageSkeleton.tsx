"use client";

import React from "react";

export default function SupervisionPageSkeleton() {
  return (
    <div className="space-y-4 px-4 py-6" aria-busy="true">
      <div className="h-8 w-64 animate-pulse rounded-xl bg-slate-200" />
      <div className="h-4 w-96 animate-pulse rounded-xl bg-slate-100" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <div className="h-[40vh] animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}
