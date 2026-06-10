// src/components/shared/GiamSatHeaderPatientFields.tsx
"use client";

import React, { type Dispatch, type SetStateAction } from "react";
import type { GiamSatSession } from "./giam-sat-header.types";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

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
      <div className={`${C.panelInset} p-4`}>
        <p className={`mb-3 ${C.sectionTitle}`}>Thông tin người bệnh (tùy chọn)</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-3">
          <div className="min-w-0 space-y-1">
            <label className={`block ${C.labelField}`}>
              {a}. Mã người bệnh
            </label>
            <input
              className={C.controlInput}
              placeholder="Mã hồ sơ / mã nội bộ…"
              autoComplete="off"
              value={session.ma_nguoi_benh || ""}
              onChange={(e) => setSession({ ...session, ma_nguoi_benh: e.target.value })}
            />
          </div>
          <div className="min-w-0 space-y-1 sm:col-span-2">
            <label className={`block ${C.labelField}`}>
              {b}. Tên người bệnh
            </label>
            <input
              className={C.controlInput}
              placeholder="Họ và tên…"
              autoComplete="off"
              value={session.ten_nguoi_benh || ""}
              onChange={(e) => setSession({ ...session, ten_nguoi_benh: e.target.value })}
            />
          </div>
          <div className="min-w-0 space-y-1 sm:col-span-3">
            <label className={`block ${C.labelField}`}>
              {c}. Số giường
            </label>
            <input
              className={`${C.controlInput} max-w-md`}
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
