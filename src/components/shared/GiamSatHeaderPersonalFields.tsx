// src/components/shared/GiamSatHeaderPersonalFields.tsx
"use client";

import React, { type Dispatch, type SetStateAction } from "react";
import { formatNhanSuOptionLabel } from "@/lib/master-data/nhan-su-enrich";
import type { MasterOption } from "@/lib/master-data/gateway";
import type { GiamSatSession, NhanSuOption } from "./giam-sat-header.types";
import SearchableSelect from "./SearchableSelect";

interface GiamSatHeaderPersonalFieldsProps {
  session: GiamSatSession;
  setSession: Dispatch<SetStateAction<GiamSatSession>>;
  ngheNghieps: MasterOption[];
  filteredNhanSus: NhanSuOption[];
}

export default function GiamSatHeaderPersonalFields({
  session,
  setSession,
  ngheNghieps,
  filteredNhanSus,
}: GiamSatHeaderPersonalFieldsProps) {
  const requireKhoa = !session.khoa_id;

  const onSelectNhanVien = (nsId: string) => {
    // Tìm thông tin nhân sự để auto-fill nghề nghiệp
    const ns = filteredNhanSus.find(n => String(n.id) === String(nsId));
    
    setSession(prev => ({ 
      ...prev, 
      nhan_vien_id: nsId,
      // Auto-fill nghề nghiệp nếu trong hồ sơ có và hiện tại đang trống
      nghe_nghiep_id: (ns?.nghe_nghiep_id && !prev.nghe_nghiep_id) 
        ? String(ns.nghe_nghiep_id) 
        : prev.nghe_nghiep_id 
    }));
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="rounded-xl border border-[#026f17]/15 bg-gradient-to-b from-[#026f17]/[0.05] to-white p-4 shadow-sm sm:p-5">
        <p className="mb-3 border-b border-[#026f17]/15 pb-2 text-[10px] font-black uppercase tracking-widest text-[#026f17]/85">
          Đối tượng được giám sát (nhân viên)
        </p>
        <div className="space-y-4">
          <div className="min-w-0 space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#026f17]">5. Nghề nghiệp nhân viên</label>
            <SearchableSelect
              value={session.nghe_nghiep_id || ""}
              onChange={(nextNgheId) => setSession({ ...session, nghe_nghiep_id: nextNgheId, nhan_vien_id: "" })}
              options={ngheNghieps.map((nn) => ({
                id: String(nn.id),
                label: String(nn.ten_danh_muc || ""),
                keywords: [String(nn.ma_danh_muc || ""), String(nn.loai_danh_muc || "")],
              }))}
              placeholder="-- Chọn nghề nghiệp --"
              searchPlaceholder="Tìm nghề nghiệp..."
              className="border-slate-200 bg-white text-slate-800 ring-1 ring-[var(--primary)]/15"
            />
          </div>

          <div className="min-w-0 space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#026f17]">
              {session.is_manual_nhan_vien ? "6. Nhập tên nhân viên" : "6. Tên nhân viên"}
            </label>
            {session.is_manual_nhan_vien ? (
              <input
                className="input h-12 w-full rounded-2xl border-2 border-amber-100 bg-amber-50 px-4 font-bold text-amber-900 outline-none transition-all focus:border-[#026f17] focus:bg-white"
                placeholder="Nhập họ tên nhân viên..."
                value={session.ten_manual_nhan_vien || ""}
                onChange={(e) => setSession({ ...session, ten_manual_nhan_vien: e.target.value })}
                disabled={requireKhoa}
              />
            ) : (
              <SearchableSelect
                value={session.nhan_vien_id || ""}
                onChange={onSelectNhanVien}
                options={filteredNhanSus.map((ns) => ({
                  id: String(ns.id),
                  label: formatNhanSuOptionLabel(ns as Record<string, unknown>),
                  keywords: [
                    String(ns.ho_ten || ""),
                    String(ns.ma_nv || ""),
                    String(ns.chuc_vu || ""),
                    String(ns.chuc_danh || ""),
                    String(ns.ten_nghe_nghiep_dm || ""),
                  ],
                }))}
                placeholder={requireKhoa ? "-- Chọn Khoa trước --" : "-- Chọn nhân viên --"}
                searchPlaceholder="Tìm nhân viên..."
                className="border-slate-200 bg-white text-slate-800 ring-1 ring-[var(--primary)]/15"
                disabled={requireKhoa}
              />
            )}
            {requireKhoa && (
              <p className="text-[10px] font-semibold text-amber-600 animate-pulse">Chọn Khoa trước để lọc danh sách nhân viên.</p>
            )}
          </div>

          <div className="min-w-0 space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#026f17]">7. Ngoài danh mục</label>
            <label className="flex min-h-[3rem] w-full cursor-pointer items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 transition-colors hover:bg-emerald-100/80">
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-[#026f17]"
                checked={session.is_manual_nhan_vien || false}
                onChange={(e) =>
                  setSession({
                    ...session,
                    is_manual_nhan_vien: e.target.checked,
                    nhan_vien_id: "",
                    ten_manual_nhan_vien: "",
                  })
                }
              />
              <span className="min-w-0 text-xs font-semibold leading-snug text-emerald-900 sm:text-sm">
                Nhập tay, không chọn từ danh sách nhân sự
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
