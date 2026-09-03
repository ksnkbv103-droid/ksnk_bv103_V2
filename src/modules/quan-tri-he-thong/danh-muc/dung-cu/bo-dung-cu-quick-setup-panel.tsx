"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

type Props = {
  onStartCreateBo: () => void;
  lastCreatedMaBo?: string | null;
  canWriteMaster?: boolean;
};

/** Hướng dẫn 3 bước — mặc định thu gọn như import Excel SXH. */
export function BoDungCuQuickSetupPanel({ onStartCreateBo, lastCreatedMaBo, canWriteMaster = true }: Props) {
  return (
    <div className="space-y-2">
      <details className="rounded-[var(--radius-control)] border border-slate-200 bg-slate-50/70 px-3 py-2">
        <summary className="cursor-pointer text-[11px] font-semibold text-slate-500">Tạo bộ nhanh</summary>
        <ol className="mt-2 grid gap-2 text-[11px] text-slate-600 md:grid-cols-3">
          <li>
            <span className="font-semibold text-slate-800">1 · Bộ</span>
            {canWriteMaster ? (
              <button type="button" onClick={onStartCreateBo} className="mt-1 flex items-center gap-1 font-semibold text-[var(--primary)]">
                Mở form thêm bộ <ChevronRight size={12} />
              </button>
            ) : (
              <p className="mt-1">Chỉ quản trị thêm bộ. Nhân viên dùng phiếu rà soát.</p>
            )}
          </li>
          <li>
            <span className="font-semibold text-slate-800">2 · Thành phần</span>
            <p className="mt-1">Chọn dòng bộ bên dưới.</p>
          </li>
          <li>
            <span className="font-semibold text-slate-800">3 · In tem</span>
            <Link href="/cssd-dung-cu" className="mt-1 flex items-center gap-1 font-semibold text-[var(--primary)]">
              Catalog CSSD <ChevronRight size={12} />
            </Link>
          </li>
        </ol>
      </details>
      {lastCreatedMaBo ? (
        <p className="text-[11px] font-medium text-emerald-800">
          Bộ vừa tạo: <span className="font-mono font-bold">{lastCreatedMaBo}</span>
          {" — "}
          <Link href={quanTriDungCuHref("bo")} className="font-semibold underline">
            chọn dòng để thêm thành phần
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
