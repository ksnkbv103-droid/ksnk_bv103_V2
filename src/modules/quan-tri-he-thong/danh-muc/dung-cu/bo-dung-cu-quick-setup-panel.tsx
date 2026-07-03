"use client";

import React, { useState } from "react";
import { ChevronRight, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";
import { quanTriFormChrome as UI } from "@/modules/quan-tri-he-thong/lib/quan-tri-form-chrome";

type Props = {
  onStartCreateBo: () => void;
  lastCreatedMaBo?: string | null;
};

/** Hướng dẫn wizard 3 bước — mở form bộ có sẵn ở bước 1. */
export function BoDungCuQuickSetupPanel({ onStartCreateBo, lastCreatedMaBo }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`${UI.sectionGap} rounded-2xl border border-[var(--primary)]/20 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-sm`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--primary)]">
            <Sparkles size={14} aria-hidden /> Tạo bộ nhanh
          </p>
          <p className="mt-1 text-sm text-slate-600">Khoa → mã bộ → thành phần → in tem CSSD</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-emerald-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-[var(--primary)] hover:bg-emerald-50"
        >
          {open ? "Thu gọn" : "Bắt đầu"}
        </button>
      </div>

      {open ? (
        <ol className="mt-4 grid gap-2 md:grid-cols-3">
          <li className="rounded-xl border border-white bg-white/90 p-3">
            <span className="text-[11px] font-bold text-emerald-700">1 · Bộ</span>
            <p className="text-xs font-semibold text-slate-800">Chọn khoa, nhập tên bộ</p>
            <button
              type="button"
              onClick={onStartCreateBo}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--primary)] underline"
            >
              Mở form thêm bộ <ChevronRight size={12} />
            </button>
          </li>
          <li className="rounded-xl border border-white bg-white/90 p-3">
            <span className="text-[11px] font-bold text-emerald-700">2 · Thành phần</span>
            <p className="text-xs font-semibold text-slate-800">Chọn bộ → thêm dòng chi tiết</p>
            <Link href={quanTriDungCuHref("chi-tiet")} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--primary)] underline">
              Tab thành phần <ChevronRight size={12} />
            </Link>
          </li>
          <li className="rounded-xl border border-white bg-white/90 p-3">
            <span className="text-[11px] font-bold text-emerald-700">3 · In tem</span>
            <p className="text-xs font-semibold text-slate-800">QR = ma_bo (vd. B01.SET.01)</p>
            <Link href="/cssd-dung-cu" className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--primary)] underline">
              Catalog CSSD · in tem <ChevronRight size={12} />
            </Link>
          </li>
        </ol>
      ) : null}

      {lastCreatedMaBo ? (
        <p className="mt-3 rounded-lg bg-emerald-100/60 px-3 py-2 text-xs font-medium text-emerald-900">
          Bộ vừa tạo: <span className="font-mono font-bold">{lastCreatedMaBo}</span> — chọn dòng bộ bên dưới để thêm thành phần.
        </p>
      ) : null}

      {open ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600"
        >
          <X size={12} /> Đóng hướng dẫn
        </button>
      ) : null}
    </div>
  );
}
