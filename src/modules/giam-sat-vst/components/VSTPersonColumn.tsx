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
import FloatingInput from "@/components/shared/FloatingInput";

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
  const doneCount = person.opportunities.filter((o) => o.isCollapsed && o.thoi_gian_ghi_nhan).length;
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
    <div className="flex min-h-0 max-h-[min(82dvh,calc(100dvh-13rem))] flex-col overflow-hidden print:max-h-none print:overflow-visible">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 bv103-card-head px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">
            {pIdx + 1}
          </span>
          <p className="truncate bv103-type-body font-semibold text-slate-900">Nhân viên {pIdx + 1}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
          {doneCount} cơ hội
        </span>
      </div>

      <div className="shrink-0 border-b border-slate-100 p-4 print:border-b-0">
        <div className="space-y-3">
          <div>
            <RegistrySelect
              label="Nghề nghiệp *"
              loaiDanhMuc="NGHE_NGHIEP"
              placeholder="Chọn nghề nghiệp…"
              value={person.nghe_nghiep_id}
              required
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

          <div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2">
              {person.is_manual ? (
                <FloatingInput
                  label={requireKhoa ? "Tên nhân viên (chọn khoa trước)" : "Tên nhân viên"}
                  hint="Nhập họ tên…"
                  value={person.ten_manual}
                  onChange={(e) => updatePerson(pIdx, "ten_manual", e.target.value)}
                  disabled={requireKhoa}
                />
              ) : (
                <RegistrySelect
                  label={requireKhoa ? "Tên nhân viên (chọn khoa trước)" : "Tên nhân viên"}
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
                  className="min-w-0 w-full"
                />
              )}

              <label className="box-border flex h-[var(--bv103-control-h)] cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-3 bv103-type-label font-medium text-slate-600 !text-slate-600 transition-colors hover:bg-slate-50">
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
                <span>Ngoài DM</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain p-4 print:max-h-none print:overflow-visible"
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
