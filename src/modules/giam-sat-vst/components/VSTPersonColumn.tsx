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

    const ns = nhanSus.find((n) => String(n.id) === String(nsId));
    if (ns?.nghe_nghiep_id && !person.nghe_nghiep_id) {
      updatePerson(pIdx, "nghe_nghiep_id", String(ns.nghe_nghiep_id));
    }
  };

  return (
    <div className="flex min-h-0 max-h-[min(82dvh,calc(100dvh-13rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm print:max-h-none print:overflow-visible">
      <div className="shrink-0 border-b border-slate-100 bg-slate-50/60 px-4 py-3 print:border-b-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#026f17]">Người {pIdx + 1}</p>

        <div className="mt-3 space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Nghề nghiệp</label>
            <select
              className="select h-10 w-full rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800"
              value={person.nghe_nghiep_id}
              onChange={(e) => {
                updatePerson(pIdx, "nghe_nghiep_id", e.target.value);
                if (!person.is_manual) {
                  updatePerson(pIdx, "nhan_vien_id", "");
                }
              }}
            >
              <option value="">Chọn nghề nghiệp…</option>
              {ngheNghieps.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.ten_danh_muc}
                </option>
              ))}
              {ngheNghieps.length === 0 && (
                <option value="" disabled>
                  Chưa có danh mục nghề nghiệp
                </option>
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Tên nhân viên</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              {person.is_manual ? (
                <input
                  className="input min-h-10 w-full flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition-colors focus:border-[#026f17]/50 focus:ring-1 focus:ring-[#026f17]/15"
                  placeholder={requireKhoa ? "Chọn khoa trước…" : "Nhập họ tên…"}
                  value={person.ten_manual}
                  onChange={(e) => updatePerson(pIdx, "ten_manual", e.target.value)}
                  disabled={requireKhoa}
                />
              ) : (
                <select
                  className="select min-h-10 w-full flex-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800"
                  value={person.nhan_vien_id}
                  onChange={(e) => onSelectNhanSu(e.target.value)}
                  disabled={requireKhoa}
                >
                  <option value="">{requireKhoa ? "Chọn khoa trước…" : "Chọn nhân viên…"}</option>
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

              <label className="flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-medium text-slate-600 transition-colors hover:border-slate-300 sm:min-w-[9.5rem]">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs checkbox-primary rounded border-slate-300"
                  checked={person.is_manual}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updatePerson(pIdx, "is_manual", checked);
                    if (checked) updatePerson(pIdx, "nhan_vien_id", "");
                    else updatePerson(pIdx, "ten_manual", "");
                  }}
                />
                <span className="uppercase tracking-wide">Ngoài danh sách</span>
              </label>
            </div>
            {requireKhoa && <p className="text-[10px] font-medium text-amber-700">Chọn khoa trước để lọc danh sách nhân viên.</p>}
          </div>
        </div>
      </div>

      <div
        className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-4 print:max-h-none print:overflow-visible"
        aria-label={`Danh sách cơ hội — người ${pIdx + 1}`}
      >
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
