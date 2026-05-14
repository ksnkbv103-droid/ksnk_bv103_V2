// src/components/shared/GiamSatHeaderPatientFields.tsx
"use client";

import React, { type Dispatch, type SetStateAction } from "react";
import type { GiamSatSession } from "./giam-sat-header.types";

interface GiamSatHeaderPatientFieldsProps {
  session: GiamSatSession;
  setSession: Dispatch<SetStateAction<GiamSatSession>>;
  /** Số thứ tự nhãn cột (5–7 nếu chỉ NB; 8–10 nếu đã có khối nhân viên 5–7). */
  labelStartIndex: number;
}

export default function GiamSatHeaderPatientFields({
  session,
  setSession,
  labelStartIndex,
}: GiamSatHeaderPatientFieldsProps) {
  const a = labelStartIndex;
  const b = labelStartIndex + 1;
  const c = labelStartIndex + 2;

  return (
    <div className="min-w-0">
      <div className="rounded-lg border border-slate-200/90 bg-slate-50/35 p-4 sm:p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-700">Thông tin người bệnh (tùy chọn)</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-3">
          <div className="min-w-0 space-y-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              {a}. Mã người bệnh
            </label>
            <input
              className="input h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]/20 sm:h-11"
              placeholder="Mã hồ sơ / mã nội bộ…"
              autoComplete="off"
              value={session.ma_nguoi_benh || ""}
              onChange={(e) => setSession({ ...session, ma_nguoi_benh: e.target.value })}
            />
          </div>
          <div className="min-w-0 space-y-1 sm:col-span-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              {b}. Tên người bệnh
            </label>
            <input
              className="input h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]/20 sm:h-11"
              placeholder="Họ và tên…"
              autoComplete="off"
              value={session.ten_nguoi_benh || ""}
              onChange={(e) => setSession({ ...session, ten_nguoi_benh: e.target.value })}
            />
          </div>
          <div className="min-w-0 space-y-1 sm:col-span-3">
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              {c}. Số giường
            </label>
            <input
              className="input h-10 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]/20 sm:h-11"
              placeholder="Ví dụ: 12A, G2…"
              autoComplete="off"
              value={session.so_giuong_nguoi_benh || ""}
              onChange={(e) => setSession({ ...session, so_giuong_nguoi_benh: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
