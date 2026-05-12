// src/modules/giam-sat-vst/components/VSTPersonColumn.tsx
"use client";

import React from "react";
import type { NhanSuOption } from "@/components/shared/giam-sat-header.types";
import type { MasterOption } from "@/lib/master-data/gateway";
import { formatNhanSuOptionLabel, matchesNhanSuProfessionFilter } from "@/lib/master-data/nhan-su-enrich";
import VSTOpportunityForm from "./VSTOpportunityForm";
import { ActionType, MomentType } from "../data";
import type {
  ExtendedOpportunity,
  VSTFormPerson,
  VSTOppAssessmentField,
  VSTPersonUpdatableField,
} from "../hooks/useVSTFormHandlers";

interface VSTPersonColumnProps {
  person: VSTFormPerson;
  pIdx: number;
  nhanSus: NhanSuOption[];
  ngheNghieps: MasterOption[];
  updatePerson: (idx: number, field: VSTPersonUpdatableField, value: VSTFormPerson[VSTPersonUpdatableField]) => void;
  toggleMoment: (pIdx: number, oIdx: number, moment: MomentType) => void;
  updateAction: (pIdx: number, oIdx: number, action: ActionType) => void;
  updateAssessment: (
    pIdx: number,
    oIdx: number,
    field: VSTOppAssessmentField,
    value: boolean | string | null | undefined,
  ) => void;
  submitOpportunity: (pIdx: number, oIdx: number) => void;
  openOpportunity: (pIdx: number, oIdx: number) => void;
  khoaId: string;
  cachThucGiamSat: string;
}

export default function VSTPersonColumn({
  person,
  pIdx,
  nhanSus,
  ngheNghieps,
  updatePerson,
  toggleMoment,
  updateAction,
  updateAssessment,
  submitOpportunity,
  openOpportunity,
  khoaId,
  cachThucGiamSat,
}: VSTPersonColumnProps) {
  const toText = (value: unknown): string => String(value ?? "").trim();

  const resolveNhanSuKhoaId = (ns: NhanSuOption): string => {
    const direct = toText(ns.khoa_id);
    if (direct) return direct;
    const fallbackKeys = ["khoa_phong_id", "dm_khoa_phong_id", "khoaId"] as const;
    for (const key of fallbackKeys) {
      const value = toText((ns as Record<string, unknown>)[key]);
      if (value) return value;
    }
    const khoaObject = (ns as Record<string, unknown>).khoa as Record<string, unknown> | undefined;
    return toText(khoaObject?.id);
  };

  // Lọc danh sách nhân viên theo Khoa và Nghề nghiệp
  const getFilteredNhanSus = (khoa_id: string, nn_id: string) =>
    nhanSus.filter((ns) => {
      const khoaNeedle = toText(khoa_id);
      const khoaValue = resolveNhanSuKhoaId(ns);
      const matchesKhoa = !khoaNeedle || !khoaValue || khoaValue === khoaNeedle;
      const matchesNn = matchesNhanSuProfessionFilter(ns as Record<string, unknown>, nn_id, ngheNghieps);
      return matchesKhoa && matchesNn;
    });

  const filteredNhanSus = getFilteredNhanSus(khoaId, person.nghe_nghiep_id);
  const requireKhoa = !khoaId;

  const onSelectNhanSu = (nsId: string) => {
    updatePerson(pIdx, "nhan_vien_id", nsId);
    if (!nsId) return;
    
    // Tự động nhận diện nghề nghiệp nếu nhân viên có thông tin hồ sơ
    const ns = nhanSus.find(n => String(n.id) === String(nsId));
    if (ns?.nghe_nghiep_id && !person.nghe_nghiep_id) {
      updatePerson(pIdx, "nghe_nghiep_id", String(ns.nghe_nghiep_id));
    }
  };

  return (
    <div className="premium-card glass-panel flex flex-col min-h-[850px] border-t-8 border-[#026f17] shadow-lg">
      {/* Phần chọn nhân viên */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-black text-[#026f17] uppercase tracking-tighter">Người {pIdx + 1}</span>
        </div>

        <div className="space-y-3">
          {/* Nghề nghiệp */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nghề nghiệp</label>
            <select 
              className="select h-10 w-full rounded-xl bg-white border border-slate-200 text-xs font-bold"
              value={person.nghe_nghiep_id}
              onChange={(e) => {
                updatePerson(pIdx, "nghe_nghiep_id", e.target.value);
                if (!person.is_manual) {
                  updatePerson(pIdx, "nhan_vien_id", "");
                }
              }}
            >
              <option value="">Chọn Nghề nghiệp...</option>
              {ngheNghieps.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.ten_danh_muc}
                </option>
              ))}
              {ngheNghieps.length === 0 && <option value="" disabled>Chưa có danh mục Nghề nghiệp</option>}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tên nhân viên</label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              {person.is_manual ? (
                <input
                  className="input h-10 w-full rounded-xl border-2 border-[#026f17]/20 bg-white px-3 text-xs font-bold animate-in zoom-in-95 shadow-sm focus:border-[#026f17] outline-none"
                  placeholder={requireKhoa ? "Chọn Khoa trước..." : "Nhập tên nhân viên..."}
                  value={person.ten_manual}
                  onChange={(e) => updatePerson(pIdx, "ten_manual", e.target.value)}
                  disabled={requireKhoa}
                />
              ) : (
                <select
                  className="select h-10 w-full rounded-xl bg-white border border-slate-200 text-xs font-bold"
                  value={person.nhan_vien_id}
                  onChange={(e) => onSelectNhanSu(e.target.value)}
                  disabled={requireKhoa}
                >
                  <option value="">
                    {requireKhoa ? "Chọn Khoa trước..." : "Chọn nhân viên..."}
                  </option>
                  {filteredNhanSus.map((ns) => (
                    <option key={String(ns.id)} value={String(ns.id)}>
                      {formatNhanSuOptionLabel(ns as Record<string, unknown>)}
                    </option>
                  ))}
                  {!filteredNhanSus.length ? (
                    <option value="" disabled>
                      Không có nhân viên phù hợp trong khoa
                    </option>
                  ) : null}
                </select>
              )}

              <label className="h-10 min-w-[156px] rounded-xl border border-slate-200 bg-white px-3 inline-flex items-center gap-2 cursor-pointer hover:border-[#026f17]/30 transition-colors">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs checkbox-primary rounded-md"
                  checked={person.is_manual}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updatePerson(pIdx, "is_manual", checked);
                    if (checked) updatePerson(pIdx, "nhan_vien_id", "");
                    else updatePerson(pIdx, "ten_manual", "");
                  }}
                />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Ngoài danh sách</span>
              </label>
            </div>
            {requireKhoa && (
              <p className="text-[10px] font-semibold text-amber-600">Chọn Khoa trước để lọc danh sách nhân viên.</p>
            )}
          </div>
        </div>
      </div>

      {/* Danh sách các cơ hội */}
      <div className="flex-1 p-3 space-y-4 overflow-y-auto max-h-[600px] scrollbar-hide">
        {person.opportunities.map((opp: ExtendedOpportunity, oIdx: number) => (
          <VSTOpportunityForm 
            key={opp.id}
            opp={opp}
            pIdx={pIdx}
            oIdx={oIdx}
            cachThucGiamSat={cachThucGiamSat}
            toggleMoment={toggleMoment}
            updateAction={updateAction}
            updateAssessment={updateAssessment}
            submitOpportunity={submitOpportunity}
            openOpportunity={openOpportunity}
          />
        ))}
      </div>
    </div>
  );
}
