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
      <div className="rounded-xl border border-[#026f17]/15 bg-gradient-to-b from-[#026f17]/[0.05] to-white p-4 shadow-sm sm:p-5">
        <p className="mb-3 border-b border-[#026f17]/15 pb-2 text-[10px] font-black uppercase tracking-widest text-[#026f17]/85">
          Thông tin người bệnh (tùy chọn)
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="min-w-0 space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#026f17]">
              {a}. Mã người bệnh
            </label>
            <input
              className="input h-11 w-full rounded-xl border-2 border-[#026f17]/15 bg-[#026f17]/5 px-3 text-sm font-bold text-slate-800 outline-none transition-all focus:border-[#026f17] focus:bg-white sm:h-12 sm:rounded-2xl sm:px-4"
              placeholder="Mã hồ sơ / mã nội bộ…"
              autoComplete="off"
              value={session.ma_nguoi_benh || ""}
              onChange={(e) => setSession({ ...session, ma_nguoi_benh: e.target.value })}
            />
          </div>
          <div className="min-w-0 space-y-1.5 sm:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#026f17]">
              {b}. Tên người bệnh
            </label>
            <input
              className="input h-11 w-full rounded-xl border-2 border-[#026f17]/15 bg-[#026f17]/5 px-3 text-sm font-bold text-slate-800 outline-none transition-all focus:border-[#026f17] focus:bg-white sm:h-12 sm:rounded-2xl sm:px-4"
              placeholder="Họ và tên…"
              autoComplete="off"
              value={session.ten_nguoi_benh || ""}
              onChange={(e) => setSession({ ...session, ten_nguoi_benh: e.target.value })}
            />
          </div>
          <div className="min-w-0 space-y-1.5 sm:col-span-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#026f17]">
              {c}. Số giường
            </label>
            <input
              className="input h-11 w-full max-w-md rounded-xl border-2 border-[#026f17]/15 bg-[#026f17]/5 px-3 text-sm font-bold text-slate-800 outline-none transition-all focus:border-[#026f17] focus:bg-white sm:h-12 sm:rounded-2xl sm:px-4"
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
