// src/modules/giam-sat-vst/components/VSTForm.tsx
"use client";

import React, { useEffect } from "react";
import GiamSatHeader from "@/components/shared/GiamSatHeader";
import VSTPersonColumn from "./VSTPersonColumn";
import VSTPrintView from "./VSTPrintView";
import { useVSTForm } from "../hooks/useVSTForm";
import { MOMENTS, ACTIONS, type MomentType, type ActionType } from "../data";
import { createDefaultVSTFormPersons } from "../lib/vst-form-model";
import { isReplayCameraSupervisionCachThuc } from "@/lib/supervision-session-time";
import type { VSTFormPerson } from "../hooks/useVSTFormHandlers";

type VstEditDetail = {
  session: Record<string, unknown>;
  observations: Array<Record<string, unknown>>;
};

export default function VSTForm({
  onSuccess,
  editDetail,
  editingSessionId,
}: {
  onSuccess: () => void;
  editDetail?: VstEditDetail | null;
  editingSessionId?: string | null;
}) {
  const {
    session, setSession,
    persons,
    setPersons,
    khoas, khuVucs,
    nhanSus, ngheNghieps, historyLocations, historyLocationRows,
    loading, initialLoading, timeLeft,
    currentHoSoId,
    masterDataFetchFailed,
    updatePerson, toggleMoment, updateAction, updateAssessment, openOpportunity, submitOpportunity, handleFinalSave
  } = useVSTForm(onSuccess, editingSessionId ?? null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Phải gọi trước mọi return có điều kiện (Rules of Hooks).
  useEffect(() => {
    if (initialLoading) return;
    if (!editDetail) return;

    const sess = editDetail.session || {};
    const cach = String(sess.cach_thuc_giam_sat ?? sess.cach_thuc ?? "");
    const isReplayCamera = isReplayCameraSupervisionCachThuc(cach);

    setSession((prev) => ({
      ...prev,
      khoa_id: String(sess.khoa_id ?? ""),
      khu_vuc_id: String(sess.khu_vuc_id ?? ""),
      vi_tri: String(sess.vi_tri_cu_the ?? sess.vi_tri ?? prev.vi_tri ?? ""),
      hinh_thuc_giam_sat: String(sess.hinh_thuc_giam_sat ?? prev.hinh_thuc_giam_sat ?? "Giám sát khách quan"),
      cach_thuc_giam_sat: cach || prev.cach_thuc_giam_sat,
      nguoi_giam_sat_id: String(sess.nguoi_giam_sat_id ?? prev.nguoi_giam_sat_id ?? ""),
      ngay_giam_sat: String(sess.ngay_giam_sat ?? prev.ngay_giam_sat ?? new Date().toISOString().split("T")[0]),
      thoi_gian_bat_dau: String(sess.thoi_gian_bat_dau ?? prev.thoi_gian_bat_dau ?? ""),
      thoi_gian_ket_thuc: String(sess.thoi_gian_ket_thuc ?? prev.thoi_gian_ket_thuc ?? ""),
    }));

    const obs = editDetail.observations || [];
    const splitMoments = (raw: unknown): MomentType[] => {
      const tokens = String(raw ?? "")
        .split(/\s*,\s*/g)
        .map((x) => x.trim())
        .filter(Boolean);
      // Chỉ giữ các giá trị khớp label chuẩn trong UI.
      return tokens.map((t) => MOMENTS.find((m) => m === t)).filter(Boolean) as MomentType[];
    };

    const ngheFindId = (tenNn: unknown): string => {
      const label = String(tenNn ?? "").trim();
      if (!label) return "";
      const opt = ngheNghieps.find(
        (nn) => String((nn as any).ten_danh_muc ?? (nn as any).ten_nghe_nghiep ?? "").trim() === label,
      );
      return String(opt?.id ?? "");
    };

    const isMissedAction = (hanhDong: ActionType | null) => String(hanhDong ?? "") === "Bỏ sót";
    const parseAction = (hanhDong: unknown): ActionType | null => {
      const v = String(hanhDong ?? "").trim();
      if (!v) return null;
      return (ACTIONS as readonly string[]).includes(v) ? (v as ActionType) : null;
    };

    const byPerson = new Map<
      string,
      {
        nhan_vien_id: string;
        ten_manual: string;
        is_manual: boolean;
        nghe_nghiep_id: string;
        opps: Array<Record<string, unknown>>;
      }
    >();

    for (const o of obs) {
      const byNv = String((o as any).nhan_vien_id ?? "").trim();
      const byName = String((o as any).ten_nhan_vien_ngoai ?? "").trim();
      const personKey = byNv || byName || "__MISSING_PERSON__";

      const nghe_nghiep_id = ngheFindId((o as any).nghe_nghiep);
      if (!byPerson.has(personKey)) {
        byPerson.set(personKey, {
          nhan_vien_id: byNv,
          ten_manual: byName,
          is_manual: Boolean(byName),
          nghe_nghiep_id,
          opps: [],
        });
      }
      byPerson.get(personKey)!.opps.push(o as Record<string, unknown>);
    }

    const basePersons: VSTFormPerson[] = createDefaultVSTFormPersons();
    const groupEntries = Array.from(byPerson.entries()).slice(0, 3);

    // Hydrate các cột persons (tối đa 3).
    for (let idx = 0; idx < groupEntries.length; idx++) {
      const [, group] = groupEntries[idx];
      const nextOpps = group.opps.map((o, oIdx) => {
        const action = parseAction((o as any).hanh_dong);
        const missed = isMissedAction(action);
        let thoi_diems = splitMoments((o as any).thoi_diem);
        if (missed) thoi_diems = thoi_diems.slice(-1); // "Bỏ sót" chỉ cho 1 thời điểm
        else thoi_diems = thoi_diems.slice(0, 2);

        const thoi_gian_ghi_nhan = isReplayCamera ? undefined : (o as any).thoi_gian_ghi_nhan ? String((o as any).thoi_gian_ghi_nhan) : undefined;

        return {
          id: String((o as any).id ?? `${idx}-${oIdx}-${group.nhan_vien_id || "manual"}`),
          thoi_diems,
          hanh_dong: action,
          dung_ky_thuat: missed ? null : ((o as any).dung_ky_thuat as boolean | null | undefined) ?? null,
          du_thoi_gian: missed ? null : ((o as any).du_thoi_gian as boolean | null | undefined) ?? null,
          co_deo_gang: missed ? (((o as any).co_deo_gang as boolean | null | undefined) ?? null) : null,
          thoi_gian_ghi_nhan,
          isCollapsed: true,
        };
      });

      basePersons[idx] = {
        ...basePersons[idx],
        nhan_vien_id: group.nhan_vien_id,
        is_manual: group.is_manual,
        ten_manual: group.ten_manual,
        nghe_nghiep_id: group.nghe_nghiep_id,
        opportunities: nextOpps.length ? nextOpps : basePersons[idx].opportunities,
      };
    }

    setPersons(basePersons);
  }, [editDetail, initialLoading, ngheNghieps, setPersons, setSession]);

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#026f17] border-t-transparent" />
        <p className="animate-pulse text-sm font-bold text-slate-500">Đang tải dữ liệu danh mục & nhân sự...</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 pb-32">
      <div className="print:hidden space-y-6">
        <div className="relative">
          <GiamSatHeader
            session={session}
            setSession={setSession}
            khoas={khoas}
            khuVucs={khuVucs}
            ngheNghieps={ngheNghieps}
            nhanSus={nhanSus}
            historyLocations={historyLocations}
            historyLocationRows={historyLocationRows}
            headerDataLoading={initialLoading}
            showGiamSatCaNhan={false}
            lockedSupervisorHoSoId={currentHoSoId}
            suppressStaffIdentityBanner={masterDataFetchFailed}
          />
          
          {timeLeft !== null && (
            <div className={`absolute right-4 top-4 flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold shadow-sm ${
              timeLeft < 300 ? "border-red-200 text-red-600" : "border-emerald-200 text-emerald-700"
            } bg-white`}>
              <span>Thời gian phiên:</span>
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {persons.map((p, idx) => (
            <VSTPersonColumn 
              key={p.id_col}
              pIdx={idx}
              person={p}
              nhanSus={nhanSus}
              ngheNghieps={ngheNghieps}
              updatePerson={updatePerson}
              toggleMoment={toggleMoment}
              updateAction={updateAction}
              updateAssessment={updateAssessment}
              submitOpportunity={submitOpportunity}
              openOpportunity={openOpportunity}
              khoaId={session.khoa_id}
              cachThucGiamSat={session.cach_thuc_giam_sat ?? ""}
            />
          ))}
        </div>

        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
          <button
            onClick={() => window.print()}
            title="In phiếu A4"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            In / PDF
          </button>

          <button
            disabled={loading}
            onClick={handleFinalSave}
            className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--primary)] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Lưu phiên giám sát</span>
            )}
          </button>
        </div>
      </div>

      <VSTPrintView
        session={session}
        persons={persons}
        ngheNghieps={ngheNghieps}
        khoas={khoas}
        khuVucs={khuVucs}
        nhanSus={nhanSus}
      />
    </div>
  );
}
