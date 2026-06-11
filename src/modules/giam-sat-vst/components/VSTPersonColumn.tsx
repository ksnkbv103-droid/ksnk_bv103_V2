// src/modules/giam-sat-vst/components/VSTPersonColumn.tsx
"use client";

import React, { useLayoutEffect, useMemo, useRef } from "react";
import type { NhanSuOption } from "@/components/shared/giam-sat-header.types";
import type { MasterOption } from "@/lib/master-data/gateway";
import { formatNhanSuOptionLabel, matchesNhanSuProfessionFilter } from "@/lib/master-data/nhan-su-enrich";
import VSTOpportunityForm from "./VSTOpportunityForm";
import { ActionType, MomentType } from "../lib/vst-constants";
import type {
  ExtendedOpportunity,
  VSTFormPerson,
  VSTOppAssessmentField,
  VSTPersonUpdatableField,
} from "../hooks/useVSTFormHandlers";
import RegistrySelect from "@/components/shared/RegistrySelect";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

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
  const oppRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Tránh auto-scroll ngay lần render đầu: làm người dùng không kịp nhập `khoa/khu vực` ở header.
  const didInitScrollRef = useRef(false);

  const toText = (value: unknown): string => String(value ?? "").trim();

  const resolveNhanSuKhoaId = (ns: NhanSuOption): string => {
    const direct = toText(ns.khoa_id);
    if (direct) return direct;
    const fallbackKeys = ["khoa_phong_id", "mdm_dm_khoa_phong_id", "khoaId"] as const;
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

  const oppExpandLayoutKey = useMemo(
    () => person.opportunities.map((o) => `${o.id}:${o.isCollapsed ? 1 : 0}`).join("|"),
    [person.opportunities],
  );

  useLayoutEffect(() => {
    // Chỉ scroll khi có một cơ hội được mở ra (không phải lúc vừa mount trang).
    if (!didInitScrollRef.current) {
      didInitScrollRef.current = true;
      return;
    }

    const expanded = person.opportunities.find((o) => !o.isCollapsed);
    if (!expanded) return;

    // Nếu là cơ hội mới (không có hành động), cuộn xuống cuối cột để thấy phần Thời điểm của cơ hội tiếp theo.
    if (!expanded.hanh_dong && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: "smooth" });
      return;
    }

    const el = oppRowRefs.current.get(expanded.id);
    if (!el) return;
    
    const prefersReduced =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      
    // Cuộn mượt tới cơ hội đang mở.
    el.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: prefersReduced ? "auto" : "smooth",
    });
  }, [oppExpandLayoutKey]);

  const onSelectNhanSu = (nsId: string) => {
    updatePerson(pIdx, "nhan_vien_id", nsId);
    if (!nsId) return;

    const ns = nhanSus.find((n) => String(n.id) === String(nsId));
    if (ns?.nghe_nghiep_id && !person.nghe_nghiep_id) {
      updatePerson(pIdx, "nghe_nghiep_id", String(ns.nghe_nghiep_id));
    }
  };

  // Bước 2: Khi chọn xong Nghề nghiệp + Tên nhân viên -> Tự cuộn tới Bảng nhập cơ hội (Thời điểm).
  useLayoutEffect(() => {
    if (!person.nghe_nghiep_id || (!person.nhan_vien_id && !person.ten_manual)) return;
    
    // Chỉ cuộn nếu chưa có cơ hội nào được ghi nhận (đang ở giai đoạn bắt đầu định danh nhân viên).
    const isBrandNew = person.opportunities.length === 1 && !person.opportunities[0].hanh_dong;
    if (!isBrandNew) return;

    const firstOppId = person.opportunities[0]?.id;
    const el = oppRowRefs.current.get(firstOppId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [person.nghe_nghiep_id, person.nhan_vien_id, person.ten_manual]);

  return (
    <div className="flex min-h-0 max-h-[min(82dvh,calc(100dvh-13rem))] flex-col overflow-hidden rounded-[var(--radius-shell)] border border-slate-200 bg-white shadow-sm print:max-h-none print:overflow-visible">
      <div className="shrink-0 border-b border-slate-100 bg-slate-50/60 px-4 py-3 print:border-b-0">
        <p className="font-mono text-[11px] font-medium text-[var(--primary)]">Nhân viên {pIdx + 1}</p>

        <div className="mt-3 space-y-3">
          <div className="space-y-1">
            <label className={C.labelField}>Nghề nghiệp</label>
            <RegistrySelect
              loaiDanhMuc="NGHE_NGHIEP"
              placeholder="Chọn nghề nghiệp…"
              value={person.nghe_nghiep_id}
              onChange={(val) => {
                updatePerson(pIdx, "nghe_nghiep_id", val);
                if (!person.is_manual) {
                  updatePerson(pIdx, "nhan_vien_id", "");
                }
              }}
              staticOptions={ngheNghieps.map((opt) => ({
                id: opt.id,
                label: opt.ten_danh_muc,
                ma: opt.ma_danh_muc,
              }))}
              searchable={false}
            />
          </div>

          <div className="space-y-1">
            <label className={C.labelField}>Tên nhân viên</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              {person.is_manual ? (
                <input
                  className={`${C.controlInput} flex-1 text-xs`}
                  placeholder={requireKhoa ? "Chọn khoa trước…" : "Nhập họ tên…"}
                  value={person.ten_manual}
                  onChange={(e) => updatePerson(pIdx, "ten_manual", e.target.value)}
                  disabled={requireKhoa}
                />
              ) : (
                <RegistrySelect
                  loaiDanhMuc="NHAN_SU"
                  placeholder={requireKhoa ? "Chọn khoa trước…" : "Chọn nhân viên…"}
                  searchPlaceholder="Gõ để tìm tên nhân viên..."
                  value={person.nhan_vien_id}
                  onChange={onSelectNhanSu}
                  disabled={requireKhoa}
                  staticOptions={filteredNhanSus.map((ns) => ({
                    id: String(ns.id),
                    label: formatNhanSuOptionLabel(ns as Record<string, unknown>),
                    keywords: [String(ns.ho_ten || ""), String(ns.ma_nhan_vien || "")],
                  }))}
                  searchable={true}
                  className="flex-1 min-w-0"
                />
              )}

              <label className={`flex min-h-[var(--bv103-control-h)] shrink-0 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 sm:min-w-[9.5rem]`}>
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
            {requireKhoa && <p className="text-[11px] font-medium text-amber-700">Chọn khoa trước để lọc danh sách nhân viên.</p>}
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-4 print:max-h-none print:overflow-visible"
        aria-label={`Danh sách cơ hội — nhân viên ${pIdx + 1}`}
      >
        {person.opportunities.map((opp: ExtendedOpportunity, oIdx: number) => (
          <div
            key={opp.id}
            ref={(node) => {
              if (node) oppRowRefs.current.set(opp.id, node);
              else oppRowRefs.current.delete(opp.id);
            }}
            className="scroll-mt-2"
          >
            <VSTOpportunityForm
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
          </div>
        ))}
      </div>
    </div>
  );
}
