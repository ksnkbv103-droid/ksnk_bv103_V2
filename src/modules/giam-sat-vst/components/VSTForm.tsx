// src/modules/giam-sat-vst/components/VSTForm.tsx
"use client";

import { gscFormChrome as UI } from "@/modules/giam-sat-chung/lib/gsc-form-chrome";
import React, { useEffect, useRef } from "react";
import GiamSatHeader from "@/components/shared/GiamSatHeader";
import VSTPersonColumn from "./VSTPersonColumn";
import VSTPrintView from "./VSTPrintView";
import { useVSTForm } from "../hooks/useVSTForm";
import { MOMENTS, ACTIONS, type MomentType, type ActionType } from "../lib/vst-constants";
import { createDefaultVSTFormPersons } from "../lib/vst-form-model";
import { isReplayCameraSupervisionCachThuc } from "@/lib/supervision-session-time";
import { resolveCanonicalHinhThucLabel } from "@/lib/supervision-hinh-thuc-legacy";
import type { VSTFormPerson } from "../hooks/useVSTFormHandlers";

type VstEditDetail = {
  session: Record<string, unknown>;
  observations: Array<Record<string, unknown>>;
};

type VstObservationInput = {
  id?: string;
  nhan_vien_id?: string | null;
  ten_nhan_vien_ngoai?: string | null;
  nghe_nghiep?: string | null;
  hanh_dong?: string | null;
  thoi_diem?: string | null;
  thoi_gian_ghi_nhan?: string | null;
  dung_ky_thuat?: boolean | null;
  du_thoi_gian?: boolean | null;
  co_deo_gang?: boolean | null;
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
    hinhThucGiamSats, cachThucGiamSats,
    loading, initialLoading, timeLeft,
    currentHoSoId,
    masterDataFetchFailed,
    updatePerson, toggleMoment, updateAction, updateAssessment, openOpportunity, submitOpportunity, handleFinalSave
  } = useVSTForm(onSuccess, editingSessionId ?? null);

  const [activePersonTab, setActivePersonTab] = React.useState<number>(0);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Phải gọi trước mọi return có điều kiện (Rules of Hooks).
  useEffect(() => {
    if (initialLoading) return;
    
    // Đảm bảo mở form là cuộn ngay đến trường chọn khoa để nhập ngay
    const timer = setTimeout(() => {
      const khoaSelect = document.getElementById("vst-khoa-select");
      if (khoaSelect) {
        khoaSelect.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);

    if (editDetail) {
      const sess = (editDetail.session as Record<string, any>) || {};
      const cach = String(sess.cach_thuc_giam_sat ?? sess.cach_thuc ?? "");
      const isReplayCamera = isReplayCameraSupervisionCachThuc(cach);

      const hinhLabel = resolveCanonicalHinhThucLabel(
        String(sess.ten_hinh_thuc_danh_muc ?? sess.hinh_thuc_giam_sat ?? ""),
      ) || "Giám sát chuyên trách";
      const hinhDm = hinhThucGiamSats.find((h) => String(h.ten_danh_muc ?? "").trim() === hinhLabel);
      const cachDm = cachThucGiamSats.find((c) => String(c.ten_danh_muc ?? "").trim() === cach);

      setSession((prev) => ({
        ...prev,
        khoa_id: String(sess.khoa_id ?? ""),
        khu_vuc_id: String(sess.khu_vuc_id ?? ""),
        vi_tri: String(sess.vi_tri_cu_the ?? sess.vi_tri ?? prev.vi_tri ?? ""),
        hinh_thuc_giam_sat: hinhLabel,
        hinh_thuc_id: String(sess.hinh_thuc_id ?? hinhDm?.id ?? prev.hinh_thuc_id ?? ""),
        cach_thuc_giam_sat: cach || prev.cach_thuc_giam_sat,
        cach_thuc_id: String(sess.cach_thuc_id ?? cachDm?.id ?? prev.cach_thuc_id ?? ""),
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
        return tokens.map((t) => MOMENTS.find((m) => m === t)).filter(Boolean) as MomentType[];
      };

      const ngheFindId = (tenNn: unknown): string => {
        const label = String(tenNn ?? "").trim();
        if (!label) return "";
        const opt = ngheNghieps.find((nn) => String(nn.ten_danh_muc ?? "").trim() === label);
        return String(opt?.id ?? "");
      };
      const boolOrNull = (value: unknown): boolean | null => (typeof value === "boolean" ? value : null);
      const parseRecordedAt = (value: unknown): string | undefined => {
        const v = String(value ?? "").trim();
        return v ? v : undefined;
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
        const row = o as VstObservationInput;
        const byNv = String(row.nhan_vien_id ?? "").trim();
        const byName = String(row.ten_nhan_vien_ngoai ?? "").trim();
        const personKey = byNv || byName || "__MISSING_PERSON__";

        const nghe_nghiep_id = ngheFindId(row.nghe_nghiep);
        if (!byPerson.has(personKey)) {
          byPerson.set(personKey, {
            nhan_vien_id: byNv,
            ten_manual: byName,
            is_manual: Boolean(byName),
            nghe_nghiep_id,
            opps: [],
          });
        }
        byPerson.get(personKey)!.opps.push(o);
      }

      const basePersons: VSTFormPerson[] = createDefaultVSTFormPersons();
      const groupEntries = Array.from(byPerson.entries()).slice(0, 3);

      for (let idx = 0; idx < groupEntries.length; idx++) {
        const [, group] = groupEntries[idx];
        const nextOpps = group.opps.map((o, oIdx) => {
          const row = o as VstObservationInput;
          const action = parseAction(row.hanh_dong);
          const missed = isMissedAction(action);
          let thoi_diems = splitMoments(row.thoi_diem);
          if (missed) thoi_diems = thoi_diems.slice(-1);
          else thoi_diems = thoi_diems.slice(0, 2);

          const thoi_gian_ghi_nhan = isReplayCamera ? undefined : parseRecordedAt(row.thoi_gian_ghi_nhan);

          return {
            id: String(row.id ?? `${idx}-${oIdx}-${group.nhan_vien_id || "manual"}`),
            thoi_diems,
            hanh_dong: action,
            dung_ky_thuat: missed ? null : boolOrNull(row.dung_ky_thuat),
            du_thoi_gian: missed ? null : boolOrNull(row.du_thoi_gian),
            co_deo_gang: missed ? boolOrNull(row.co_deo_gang) : null,
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
    }

    return () => clearTimeout(timer);
  }, [editDetail, initialLoading, ngheNghieps, hinhThucGiamSats, cachThucGiamSats, setPersons, setSession]);

  const didInitHeaderScrollRef = useRef(false);

  // Bước 1: Khi chọn xong thông tin khoa/khu vực/cách thức -> Tự cuộn tới Nhân viên 1.
  useEffect(() => {
    if (initialLoading || !session.khoa_id || !session.khu_vuc_id || !session.cach_thuc_giam_sat) return;
    
    // Nếu là lúc vừa mở form (initial render sau loading), không tự cuộn để người dùng kiểm tra thông tin header.
    if (!didInitHeaderScrollRef.current) {
      didInitHeaderScrollRef.current = true;
      return;
    }

    // Chỉ cuộn nếu người dùng chưa bắt đầu nhập ở các cột nhân viên (giữ workflow tự nhiên).
    const hasData = persons.some(p => p.nhan_vien_id || p.ten_manual || p.opportunities.some(o => o.hanh_dong));
    if (hasData) return;

    const timer = setTimeout(() => {
      const firstCol = document.querySelector('[aria-label="Danh sách cơ hội — nhân viên 1"]')?.parentElement;
      if (firstCol) {
        firstCol.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [session.khoa_id, session.khu_vuc_id, session.cach_thuc_giam_sat, initialLoading, persons]);

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        <p className={`animate-pulse ${UI.emptyBody}`}>Đang tải dữ liệu danh mục & nhân sự...</p>
      </div>
    );
  }

  return (
    <div className={`relative ${UI.sectionGapLg} pb-32`}>
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
            hinhThucGiamSats={hinhThucGiamSats}
            cachThucGiamSats={cachThucGiamSats}
            moduleContext="vst"
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

        {/* Mobile Tab Switcher */}
        <div className="mb-4 flex rounded-[var(--radius-control)] border border-slate-200 bg-slate-100/90 p-1 md:hidden">
          {[0, 1, 2].map((idx) => {
            const isActive = activePersonTab === idx;
            const p = persons[idx];
            const rawName = p.is_manual
              ? p.ten_manual
              : (nhanSus.find((n) => String(n.id) === String(p.nhan_vien_id))?.ten_nhan_su as string | undefined);
            const nameLabel = rawName || `Nhân viên ${idx + 1}`;
            const shortName = nameLabel.length > 15 ? nameLabel.substring(0, 15) + "..." : nameLabel;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePersonTab(idx)}
                className={`flex-1 rounded-[var(--radius-control)] py-2.5 text-center text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-slate-600 hover:bg-white/50"
                }`}
              >
                {shortName}
              </button>
            );
          })}
        </div>

        <div className="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3 xl:items-stretch [&>_*]:min-w-0">
          {persons.map((p, idx) => {
            const isTabActive = activePersonTab === idx;
            return (
              <div
                key={p.id_col}
                className={isTabActive ? "block" : "hidden md:block"}
              >
                <VSTPersonColumn 
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
              </div>
            );
          })}
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
