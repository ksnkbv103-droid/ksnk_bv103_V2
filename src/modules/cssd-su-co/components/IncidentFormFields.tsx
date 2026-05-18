// src/modules/cssd-su-co/components/IncidentFormFields.tsx
"use client";

import React from "react";
import { QrCode, Camera, FileText } from "lucide-react";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import type { IncidentGroup } from "../domain/cssd-incident-taxonomy";
import { INCIDENT_STATION_OPTIONS } from "../domain/cssd-incident-taxonomy";

interface Props {
  incidentGroup: IncidentGroup;
  formData: Record<string, string>;
  onChange: (field: string, value: string) => void;
  machines: { id: string; ten: string }[];
  detectedStation: Station;
}

/**
 * Trường bổ sung theo nhóm sự cố (hybrid EAV + rollback).
 */
export default function IncidentFormFields({ incidentGroup, formData, onChange, machines, detectedStation }: Props) {
  const isProcess = incidentGroup === "PROCESS";
  const isDungCu = incidentGroup === "INSTRUMENT";
  const isMay = incidentGroup === "EQUIPMENT";
  const isHoaChat = incidentGroup === "CHEMICAL";
  const isOther = incidentGroup === "OTHER";

  return (
    <div className="space-y-6 animate-in slide-in-from-top-2">
      {/* SECTION 1: NGỮ CẢNH VÀ TRUY VẾT */}
      <div className="space-y-4 rounded-[32px] border-2 border-slate-100 bg-white p-6 shadow-sm">
        <h4 className="flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
          <QrCode size={14} /> Thông tin truy vết & Ngữ cảnh
        </h4>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isProcess && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Khâu phát sinh lỗi</label>
                <select
                  value={formData.faultStation || detectedStation}
                  onChange={(e) => onChange("faultStation", e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-700 outline-none focus:border-red-400 focus:bg-white"
                >
                  {INCIDENT_STATION_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nhân sự gây lỗi (nếu rõ)</label>
                <input
                  value={formData.faultOperator || ""}
                  onChange={(e) => onChange("faultOperator", e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none focus:border-red-400 focus:bg-white"
                  placeholder="Tên/Mã nhân viên..."
                />
              </div>
            </>
          )}

          {isMay && (
            <div className="col-span-full space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Định danh Thiết bị cụ thể</label>
              <select
                value={formData.machineId || ""}
                onChange={(e) => onChange("machineId", e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-700 outline-none focus:border-red-400 focus:bg-white"
              >
                <option value="">-- Chọn máy từ danh mục --</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.ten}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isDungCu && (
            <div className="col-span-full space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">QR Dụng cụ lỗi (nếu tách lẻ khỏi bộ)</label>
              <div className="group relative">
                <input
                  value={formData.errorQR || ""}
                  onChange={(e) => onChange("errorQR", e.target.value.toUpperCase())}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 font-black text-red-600 outline-none focus:border-red-400 focus:bg-white"
                  placeholder="QUÉT MÃ DỤNG CỤ..."
                />
                <QrCode className="absolute right-4 top-3 text-slate-300" size={20} />
              </div>
            </div>
          )}

          {isHoaChat && (
            <div className="col-span-full space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mã lô / mã hóa chất liên quan</label>
              <input
                value={formData.errorQR || ""}
                onChange={(e) => onChange("errorQR", e.target.value.toUpperCase())}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none focus:border-red-400 focus:bg-white"
                placeholder="NHẬP MÃ LÔ / HÓA CHẤT..."
              />
            </div>
          )}

          {isOther && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Giai đoạn xử lý lại</label>
                <select
                  value={formData.faultStation || ""}
                  onChange={(e) => onChange("faultStation", e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-700 outline-none focus:border-red-400 focus:bg-white"
                >
                  <option value="">— Tự động Rollback —</option>
                  {INCIDENT_STATION_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mã tham chiếu khác</label>
                <input
                  value={formData.errorQR || ""}
                  onChange={(e) => onChange("errorQR", e.target.value.toUpperCase())}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700 outline-none focus:border-red-400 focus:bg-white"
                  placeholder="MÃ PHỤ..."
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* SECTION 2: CHI TIẾT VÀ MINH CHỨNG */}
      <div className="space-y-4 rounded-[32px] border-2 border-slate-100 bg-white p-6 shadow-sm">
        <h4 className="flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
          <FileText size={14} /> Mô tả & Minh chứng
        </h4>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Diễn giải chi tiết tình huống</label>
            <textarea
              value={formData.desc || ""}
              onChange={(e) => onChange("desc", e.target.value)}
              rows={4}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-medium text-slate-600 outline-none focus:border-red-400 focus:bg-white"
              placeholder="Mô tả cụ thể sự việc để phục vụ hậu kiểm..."
            />
          </div>

          <button
            type="button"
            className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-400 active:scale-[0.98]"
          >
            <Camera size={24} />
            <span className="text-[10px] font-black uppercase tracking-widest">Tải lên / Chụp ảnh minh chứng</span>
          </button>
        </div>
      </div>
    </div>
  );
}
